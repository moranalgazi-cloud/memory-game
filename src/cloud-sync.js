import { createClient } from "@supabase/supabase-js";
import { listUsers, ensureUserRemoteIds } from "./user-store.js";
import { loadRecordsForUser } from "./records.js";
import { ensureAuthReady, getAuthUserId } from "./auth.js";

const DEVICE_KEY = "memory-app-device-id-v1";

/** @type {string | null} */
let ephemeralDeviceId = null;

/** @returns {string} */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `d-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch (e) {
    console.warn("[cloud-sync] device id storage:", e);
    if (!ephemeralDeviceId) {
      ephemeralDeviceId = `d-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }
    return ephemeralDeviceId;
  }
}

/** @type {import("@supabase/supabase-js").SupabaseClient | null} */
let _client = null;

/** Call after changing .env so the next request picks up new URL/key. */
export function resetSupabaseClient() {
  _client = null;
}

/** @returns {import("@supabase/supabase-js").SupabaseClient | null} */
export function getSupabaseClient() {
  if (_client) return _client;
  // Prefer Vite-injected import.meta.env; fall back to values read at config time (vite.config loadEnv + define).
  const url = String(import.meta.env.VITE_SUPABASE_URL || __APP_SUPABASE_URL__ || "").trim();
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || __APP_SUPABASE_KEY__ || "").trim();
  if (!url || !key) {
    return null;
  }
  _client = createClient(url.trim(), key.trim(), {
    auth: {
      // Phase 2: real auth sessions (anonymous by default, optional Google).
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          cache: "no-store",
        }),
    },
  });
  return _client;
}

export function isCloudSyncEnabled() {
  return getSupabaseClient() !== null;
}

/** True when cloud is configured and the client has an auth session (anon or Google). */
export function isCloudAuthReady() {
  return isCloudSyncEnabled() && Boolean(getAuthUserId());
}

/**
 * Whether this local player profile may be synced under the current auth session.
 * @param {{ authOwner?: string }} user
 */
function playerOwnedByCurrentAuth(user) {
  const uid = getAuthUserId();
  if (!uid) return false;
  // Legacy/local players without authOwner belong to whoever is signed in here.
  if (!user.authOwner) return true;
  return user.authOwner === uid;
}

/** @param {unknown} raw */
function modeFrom(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const bestTimeMs = o.bestTimeMs;
  return {
    bestTimeMs: typeof bestTimeMs === "number" && Number.isFinite(bestTimeMs) && bestTimeMs > 0 ? bestTimeMs : null,
    gamesWon: typeof o.gamesWon === "number" && Number.isFinite(o.gamesWon) ? o.gamesWon : 0,
    gamesPlayed: typeof o.gamesPlayed === "number" && Number.isFinite(o.gamesPlayed) ? o.gamesPlayed : 0,
  };
}

/** @param {unknown} stats */
export function statsFromCloudRow(stats) {
  const s = stats && typeof stats === "object" ? stats : {};
  const testsRaw = s.tests && typeof s.tests === "object" ? s.tests : {};
  /** @param {unknown} raw */
  const testFrom = (raw) => {
    const o = raw && typeof raw === "object" ? raw : {};
    const best = o.bestScorePercent;
    return {
      bestScorePercent:
        typeof best === "number" && Number.isFinite(best) && best >= 0 && best <= 100
          ? best
          : null,
      testsPassed:
        typeof o.testsPassed === "number" && Number.isFinite(o.testsPassed) ? o.testsPassed : 0,
      testsTaken:
        typeof o.testsTaken === "number" && Number.isFinite(o.testsTaken) ? o.testsTaken : 0,
    };
  };
  return {
    math: modeFrom(s.math),
    sums: modeFrom(s.sums),
    english1: modeFrom(s.english1 ?? s.english),
    english2: modeFrom(s.english2),
    fractions: modeFrom(s.fractions),
    tests: {
      math: testFrom(testsRaw.math),
      sums: testFrom(testsRaw.sums),
      english1: testFrom(testsRaw.english1),
      english2: testFrom(testsRaw.english2),
      fractions: testFrom(testsRaw.fractions),
    },
  };
}

