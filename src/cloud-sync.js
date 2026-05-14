import { createClient } from "@supabase/supabase-js";
import { listUsers, ensureUserRemoteIds } from "./user-store.js";
import { loadRecordsForUser } from "./records.js";

const DEVICE_KEY = "memory-app-device-id-v1";

/** @returns {string} */
export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `d-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
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
    auth: { persistSession: false, autoRefreshToken: false },
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
  return {
    math: modeFrom(s.math),
    sums: modeFrom(s.sums),
    english: modeFrom(s.english),
    fractions: modeFrom(s.fractions),
  };
}

/**
 * @param {string} slug
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function syncUserBySlug(slug) {
  const c = getSupabaseClient();
  if (!c) return { ok: false, error: "no_client" };
  ensureUserRemoteIds();
  const user = listUsers().find((u) => u.slug === slug);
  if (!user?.remoteId) return { ok: false, error: "no_remote_id" };

  const stats = loadRecordsForUser(slug);
  const lastPlayedAt =
    typeof user.lastPlayedAt === "number" && Number.isFinite(user.lastPlayedAt) ? user.lastPlayedAt : null;

  const row = {
    id: user.remoteId,
    device_id: getDeviceId(),
    display_name: user.name,
    stats,
    last_played_at: lastPlayedAt,
    updated_at: new Date().toISOString(),
  };

  const { error } = await c.from("memory_players").upsert(row, { onConflict: "id" });
  if (error) {
    const hint =
      /jwt|api key|401|permission denied|not authorized/i.test(String(error.message))
        ? " If you use a publishable key (sb_publishable_…) and still see this, open Supabase → Project Settings → API Keys → “Legacy anon” and paste the anon public (eyJ…) value into VITE_SUPABASE_ANON_KEY."
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
  ensureUserRemoteIds();
  const users = listUsers();
  let ok = 0;
  /** @type {string[]} */
  const failures = [];
  for (const u of users) {
    const r = await syncUserBySlug(u.slug);
    if (r.ok) ok += 1;
    else failures.push(`${u.name}: ${r.error ?? "unknown"}`);
  }
  if (failures.length) {
    console.warn("[cloud-sync] Sync had failures:", failures.join(" | "));
  } else if (ok > 0) {
    console.info("[cloud-sync] Synced", ok, "player(s) to Supabase (table memory_players).");
  }
  return { ok: failures.length === 0, failures };
}

/**
 * @returns {Promise<{ id: string; device_id: string; display_name: string; stats: unknown; last_played_at: number | null }[]>}
 */
export async function fetchAllPlayersForAdmin() {
  const c = getSupabaseClient();
  if (!c) return [];
  const { data, error } = await c
    .from("memory_players")
    .select("id, device_id, display_name, stats, last_played_at")
    .order("display_name", { ascending: true });
  if (error) throw new Error(error.message);
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
        ? " Run supabase/memory_players_delete_policy.sql (or re-run memory_players.sql) so anon can DELETE."
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
