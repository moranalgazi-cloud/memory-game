/**
 * Authentication layer (Phase 2).
 *
 * Strategy:
 *  - When cloud sync is configured, every visitor gets a *real* Supabase auth
 *    session. Kids never see a login screen: we sign them in anonymously on
 *    boot, which yields a stable `auth.uid()` used to scope their data.
 *  - Signing in with Google is optional and *upgrades* the anonymous account
 *    (via linkIdentity) so progress follows the user across devices.
 *  - When cloud sync is not configured (no Supabase env), auth is a no-op and
 *    the app runs fully local, exactly as before.
 */

import { getSupabaseClient } from "./cloud-sync.js";
import { getCurrentUser, getCurrentUserSlug } from "./user-store.js";

/** @typedef {import("@supabase/supabase-js").User} SupabaseUser */

/** @type {SupabaseUser | null} */
let currentUser = null;
let initialized = false;
/** @type {Promise<void> | null} */
let initPromise = null;

/** @type {Set<(user: SupabaseUser | null) => void>} */
const listeners = new Set();

/** @returns {SupabaseUser | null} */
export function getAuthUser() {
  return currentUser;
}

/** @returns {string | null} The current auth user id (anonymous or permanent). */
export function getAuthUserId() {
  return currentUser?.id ?? null;
}

/** @returns {boolean} */
export function isAnonymousUser() {
  return Boolean(currentUser?.is_anonymous);
}

/** @returns {boolean} Signed in with a real provider (e.g. Google). */
export function isSignedIn() {
  return Boolean(currentUser) && !currentUser?.is_anonymous;
}

const DEV_TESTER_EMAIL = "moranalgazi@gmail.com";

/** True only for the signed-in Google account used for release testing. */
export function isDevTesterSession() {
  const email = getAuthEmail();
  return email?.trim().toLowerCase() === DEV_TESTER_EMAIL;
}

/** @returns {string | null} */
export function getAuthEmail() {
  if (!currentUser) return null;
  return (
    currentUser.email ||
    (currentUser.user_metadata && typeof currentUser.user_metadata.email === "string"
      ? currentUser.user_metadata.email
      : null) ||
    null
  );
}

/** @returns {string | null} A friendly display name from the Google profile. */
export function getAuthDisplayName() {
  if (!currentUser) return null;
  const meta = currentUser.user_metadata || {};
  const candidates = [meta.full_name, meta.name, meta.user_name];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  const email = getAuthEmail();
  if (email && email.includes("@")) return email.split("@")[0];
  return email || null;
}

/** @returns {string | null} The Google profile photo URL, when available. */
export function getAuthAvatarUrl() {
  if (!currentUser) return null;
  const meta = currentUser.user_metadata || {};
  const candidates = [meta.avatar_url, meta.picture];
  for (const c of candidates) {
    if (typeof c === "string" && /^https?:\/\//.test(c.trim())) return c.trim();
  }
  return null;
}

/**
 * Subscribe to auth-state changes. Returns an unsubscribe function.
 * @param {(user: SupabaseUser | null) => void} fn
 */
export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) {
    try {
      fn(currentUser);
    } catch (e) {
      console.warn("[auth] listener error:", e);
    }
  }
}

const OAUTH_PENDING_KEY = "memory-oauth-pending-v1";

/**
 * Build the canonical post-login URL. Must exactly match an entry in Supabase →
 * Authentication → URL Configuration → Redirect URLs (e.g. https://www.playmemorygames.win/).
 *
 * @param {string} origin
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildOAuthRedirectUrl(origin, baseUrl = "/") {
  let path = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  if (!path.endsWith("/")) path += "/";
  return new URL(path, origin).href;
}

/** Where Google OAuth should send the user back after sign-in. */
export function oauthRedirectUrl() {
  const base = import.meta.env.BASE_URL || "/";
  return buildOAuthRedirectUrl(window.location.origin, base);
}

/** @returns {boolean} */
function hasOAuthCallbackInUrl() {
  const { search, hash } = window.location;
  return (
    hash.includes("access_token") ||
    hash.includes("error=") ||
    search.includes("code=") ||
    search.includes("error=") ||
    search.includes("error_description=")
  );
}

