import { ADMIN_USERNAMES } from "./user-config.js";
import { isCloudSyncEnabled, syncAllLocalUsersToCloud } from "./cloud-sync.js";

let warnedCloudSyncDisabled = false;

/** Push all local players to Supabase after the user list changes (eager — no dynamic import delay for mobile). */
function scheduleSyncAllUsersToCloudIfEnabled() {
  if (isCloudSyncEnabled()) {
    void syncAllLocalUsersToCloud()
      .then((r) => {
        if (!r.ok) console.warn("[cloud-sync] syncAllLocalUsersToCloud:", r.failures.join(" | "));
      })
      .catch((e) => {
        console.warn("[cloud-sync] syncAllLocalUsersToCloud:", e);
      });
    return;
  }
  if (!warnedCloudSyncDisabled) {
    warnedCloudSyncDisabled = true;
    console.warn(
      "[cloud-sync] Sync is off. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env next to package.json, then stop and run `npm run dev` again.",
    );
  }
}

const USERS_KEY = "memory-app-users-v1";
const CURRENT_SLUG_KEY = "memory-app-current-slug-v1";
export const USER_STATS_PREFIX = "memory-game-stats-user-";
const LEGACY_STATS_V2 = "memory-game-stats-v2";
const LEGACY_STATS_V1 = "memory-game-stats-v1";

/** `memory_players.id` is Postgres uuid — must be RFC 4122 (not ad‑hoc strings). */
/** @param {unknown} s */
function isValidRemoteUuid(s) {
  if (typeof s !== "string") return false;
  const t = s.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t);
}

/** @returns {string} */
function allocateRemoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = (n) => n.toString(16).padStart(2, "0");
  let s = "";
  for (let i = 0; i < 16; i++) s += h(bytes[i]);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/**
 * @typedef {{ slug: string; name: string; createdAt: number; lastPlayedAt?: number; remoteId?: string; authOwner?: string }} AppUser
 */

/** @returns {AppUser[]} */
function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((u) => u && typeof u.slug === "string" && typeof u.name === "string") : [];
  } catch {
    return [];
  }
}

/** @param {AppUser[]} users @returns {boolean} */
function writeUsers(users) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch (e) {
    console.warn("[user-store] Failed to save users list:", e);
    return false;
  }
}

function migrateLegacyStatsIfNeeded() {
  if (readUsers().length > 0) return;
  const legacy = localStorage.getItem(LEGACY_STATS_V2) ?? localStorage.getItem(LEGACY_STATS_V1);
  if (!legacy) return;
  const slug = "player";
  const name = "Player";
  const remoteId = allocateRemoteId();
  const users = [{ slug, name, createdAt: Date.now(), remoteId }];
  if (!writeUsers(users)) {
    console.warn("[user-store] migrate: could not save users list");
    return;
  }
  localStorage.setItem(USER_STATS_PREFIX + slug, legacy);
  localStorage.setItem(CURRENT_SLUG_KEY, slug);
  scheduleSyncAllUsersToCloudIfEnabled();
}

/**
 * @param {string} displayName
 * @returns {string}
 */
export function slugify(displayName) {
  let s = displayName.trim().replace(/\s+/g, "-");
  s = s.replace(/[^a-zA-Z0-9\u0590-\u05FF\-]/g, "");
  if (!s) s = "u" + Math.random().toString(36).slice(2, 10);
  return s.slice(0, 48);
}

