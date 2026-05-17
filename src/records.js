/** @typedef {"math" | "sums" | "english1" | "english2" | "fractions"} GameMode */

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
 * @typedef {{ bestScorePercent: number | null; testsPassed: number; testsTaken: number }} TestModeStats
 * @typedef {{
 *   math: ModeStats;
 *   sums: ModeStats;
 *   english1: ModeStats;
 *   english2: ModeStats;
 *   fractions: ModeStats;
 *   tests: {
 *     math: TestModeStats;
 *     sums: TestModeStats;
 *     english1: TestModeStats;
 *     english2: TestModeStats;
 *     fractions: TestModeStats;
 *   };
 * }} AllStats
 */

function defaultMode() {
  return { bestTimeMs: null, gamesWon: 0, gamesPlayed: 0 };
}

function defaultTestMode() {
  return { bestScorePercent: null, testsPassed: 0, testsTaken: 0 };
}

/** @returns {AllStats["tests"]} */
function emptyTests() {
  return {
    math: defaultTestMode(),
    sums: defaultTestMode(),
    english1: defaultTestMode(),
    english2: defaultTestMode(),
    fractions: defaultTestMode(),
  };
}

/** @returns {AllStats} */
function emptyStats() {
  return {
    math: defaultMode(),
    sums: defaultMode(),
    english1: defaultMode(),
    english2: defaultMode(),
    fractions: defaultMode(),
    tests: emptyTests(),
  };
}

/** @param {unknown} raw */
function modeFrom(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const bestTimeMs = o.bestTimeMs;
  return {
    bestTimeMs:
      typeof bestTimeMs === "number" && Number.isFinite(bestTimeMs) && bestTimeMs > 0
        ? bestTimeMs
        : null,
    gamesWon: typeof o.gamesWon === "number" && Number.isFinite(o.gamesWon) ? o.gamesWon : 0,
    gamesPlayed:
      typeof o.gamesPlayed === "number" && Number.isFinite(o.gamesPlayed) ? o.gamesPlayed : 0,
  };
}

/** @param {unknown} raw */
function testModeFrom(raw) {
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
}

/** @param {unknown} raw */
function testsFrom(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const base = emptyTests();
  return {
    math: { ...base.math, ...testModeFrom(o.math) },
    sums: { ...base.sums, ...testModeFrom(o.sums) },
    english1: { ...base.english1, ...testModeFrom(o.english1) },
    english2: { ...base.english2, ...testModeFrom(o.english2) },
    fractions: { ...base.fractions, ...testModeFrom(o.fractions) },
  };
}

/**
 * Migrates legacy `english` stats into `english1`.
 * @param {unknown} parsed
 */
function normalizeStoredStats(parsed) {
  const base = parsed && typeof parsed === "object" ? parsed : {};
  const legacyEnglish = base.english;
  return {
    ...emptyStats(),
    ...base,
    math: { ...defaultMode(), ...base.math },
    sums: { ...defaultMode(), ...base.sums },
    english1: {
      ...defaultMode(),
      ...base.english1,
      ...(legacyEnglish && !base.english1 ? legacyEnglish : {}),
    },
    english2: { ...defaultMode(), ...base.english2 },
    fractions: { ...defaultMode(), ...base.fractions },
    tests: testsFrom(base.tests),
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
      return normalizeStoredStats(JSON.parse(raw));
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
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("[records] Failed to save stats:", e);
  }
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
 * @param {GameMode} mode
 * @param {number} correct
 * @param {number} total
 */
export function recordTestResult(mode, correct, total) {
  const slug = getCurrentUserSlug();
  if (!slug || total <= 0) return;
  const data = loadRecords();
  const t = data.tests[mode];
  t.testsTaken += 1;
  const pct = Math.round((correct / total) * 100);
  if (correct === total) t.testsPassed += 1;
  if (t.bestScorePercent === null || pct > t.bestScorePercent) {
    t.bestScorePercent = pct;
  }
  saveRecords(data);
  touchUserPlayed(slug);
  scheduleCloudSync(slug);
}

/**
 * @param {number | null} pct
 * @returns {string}
 */
export function formatScorePercent(pct) {
  if (pct === null || typeof pct !== "number" || !Number.isFinite(pct)) return "—";
  return `${pct}%`;
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