/**
 * @param {string} slug
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function syncUserBySlug(slug) {
  const c = getSupabaseClient();
  if (!c) return { ok: false, error: "no_client" };
  const ownerId = await ensureAuthReady();
  if (!ownerId) return { ok: false, error: "no_auth" };
  ensureUserRemoteIds();
  const user = listUsers().find((u) => u.slug === slug);
  if (!user?.remoteId) return { ok: false, error: "no_remote_id" };
  if (!playerOwnedByCurrentAuth(user)) return { ok: false, error: "not_owner" };

  const stats = loadRecordsForUser(slug);
  const lastPlayedAt =
    typeof user.lastPlayedAt === "number" && Number.isFinite(user.lastPlayedAt) ? user.lastPlayedAt : null;

  /** @type {Record<string, unknown>} */
  const row = {
    id: user.remoteId,
    owner_id: ownerId,
    device_id: getDeviceId(),
    display_name: user.name,
    stats,
    last_played_at: lastPlayedAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await c.from("memory_players").upsert(row, { onConflict: "id" });

  if (error) {
    const hint =
      /jwt|api key|401|permission denied|not authorized|policy|42501/i.test(String(error.message))
        ? " Run supabase/03_security_rls.sql if you have not yet. If you use a publishable key (sb_publishable_…) and still see this, open Supabase → Project Settings → API Keys → “Legacy anon” and paste the anon public (eyJ…) value into VITE_SUPABASE_ANON_KEY."
        : "";
    console.warn("[cloud-sync] upsert failed:", error.message, "| player:", row.display_name, hint);
    if (/jwt|invalid/i.test(String(error.message))) {
      resetSupabaseClient();
    }
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** One debounce timer per player slug so users do not cancel each other's sync. */
const debounceTimersBySlug = new Map();

/** Cancel a pending post-win / stats debounce so a deleted player is not re-upserted. @param {string} slug */
export function cancelScheduledCloudSyncForSlug(slug) {
  const prev = debounceTimersBySlug.get(slug);
  if (prev !== undefined) {
    window.clearTimeout(prev);
    debounceTimersBySlug.delete(slug);
  }
}

/** @param {string} slug */
export function scheduleCloudSyncForSlug(slug) {
  if (!isCloudSyncEnabled()) return;
  const prev = debounceTimersBySlug.get(slug);
  if (prev) window.clearTimeout(prev);
  const tid = window.setTimeout(() => {
    debounceTimersBySlug.delete(slug);
    void syncUserBySlug(slug).then((r) => {
      if (!r.ok) {
        console.warn("[cloud-sync] delayed sync failed:", slug, r.error);
      }
    });
  }, 800);
  debounceTimersBySlug.set(slug, tid);
}

export async function syncAllLocalUsersToCloud() {
  if (!isCloudSyncEnabled()) return { ok: true, failures: [] };
  const uid = await ensureAuthReady();
  if (!uid) {
    const msg =
      "No auth session — enable Anonymous sign-ins in Supabase (Authentication → Providers).";
    console.warn("[cloud-sync]", msg);
    return { ok: false, failures: [msg] };
  }
  ensureUserRemoteIds();
  const users = listUsers().filter((u) => playerOwnedByCurrentAuth(u));
  let ok = 0;
  /** @type {string[]} */
  const failures = [];
  for (const u of users) {
    const r = await syncUserBySlug(u.slug);
    if (r.ok) ok += 1;
    else if (r.error !== "not_owner") failures.push(`${u.name}: ${r.error ?? "unknown"}`);
  }
  if (failures.length) {
    console.warn("[cloud-sync] Sync had failures:", failures.join(" | "));
  } else if (ok > 0) {
    console.info("[cloud-sync] Synced", ok, "player(s) to Supabase (table memory_players).");
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Fetch the players owned by a given auth user (for cross-device sync on sign-in).
 * @param {string} ownerId
 * @returns {Promise<{ id: string; display_name: string; stats: unknown; last_played_at: number | null }[]>}
 */
export async function fetchPlayersForOwner(ownerId) {
  const c = getSupabaseClient();
  if (!c || !ownerId) return [];
  const { data, error } = await c
    .from("memory_players")
    .select("id, display_name, stats, last_played_at")
    .eq("owner_id", ownerId);
  if (error) {
    // owner_id column may not be migrated yet — treat as "no cloud players".
    if (/owner_id|column .* does not exist|schema cache/i.test(String(error.message))) {
      console.warn("[cloud-sync] fetchPlayersForOwner: owner_id missing — run supabase/02_auth_owner.sql");
      return [];
    }
    throw new Error(error.message);
  }
  return Array.isArray(data) ? data : [];
}

/**
 * Remove one cloud row (used when a player is deleted locally).
 * Tries `id` first, then this device's `display_name` (covers missing `remoteId` or id mismatch).
 * @param {{ remoteId?: string | null; displayName: string }} player
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function deletePlayerFromCloud(player) {
  const remoteId = typeof player.remoteId === "string" ? player.remoteId.trim() : "";
  const displayName = String(player.displayName ?? "").trim();
  const c = getSupabaseClient();
  if (!c) return { ok: false, error: "no_client" };
  const ownerId = await ensureAuthReady();
  if (!ownerId) return { ok: false, error: "no_auth" };
  const deviceId = getDeviceId();

  if (remoteId) {
    const { error } = await c.from("memory_players").delete().eq("id", remoteId);
    if (!error) return { ok: true };
    console.warn("[cloud-sync] delete by id failed:", error.message, "| id:", remoteId);
  }

  if (displayName.length > 0) {
    const { error } = await c.from("memory_players").delete().eq("device_id", deviceId).eq("display_name", displayName);
    if (!error) return { ok: true };
    console.warn(
      "[cloud-sync] delete by device+name failed:",
      error.message,
      "| device:",
      deviceId,
      "| name:",
      displayName,
    );
    const hint =
      /policy|permission denied|42501/i.test(String(error.message))
        ? " Run supabase/03_security_rls.sql so DELETE is allowed for rows you own (owner_id = auth.uid())."
        : "";
    return { ok: false, error: error.message + hint };
  }

  return { ok: false, error: remoteId ? "delete_failed" : "no_remote_id_or_name" };
}

// Mobile browsers often suspend the tab before pending work runs; push local players when hiding/closing.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  let flushTimeout = 0;
  function flushLocalPlayersToCloudSoon() {
    if (!isCloudSyncEnabled()) return;
    window.clearTimeout(flushTimeout);
    flushTimeout = window.setTimeout(() => {
      flushTimeout = 0;
      void syncAllLocalUsersToCloud().catch((e) => {
        console.warn("[cloud-sync] background sync:", e);
      });
    }, 50);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushLocalPlayersToCloudSoon();
  });
  window.addEventListener("pagehide", flushLocalPlayersToCloudSoon, { capture: true });
}

/**
 * Awaited after local player list changes so mobile does not navigate away before Supabase writes finish.
 * @param {{ cancelSlug?: string; removed?: { remoteId?: string; name: string } | null }} [opts]
 * @returns {Promise<{ ok: boolean; failures: string[] }>}
 */
export async function commitPlayerListToCloud(opts = {}) {
  if (!isCloudSyncEnabled()) return { ok: true, failures: [] };
  const cancelSlug = opts.cancelSlug;
  const removed = opts.removed;
  if (cancelSlug) cancelScheduledCloudSyncForSlug(cancelSlug);
  if (removed) {
    const del = await deletePlayerFromCloud({
      remoteId: removed.remoteId ?? null,
      displayName: removed.name,
    });
    if (!del.ok && del.error) {
      console.warn("[cloud-sync] delete in commit:", del.error);
    }
  }
  return syncAllLocalUsersToCloud();
}