/** @param {string} base */
function uniqueSlug(base) {
  const users = readUsers();
  let slug = base;
  let n = 0;
  while (users.some((u) => u.slug === slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

migrateLegacyStatsIfNeeded();

export function listUsers() {
  return readUsers().slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/** @param {string} name */
export function userNameTaken(name) {
  const n = name.trim().toLowerCase();
  if (n.length < 2) return false;
  return readUsers().some((u) => u.name.trim().toLowerCase() === n);
}

/** Ensures every stored user has a stable `remoteId` for cloud sync. */
export function ensureUserRemoteIds() {
  const users = readUsers();
  let changed = false;
  for (const u of users) {
    if (!u.remoteId || typeof u.remoteId !== "string" || !isValidRemoteUuid(u.remoteId)) {
      u.remoteId = allocateRemoteId();
      changed = true;
    }
  }
  if (changed) {
    if (writeUsers(users)) {
      scheduleSyncAllUsersToCloudIfEnabled();
    } else {
      console.warn("[user-store] ensureUserRemoteIds: could not save");
    }
  }
}

/**
 * @param {string} displayName
 * @returns {{ ok: true, user: AppUser } | { ok: false, reason: "length" | "duplicate" | "storage" }}
 */
export function addUser(displayName) {
  const name = displayName.trim();
  if (name.length < 2 || name.length > 32) return { ok: false, reason: "length" };
  if (readUsers().some((u) => u.name.trim().toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: "duplicate" };
  }
  const base = slugify(name);
  const slug = uniqueSlug(base);
  const user = {
    slug,
    name,
    createdAt: Date.now(),
    remoteId: allocateRemoteId(),
  };
  const users = readUsers();
  users.push(user);
  if (!writeUsers(users)) {
    users.pop();
    return { ok: false, reason: "storage" };
  }
  return { ok: true, user };
}

/**
 * @param {string} slug
 * @returns {{ ok: false, reason: "last" | "missing" | "storage" } | { ok: true, slug: string, removed: AppUser }}
 */
export function removeUser(slug) {
  ensureUserRemoteIds();
  const users = readUsers();
  if (users.length <= 1) return { ok: false, reason: "last" };
  const idx = users.findIndex((u) => u.slug === slug);
  if (idx === -1) return { ok: false, reason: "missing" };
  const removed = users[idx];
  const wasCurrent = getCurrentUserSlug() === slug;
  users.splice(idx, 1);
  if (!writeUsers(users)) {
    users.splice(idx, 0, removed);
    return { ok: false, reason: "storage" };
  }
  try {
    localStorage.removeItem(USER_STATS_PREFIX + slug);
  } catch {
    /* ignore */
  }
  if (wasCurrent) {
    const sorted = users.slice().sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    const next = sorted[0];
    try {
      if (next) localStorage.setItem(CURRENT_SLUG_KEY, next.slug);
      else localStorage.removeItem(CURRENT_SLUG_KEY);
    } catch (e) {
      console.warn("[user-store] current slug after remove:", e);
    }
  }
  return { ok: true, slug, removed };
}

/** @param {string} slug */
export function setCurrentUserSlug(slug) {
  const users = readUsers();
  if (!users.some((u) => u.slug === slug)) return false;
  try {
    localStorage.setItem(CURRENT_SLUG_KEY, slug);
    return true;
  } catch (e) {
    console.warn("[user-store] setCurrentUserSlug:", e);
    return false;
  }
}

/** @returns {string | null} */
export function getCurrentUserSlug() {
  return localStorage.getItem(CURRENT_SLUG_KEY);
}

/** @returns {AppUser | null} */
export function getCurrentUser() {
  const slug = getCurrentUserSlug();
  if (!slug) return null;
  return readUsers().find((u) => u.slug === slug) ?? null;
}

/** @param {AppUser | null} user */
export function isAdminUser(user) {
  if (!user?.name) return false;
  const n = user.name.trim().toLowerCase();
  for (const a of ADMIN_USERNAMES) {
    if (String(a).trim().toLowerCase() === n) return true;
  }
  return false;
}

/**
 * Merge players fetched from the cloud (owned by the signed-in account) into the
 * local list. Only ADDS players missing locally (matched by remoteId or name) so
 * local progress is never clobbered. Imports each new player's stats too.
 * @param {{ id: string; display_name: string; stats?: unknown; last_played_at?: number | null }[]} rows
 * @returns {{ imported: number }}
 */
export function importCloudPlayers(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { imported: 0 };
  const users = readUsers();
  let imported = 0;
  for (const row of rows) {
    const remoteId = typeof row?.id === "string" ? row.id.trim() : "";
    const name = typeof row?.display_name === "string" ? row.display_name.trim() : "";
    if (!isValidRemoteUuid(remoteId) || name.length < 1) continue;
    const exists = users.some(
      (u) =>
        u.remoteId === remoteId ||
        u.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (exists) continue;
    const slug = uniqueSlug(slugify(name));
    const lastPlayedAt =
      typeof row.last_played_at === "number" && Number.isFinite(row.last_played_at)
        ? row.last_played_at
        : undefined;
    users.push({ slug, name, createdAt: Date.now(), lastPlayedAt, remoteId });
    if (row.stats && typeof row.stats === "object") {
      try {
        localStorage.setItem(USER_STATS_PREFIX + slug, JSON.stringify(row.stats));
      } catch {
        /* stats are best-effort */
      }
    }
    imported += 1;
  }
  if (imported > 0) writeUsers(users);
  return { imported };
}

/**
 * Players linked to a given Google account (auth uid).
 * @param {string} uid
 * @returns {AppUser[]}
 */
export function listAccountPlayers(uid) {
  return readUsers()
    .filter((u) => u.authOwner === uid)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

/**
 * Ensure a single player linked to the signed-in Google account exists and is
 * the current player. Adopts a matching cloud row (to keep stats across
 * devices) when possible, otherwise creates a fresh profile.
 * @param {string} uid
 * @param {string} displayName
 * @param {{ id: string; display_name?: string; stats?: unknown; last_played_at?: number | null }[]} [cloudRows]
 * @returns {AppUser | null}
 */
export function ensureAccountPlayer(uid, displayName, cloudRows = []) {
  if (!uid) return null;
  const name = (displayName || "Player").trim().slice(0, 32) || "Player";
  const users = readUsers();
  let acct = users.find((u) => u.authOwner === uid);

  if (!acct) {
    const rows = Array.isArray(cloudRows) ? cloudRows : [];
    // Only adopt a cloud row that is genuinely this account's own player
    // (matched by the Google display name). Never fall back to an arbitrary
    // row — that would hijack a local/kid player's record instead of creating
    // a fresh one for the account.
    const match =
      rows.find(
        (r) =>
          typeof r.display_name === "string" &&
          r.display_name.trim().toLowerCase() === name.toLowerCase(),
      ) || null;
    const remoteId =
      match && isValidRemoteUuid(match.id) ? match.id : allocateRemoteId();
    const slug = uniqueSlug(slugify(name));
    const lastPlayedAt =
      match && typeof match.last_played_at === "number" && Number.isFinite(match.last_played_at)
        ? match.last_played_at
        : undefined;
    acct = { slug, name, createdAt: Date.now(), lastPlayedAt, remoteId, authOwner: uid };
    users.push(acct);
    if (match && match.stats && typeof match.stats === "object") {
      try {
        localStorage.setItem(USER_STATS_PREFIX + slug, JSON.stringify(match.stats));
      } catch {
        /* stats best-effort */
      }
    }
    writeUsers(users);
  } else if (acct.name !== name) {
    acct.name = name;
    writeUsers(users);
  }

  try {
    localStorage.setItem(CURRENT_SLUG_KEY, acct.slug);
  } catch (e) {
    console.warn("[user-store] ensureAccountPlayer current slug:", e);
  }
  return acct;
}

/** @param {string} slug */
export function touchUserPlayed(slug) {
  const users = readUsers();
  const u = users.find((x) => x.slug === slug);
  if (!u) return;
  const prev = u.lastPlayedAt;
  u.lastPlayedAt = Date.now();
  if (!writeUsers(users)) {
    u.lastPlayedAt = prev;
    console.warn("[user-store] touchUserPlayed: save failed");
  }
}
