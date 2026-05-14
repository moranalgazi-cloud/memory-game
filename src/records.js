/** @typedef {"math" | "english" | "fractions"} GameMode */

import { getCurrentUserSlug, USER_STATS_PREFIX, touchUserPlayed } from "./user-store.js";

/** @param {string | null} slug */
function scheduleCloudSync(slug) {
  if (!slug) return;
  import("./cloud-sync.js")
    .then((m) => {
      m.scheduleCloudSyncForSlug(slug);
    })
    .catch(() => {});
}

/**
 * @typedef {{ bestTimeMs: number | null; gamesWon: number; gamesPlayed: number }} ModeStats
 * @typedef {{ math: ModeStats; english: ModeStats; fractions: ModeStats }} AllStats
 */

function defaultMode() {
  return { bestTimeMs: null, gamesWon: 0, gamesPlayed: 0 };
}

/** @returns {AllStats} */
function emptyStats() {
  return {
    math: defaultMode(),
    english: defaultMode(),
    fractions: defaultMode(),
  };
}

/** @param {string | null} slug */
function statsStorageKey(slug) {
  if (!slug) return null;
  return `${USER_STATS_PREFIX}${slug}`;
}

/**
 * @param {string} slug
 * @returns {AllStats}
 */
export function loadRecordsForUser(slug) {
  const key = statsStorageKey(slug);
  if (!key) return emptyStats();
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...emptyStats(),
        ...parsed,
        math: { ...defaultMode(), ...parsed.math },
        english: { ...defaultMode(), ...parsed.english },
        fractions: { ...defaultMode(), ...parsed.fractions },
      };
    }
  } catch {
    /* fall through */
  }
  return emptyStats();
}

/** @returns {AllStats} */
export function loadRecords() {
  const slug = getCurrentUserSlug();
  if (!slug) return emptyStats();
  return loadRecordsForUser(slug);
}

/** @param {AllStats} data */
function saveRecords(data) {
  const slug = getCurrentUserSlug();
  const key = statsStorageKey(slug);
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * @param {GameMode} mode
 * @param {number} elapsedMs
 */
export function recordWin(mode, elapsedMs) {
  const slug = getCurrentUserSlug();
  if (!slug) return;
  const data = loadRecords();
  const m = data[mode];
  m.gamesWon += 1;
  m.gamesPlayed += 1;
  if (typeof elapsedMs === "number" && Number.isFinite(elapsedMs) && elapsedMs > 0) {
    if (m.bestTimeMs === null || elapsedMs < m.bestTimeMs) {
      m.bestTimeMs = elapsedMs;
    }
  }
  saveRecords(data);
  touchUserPlayed(slug);
  scheduleCloudSync(slug);
}

/** @param {GameMode} mode */
export function recordAbandoned(mode) {
  const slug = getCurrentUserSlug();
  if (!slug) return;
  const data = loadRecords();
  data[mode].gamesPlayed += 1;
  saveRecords(data);
  touchUserPlayed(slug);
  scheduleCloudSync(slug);
}

/**
 * @param {number | null} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms === null || typeof ms !== "number" || !Number.isFinite(ms) || ms <= 0) {
    return "—";
  }
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r}s`;
  return `${m}:${String(r).padStart(2, "0")}`;
}