/**
 * Parse the OAuth callback (PKCE code or implicit hash), restore the session,
 * and strip auth tokens from the address bar so refresh does not replay them.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} c
 */
async function finishOAuthReturn(c) {
  if (!hasOAuthCallbackInUrl()) return { handled: false, ok: false };

  const { data, error } = await c.auth.getSession();
  const cleanUrl = oauthRedirectUrl();
  window.history.replaceState({}, document.title, cleanUrl);

  if (error) {
    console.warn("[auth] OAuth return failed:", error.message);
    return { handled: true, ok: false, error: error.message };
  }

  currentUser = data.session?.user ?? null;
  return { handled: true, ok: Boolean(data.session) };
}

/** True while returning from a Google sign-in redirect (cleared after initAuth). */
export function consumeOAuthPending() {
  try {
    if (!sessionStorage.getItem(OAUTH_PENDING_KEY)) return false;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

function markOAuthPending() {
  try {
    sessionStorage.setItem(OAUTH_PENDING_KEY, "1");
  } catch {
    // sessionStorage may be unavailable in some embedded browsers.
  }
}

/**
 * Establish a session on boot. Safe to call multiple times; concurrent callers
 * share the same in-flight promise.
 * @returns {Promise<void>}
 */
export function initAuth() {
  if (!initPromise) {
    initPromise = (async () => {
      const c = getSupabaseClient();
      if (!c) return; // local-only mode
      if (initialized) return;
      initialized = true;

      c.auth.onAuthStateChange((_event, session) => {
        currentUser = session?.user ?? null;
        notify();
      });

      try {
        const oauthReturn = await finishOAuthReturn(c);
        if (!oauthReturn.handled) {
          const { data } = await c.auth.getSession();
          currentUser = data.session?.user ?? null;
        }
        if (!currentUser) {
          await ensureAnonymousSession(c);
        }
      } catch (e) {
        console.warn("[auth] init failed:", e);
      }
      notify();
    })();
  }
  return initPromise;
}

/**
 * Wait until a Supabase auth session exists (anonymous or Google).
 * Cloud sync must call this before writing — otherwise RLS rejects rows with
 * no owner_id / no JWT.
 * @returns {Promise<string | null>} auth.uid() or null if sign-in failed
 */
export async function ensureAuthReady() {
  const c = getSupabaseClient();
  if (!c) return null;
  await initAuth();
  if (getAuthUserId()) return getAuthUserId();
  // Init finished but session missing (e.g. anonymous sign-in disabled).
  await ensureAnonymousSession(c);
  notify();
  return getAuthUserId();
}

/** @param {import("@supabase/supabase-js").SupabaseClient} c */
async function ensureAnonymousSession(c) {
  try {
    const { data, error } = await c.auth.signInAnonymously();
    if (error) {
      console.warn(
        "[auth] anonymous sign-in failed:",
        error.message,
        "— enable it in Supabase → Authentication → Sign In / Providers → Anonymous sign-ins.",
      );
      return;
    }
    currentUser = data.user ?? null;
  } catch (e) {
    console.warn("[auth] anonymous sign-in error:", e);
  }
}

/**
 * Start the optional Google sign-in. If the user is currently anonymous we
 * link Google to the existing account so their data is preserved. Both paths
 * trigger a full-page redirect, so code after the call does not run.
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function signInWithGoogle() {
  const c = getSupabaseClient();
  if (!c) return { ok: false, error: "no_client" };
  const options = { redirectTo: oauthRedirectUrl() };
  markOAuthPending();
  try {
    if (isAnonymousUser()) {
      const { error } = await c.auth.linkIdentity({ provider: "google", options });
      if (!error) return { ok: true };
      // Manual linking may be disabled, or the Google account already exists.
      console.warn("[auth] linkIdentity failed, falling back to OAuth sign-in:", error.message);
    }
    const { error } = await c.auth.signInWithOAuth({ provider: "google", options });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Sign out of the permanent account, then re-establish an anonymous session so
 * cloud writes keep working on this device.
 * @returns {Promise<void>}
 */
export async function signOutAuth() {
  const c = getSupabaseClient();
  if (!c) return;
  try {
    await c.auth.signOut();
  } catch (e) {
    console.warn("[auth] sign out:", e);
  }
  currentUser = null;
  await ensureAnonymousSession(c);
  notify();
}
