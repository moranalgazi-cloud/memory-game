/** @typedef {"math" | "sums" | "english1" | "english2" | "fractions"} GameMode */
/** @typedef {"easy" | "medium" | "hard"} GameLevel */

import { isDevTesterSession } from "./auth.js";
import {
  DEV_ALBUM_IDS,
  getAlbumPeriodId,
  getLatestReleasedAlbumPeriodId,
  pickRewardSticker,
  getStickerDef,
  getWeeklyAlbum,
  countAlbumPlaced,
  findSlotForSticker,
  isSlotPlaced,
  listReleasedAlbumPeriodIds,
} from "./roadmap-albums.js";
import { DEFAULT_AVATAR_ID } from "./roadmap-avatars.js";
import { ROADMAP_MAX_LEVELS } from "./roadmap-map-spots.js";
import { english1LabelKey } from "./english2-source.js";
import { getLocale } from "./i18n.js";

/**
 * @typedef {{ type: "wins"; mode?: GameMode | null; level?: GameLevel | null; count: number }} WinsGoal
 * @typedef {{ type: "fastWin"; mode?: GameMode | null; level?: GameLevel | null; maxSeconds: number; count: number }} FastWinGoal
 * @typedef {{ type: "testPass"; mode?: GameMode | "english" | null; count: number }} TestPassGoal
 * @typedef {WinsGoal | FastWinGoal | TestPassGoal} RoadmapGoal
 */

/**
 * @typedef {{
 *   templateId: number;
 *   goal: RoadmapGoal;
 *   preset?: { mode: GameMode; level?: GameLevel };
 * }} LevelTemplate
 */

/**
 * @typedef {LevelTemplate & { level: number }} RoadmapLevel
 */

/**
 * @typedef {{
 *   albumWeek: string;
 *   slot: number;
 *   stickerId: string;
 * }} PlacedSticker
 */

/**
 * @typedef {{
 *   id: string;
 *   albumWeek: string;
 *   stickerId: string;
 * }} PendingSticker
 */

/**
 * @typedef {{
 *   currentLevel: number;
 *   progress: number;
 *   completedLevels: number[];
 *   placedStickers: PlacedSticker[];
 *   pendingStickers: PendingSticker[];
 *   avatarId: string;
 * }} RoadmapState
 */

/**
 * @typedef {{
 *   progressed: boolean;
 *   completed: boolean;
 *   level?: number;
 *   stickerId?: string;
 *   stickerLabel?: string;
 *   albumWeek?: string;
 *   progress?: number;
 *   target?: number;
 *   nextLevel?: number | null;
 *   pendingId?: string;
 * }} RoadmapEventResult
 */

export const ROADMAP_STORAGE_PREFIX = "memory-roadmap-v2-";
export const VISIBLE_LEVELS_PER_SCREEN = 10;
export const DEV_ALBUM_TRAY_SIZE = 5;

function getOpenAlbumWeeksForRewards() {
  const currentPeriodId = getAlbumPeriodId();
  return [getLatestReleasedAlbumPeriodId(currentPeriodId)];
}
export const CHALLENGE_WIN_COUNT = 3;

/** @type {GameMode[]} */
const CHALLENGE_MODES = ["math", "sums", "english1", "english2", "fractions"];

/** @type {GameLevel[]} */
const CHALLENGE_DIFFICULTIES = ["easy", "medium", "hard"];

/** @type {Record<GameMode, string>} */
const MODE_LABEL_KEYS = {
  math: "modeMath",
  sums: "modeSums",
  english1: "modeEnglish1",
  english2: "modeEnglish2",
  fractions: "modeFractions",
};

/** @param {GameMode} mode */
function modeLabelKey(mode) {
  if (mode === "english1") return english1LabelKey(getLocale(), "mode");
  return MODE_LABEL_KEYS[mode];
}

/** @type {Record<GameLevel, string>} */
const DIFFICULTY_LABEL_KEYS = {
  easy: "difficultyEasy",
  medium: "difficultyMedium",
  hard: "difficultyHard",
};

/** @returns {LevelTemplate[]} */
function buildLevelTemplates() {
  /** @type {LevelTemplate[]} */
  const templates = [];
  let templateId = 1;

  /** @param {RoadmapGoal} goal @param {{ mode: GameMode; level?: GameLevel }} preset */
  const add = (goal, preset) => {
    templates.push({ templateId: templateId++, goal, preset });
  };

  // Early levels: easy modes first, then speed challenges.
  add(
    { type: "wins", mode: "english1", level: "easy", count: CHALLENGE_WIN_COUNT },
    { mode: "english1", level: "easy" },
  );
  add(
    { type: "wins", mode: "math", level: "easy", count: CHALLENGE_WIN_COUNT },
    { mode: "math", level: "easy" },
  );
  add(
    { type: "wins", mode: "sums", level: "easy", count: CHALLENGE_WIN_COUNT },
    { mode: "sums", level: "easy" },
  );
  add(
    { type: "fastWin", mode: "english1", level: "easy", maxSeconds: 45, count: 1 },
    { mode: "english1", level: "easy" },
  );
  add(
    { type: "fastWin", mode: "math", level: "easy", maxSeconds: 30, count: 1 },
    { mode: "math", level: "easy" },
  );
  add(
    { type: "fastWin", mode: "sums", level: "easy", maxSeconds: 40, count: 1 },
    { mode: "sums", level: "easy" },
  );
  add(
    { type: "wins", mode: "english2", level: "easy", count: CHALLENGE_WIN_COUNT },
    { mode: "english2", level: "easy" },
  );
  add(
    { type: "wins", mode: "fractions", level: "easy", count: CHALLENGE_WIN_COUNT },
    { mode: "fractions", level: "easy" },
  );
  add({ type: "testPass", mode: "english", count: 1 }, { mode: "english1", level: "easy" });

  for (const difficulty of ["medium", "hard"]) {
    for (const mode of CHALLENGE_MODES) {
      add(
        { type: "wins", mode, level: difficulty, count: CHALLENGE_WIN_COUNT },
        { mode, level: difficulty },
      );
    }
    const fastSeconds = difficulty === "medium" ? 45 : 35;
    add(
      {
        type: "fastWin",
        mode: "math",
        level: difficulty,
        maxSeconds: fastSeconds,
        count: difficulty === "medium" ? 2 : 1,
      },
      { mode: "math", level: difficulty },
    );
    add(
      { type: "testPass", mode: difficulty === "medium" ? null : null, count: 1 },
      { mode: "math", level: difficulty },
    );
  }

  // Summit stretch — extra challenges for levels 18–30.
  add(
    { type: "fastWin", mode: "english2", level: "hard", maxSeconds: 40, count: 2 },
    { mode: "english2", level: "hard" },
  );
  add(
    { type: "wins", mode: "fractions", level: "hard", count: CHALLENGE_WIN_COUNT },
    { mode: "fractions", level: "hard" },
  );
  add(
    { type: "fastWin", mode: "sums", level: "hard", maxSeconds: 30, count: 2 },
    { mode: "sums", level: "hard" },
  );
  add(
    { type: "wins", mode: "math", level: "hard", count: CHALLENGE_WIN_COUNT },
    { mode: "math", level: "hard" },
  );
  add(
    { type: "fastWin", mode: "english1", level: "hard", maxSeconds: 35, count: 2 },
    { mode: "english1", level: "hard" },
  );
  add(
    { type: "wins", mode: "english2", level: "hard", count: CHALLENGE_WIN_COUNT },
    { mode: "english2", level: "hard" },
  );
  add(
    { type: "fastWin", mode: "fractions", level: "hard", maxSeconds: 45, count: 2 },
    { mode: "fractions", level: "hard" },
  );
  add(
    { type: "testPass", mode: null, count: 1 },
    { mode: "sums", level: "hard" },
  );
  add(
    { type: "fastWin", mode: "math", level: "hard", maxSeconds: 25, count: 3 },
    { mode: "math", level: "hard" },
  );
  add(
    { type: "wins", mode: "sums", level: "hard", count: CHALLENGE_WIN_COUNT },
    { mode: "sums", level: "hard" },
  );
  add(
    { type: "fastWin", mode: "english2", level: "hard", maxSeconds: 30, count: 2 },
    { mode: "english2", level: "hard" },
  );
  add(
    { type: "wins", mode: "english1", level: "hard", count: CHALLENGE_WIN_COUNT },
    { mode: "english1", level: "hard" },
  );
  add(
    { type: "fastWin", mode: "sums", level: "hard", maxSeconds: 28, count: 3 },
    { mode: "sums", level: "hard" },
  );

  // Extended journey — levels 31–70.
  for (let i = 0; i < 40; i++) {
    const mode = CHALLENGE_MODES[i % CHALLENGE_MODES.length];
    const level = CHALLENGE_DIFFICULTIES[i % CHALLENGE_DIFFICULTIES.length];
    const variant = i % 4;

    if (variant === 0) {
      add(
        { type: "wins", mode, level, count: CHALLENGE_WIN_COUNT },
        { mode, level },
      );
    } else if (variant === 1) {
      const maxSeconds = level === "easy" ? 40 : level === "medium" ? 35 : 28;
      add(
        {
          type: "fastWin",
          mode,
          level,
          maxSeconds,
          count: level === "hard" ? 2 : 1,
        },
        { mode, level },
      );
    } else if (variant === 2) {
      add(
        { type: "wins", mode, level, count: CHALLENGE_WIN_COUNT + 1 },
        { mode, level },
      );
    } else {
      add(
        { type: "testPass", mode: mode.startsWith("english") ? "english" : null, count: 1 },
        { mode, level },
      );
    }
  }

  return templates;
}

/** @type {LevelTemplate[]} */
export const LEVEL_TEMPLATES = buildLevelTemplates();

/**
 * @param {RoadmapLevel} challenge
 * @param {(key: string, vars?: Record<string, string>) => string} t
 */
export function formatChallengeTitle(challenge, t) {
  const goal = challenge.goal;
  if (goal.type === "testPass") {
    return t("roadmapChallengeTestTitle", { level: String(challenge.level) });
  }
  if (goal.type === "fastWin") {
    const mode = goal.mode ? t(modeLabelKey(goal.mode)) : t("roadmapChallengeAnyMode");
    return t("roadmapChallengeFastTitle", { level: String(challenge.level), mode });
  }
  const mode = goal.mode ? t(modeLabelKey(goal.mode)) : "";
  return t("roadmapChallengeWinsTitle", { level: String(challenge.level), mode });
}

/**
 * @param {RoadmapLevel} challenge
 * @param {(key: string, vars?: Record<string, string>) => string} t
 */
export function formatChallengeDesc(challenge, t) {
  const goal = challenge.goal;
  if (goal.type === "testPass") {
    const modeLabel =
      goal.mode === "english" ? t("roadmapChallengeEnglishQuiz") : t("roadmapChallengeAnyQuiz");
    return t("roadmapChallengeTestDesc", {
      count: String(goal.count),
      mode: modeLabel,
    });
  }
  const mode = goal.mode ? t(modeLabelKey(goal.mode)) : t("roadmapChallengeAnyMode");
  const difficulty = goal.level ? t(DIFFICULTY_LABEL_KEYS[goal.level]) : "";
  if (goal.type === "fastWin") {
    return t("roadmapChallengeFastDesc", {
      count: String(goal.count),
      seconds: String(goal.maxSeconds),
      mode,
      difficulty,
    });
  }
  return t("roadmapChallengeWinsDesc", {
    count: String(goal.count),
    mode,
    difficulty,
  });
}

/** @param {string | null | undefined} slug */
function storageKey(slug) {
  if (!slug) return null;
  return `${ROADMAP_STORAGE_PREFIX}${slug}`;
}

/** @returns {RoadmapState} */
function emptyRoadmapState() {
  return {
    currentLevel: 1,
    progress: 0,
    completedLevels: [],
    placedStickers: [],
    pendingStickers: [],
    avatarId: DEFAULT_AVATAR_ID,
  };
}

/** @param {unknown} raw */
function normalizePlaced(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      albumWeek: typeof x.albumWeek === "string" ? x.albumWeek : "",
      slot: typeof x.slot === "number" ? Math.floor(x.slot) : -1,
      stickerId: typeof x.stickerId === "string" ? x.stickerId : "",
    }))
    .filter((x) => x.albumWeek && x.slot >= 0 && x.stickerId);
}

/** @param {unknown} raw */
function normalizePending(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x) => x && typeof x === "object")
    .map((x) => ({
      id: typeof x.id === "string" ? x.id : "",
      albumWeek: typeof x.albumWeek === "string" ? x.albumWeek : "",
      stickerId: typeof x.stickerId === "string" ? x.stickerId : "",
    }))
    .filter((x) => x.id && x.albumWeek && x.stickerId);
}

/** @returns {string} */
function newPendingId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** @param {unknown} raw */
function normalizeRoadmapState(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const completedLevels = Array.isArray(base.completedLevels)
    ? base.completedLevels.filter((d) => typeof d === "number" && Number.isFinite(d))
    : Array.isArray(base.completedDays)
      ? base.completedDays.filter((d) => typeof d === "number" && Number.isFinite(d))
      : [];
  let currentLevel =
    typeof base.currentLevel === "number" && Number.isFinite(base.currentLevel)
      ? Math.floor(base.currentLevel)
      : typeof base.currentDay === "number"
        ? Math.floor(base.currentDay)
        : 1;
  if (currentLevel < 1) currentLevel = 1;
  const progress =
    typeof base.progress === "number" && Number.isFinite(base.progress)
      ? Math.max(0, Math.floor(base.progress))
      : 0;

  let placedStickers = normalizePlaced(base.placedStickers ?? base.collectedStickers);
  let pendingStickers = normalizePending(base.pendingStickers);
  const avatarId =
    typeof base.avatarId === "string" && base.avatarId.length > 0
      ? base.avatarId
      : DEFAULT_AVATAR_ID;

  if (!placedStickers.length && !pendingStickers.length && Array.isArray(base.stickers)) {
    const week = getAlbumPeriodId();
    placedStickers = base.stickers
      .filter((s) => typeof s === "string")
      .map((id, i) => ({
        albumWeek: week,
        slot: i,
        stickerId: String(id).replace(/^day\d+_/, ""),
      }));
  }

  return { currentLevel, progress, completedLevels, placedStickers, pendingStickers, avatarId };
}

/**
 * @param {string | null | undefined} slug
 * @returns {RoadmapState}
 */
export function loadRoadmap(slug) {
  const key = storageKey(slug);
  if (!key) return emptyRoadmapState();
  try {
    const raw = localStorage.getItem(key);
    if (raw) return normalizeRoadmapState(JSON.parse(raw));
    const legacy = localStorage.getItem(`memory-roadmap-v1-${slug}`);
    if (legacy) return normalizeRoadmapState(JSON.parse(legacy));
  } catch {
    /* fall through */
  }
  return emptyRoadmapState();
}

/**
 * Gives brand-new players one free pending sticker for the current album period.
 * @param {string | null | undefined} slug
 * @returns {{ stickerId: string; stickerLabel: string; albumWeek: string; pendingId: string } | null}
 */
export function grantStarterStickerIfNeeded(slug) {
  if (!slug) return null;
  const state = loadRoadmap(slug);
  if (state.placedStickers.length > 0 || state.pendingStickers.length > 0) return null;

  const openAlbumWeeks = getOpenAlbumWeeksForRewards();
  const reward = pickRewardSticker(state.placedStickers, state.pendingStickers, openAlbumWeeks);
  if (!reward) return null;

  const pendingId = newPendingId();
  saveRoadmap(slug, {
    ...state,
    pendingStickers: [
      ...state.pendingStickers,
      { id: pendingId, albumWeek: reward.albumWeek, stickerId: reward.stickerId },
    ],
  });

  const def = getStickerDef(reward.stickerId);
  return {
    stickerId: reward.stickerId,
    stickerLabel: def.label,
    albumWeek: reward.albumWeek,
    pendingId,
  };
}

/**
 * Whether the player can still earn a bonus sticker from the current album (e.g. via rewarded ad).
 * @param {string | null | undefined} slug
 */
export function canGrantBonusSticker(slug) {
  if (!slug) return false;
  const state = loadRoadmap(slug);
  const openAlbumWeeks = getOpenAlbumWeeksForRewards();
  return pickRewardSticker(state.placedStickers, state.pendingStickers, openAlbumWeeks) !== null;
}

/**
 * Grant one random unowned sticker from the current album (rewarded-ad bonus).
 * @param {string | null | undefined} slug
 * @returns {{ stickerId: string; stickerLabel: string; albumWeek: string; pendingId: string } | null}
 */
export function grantBonusSticker(slug) {
  if (!slug) return null;
  const state = loadRoadmap(slug);
  const openAlbumWeeks = getOpenAlbumWeeksForRewards();
  const reward = pickRewardSticker(state.placedStickers, state.pendingStickers, openAlbumWeeks);
  if (!reward) return null;

  const pendingId = newPendingId();
  saveRoadmap(slug, {
    ...state,
    pendingStickers: [
      ...state.pendingStickers,
      { id: pendingId, albumWeek: reward.albumWeek, stickerId: reward.stickerId },
    ],
  });

  const def = getStickerDef(reward.stickerId);
  return {
    stickerId: reward.stickerId,
    stickerLabel: def.label,
    albumWeek: reward.albumWeek,
    pendingId,
  };
}

/**
 * Dev preview albums: keep up to five draggable stickers in the tray.
 *
 * @param {string | null | undefined} slug
 * @param {string} albumWeekId
 * @returns {number} How many pending stickers the album tray now has
 */
export function ensureDevAlbumTrayStickers(slug, albumWeekId) {
  if (!slug) return 0;

  const album = getWeeklyAlbum(albumWeekId);
  if (!album.slots.length) return 0;

  const state = loadRoadmap(slug);
  const pendingForWeek = state.pendingStickers.filter((p) => p.albumWeek === albumWeekId);
  const need = DEV_ALBUM_TRAY_SIZE - pendingForWeek.length;
  if (need <= 0) return pendingForWeek.length;

  const placedIds = new Set(
    state.placedStickers
      .filter((p) => p.albumWeek === albumWeekId)
      .map((p) => p.stickerId),
  );
  const reservedIds = new Set(pendingForWeek.map((p) => p.stickerId));

  /** @type {string[]} */
  const candidates = [];
  for (const slot of album.slots) {
    if (placedIds.has(slot.stickerId) || reservedIds.has(slot.stickerId)) continue;
    candidates.push(slot.stickerId);
    reservedIds.add(slot.stickerId);
  }

  if (!candidates.length) return pendingForWeek.length;

  const pendingStickers = [...state.pendingStickers];
  for (const stickerId of candidates.slice(0, need)) {
    pendingStickers.push({
      id: newPendingId(),
      albumWeek: albumWeekId,
      stickerId,
    });
  }

  saveRoadmap(slug, { ...state, pendingStickers });
  return pendingStickers.filter((p) => p.albumWeek === albumWeekId).length;
}

/**
 * Admin testing: add every missing sticker from this album to the pending tray.
 *
 * @param {string | null | undefined} slug
 * @param {string} albumWeekId
 * @returns {number} How many stickers were added
 */
export function grantAllMissingAlbumStickers(slug, albumWeekId) {
  if (!slug) return 0;

  const state = loadRoadmap(slug);
  const album = getWeeklyAlbum(albumWeekId);
  const placedIds = new Set(
    state.placedStickers
      .filter((p) => p.albumWeek === albumWeekId)
      .map((p) => p.stickerId),
  );
  const reservedIds = new Set(
    state.pendingStickers
      .filter((p) => p.albumWeek === albumWeekId)
      .map((p) => p.stickerId),
  );

  const pendingStickers = [...state.pendingStickers];
  let added = 0;
  for (const slot of album.slots) {
    if (placedIds.has(slot.stickerId) || reservedIds.has(slot.stickerId)) continue;
    pendingStickers.push({
      id: newPendingId(),
      albumWeek: albumWeekId,
      stickerId: slot.stickerId,
    });
    reservedIds.add(slot.stickerId);
    added += 1;
  }

  if (added > 0) saveRoadmap(slug, { ...state, pendingStickers });
  return added;
}

/**
 * @param {string | null | undefined} slug
 * @param {RoadmapState} state
 */
export function saveRoadmap(slug, state) {
  const key = storageKey(slug);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn("[roadmap] Failed to save:", e);
  }
  try {
    import("./cloud-sync.js").then(({ scheduleCloudSyncForSlug }) => {
      scheduleCloudSyncForSlug(slug);
    });
  } catch {
    /* ignore */
  }
}

/**
 * Lightweight summary for cloud analytics (not full sticker state).
 * @param {string | null | undefined} slug
 */
export function getRoadmapCloudSummary(slug) {
  const state = loadRoadmap(slug);
  return {
    currentLevel: state.currentLevel,
    completedCount: Array.isArray(state.completedLevels) ? state.completedLevels.length : 0,
    albumWeek: getAlbumPeriodId(),
  };
}

/**
 * @param {number} level
 * @returns {RoadmapLevel}
 */
export function getLevelChallenge(level) {
  const idx = ((Math.max(1, level) - 1) % LEVEL_TEMPLATES.length);
  const template = LEVEL_TEMPLATES[idx];
  return { ...template, level };
}

/**
 * @param {string | null | undefined} slug
 * @returns {RoadmapLevel | null}
 */
export function getCurrentChallenge(slug) {
  const state = loadRoadmap(slug);
  return getLevelChallenge(state.currentLevel);
}

/**
 * @param {RoadmapGoal} goal
 * @returns {number}
 */
export function goalTargetCount(goal) {
  return goal.count;
}

/**
 * @param {RoadmapGoal} goal
 * @param {GameMode} mode
 * @param {GameLevel} [level]
 */
function winsGoalMatches(goal, mode, level) {
  if (goal.type !== "wins") return false;
  if (goal.mode && goal.mode !== mode) return false;
  if (goal.level && goal.level !== level) return false;
  return true;
}

/**
 * @param {RoadmapGoal} goal
 * @param {GameMode} mode
 */
function testPassGoalMatches(goal, mode) {
  if (goal.type !== "testPass") return false;
  if (!goal.mode) return true;
  if (goal.mode === "english") return mode === "english1" || mode === "english2";
  return goal.mode === mode;
}

/**
 * @param {FastWinGoal} goal
 * @param {GameMode} mode
 * @param {GameLevel} level
 * @param {number | null | undefined} elapsedMs
 */
function fastWinGoalMatches(goal, mode, level, elapsedMs) {
  if (goal.type !== "fastWin") return false;
  if (goal.mode && goal.mode !== mode) return false;
  if (goal.level && goal.level !== level) return false;
  if (elapsedMs == null || elapsedMs > goal.maxSeconds * 1000) return false;
  return true;
}

/**
 * @param {string} slug
 * @param {RoadmapState} state
 * @param {RoadmapLevel} challenge
 * @param {boolean} [forceComplete]
 * @returns {RoadmapEventResult}
 */
function applyProgress(slug, state, challenge, forceComplete = false) {
  const target = goalTargetCount(challenge.goal);
  const nextProgress = forceComplete ? target : state.progress + 1;
  const completed = nextProgress >= target;

  const placedStickers = [...state.placedStickers];
  const pendingStickers = [...state.pendingStickers];
  let stickerId;
  let stickerLabel;
  let albumWeek;
  let pendingId;

  if (completed) {
    const openAlbumWeeks = getOpenAlbumWeeksForRewards();
    const reward = pickRewardSticker(placedStickers, pendingStickers, openAlbumWeeks);
    if (reward) {
      albumWeek = reward.albumWeek;
      stickerId = reward.stickerId;
      stickerLabel = getStickerDef(stickerId).label;
      pendingId = newPendingId();
      pendingStickers.push({
        id: pendingId,
        albumWeek: reward.albumWeek,
        stickerId: reward.stickerId,
      });
    }
  }

  const nextState = {
    currentLevel: completed ? challenge.level + 1 : state.currentLevel,
    progress: completed ? 0 : nextProgress,
    completedLevels: completed
      ? [...state.completedLevels.filter((l) => l !== challenge.level), challenge.level]
      : state.completedLevels,
    placedStickers,
    pendingStickers,
    avatarId: state.avatarId,
  };
  saveRoadmap(slug, nextState);

  return {
    progressed: true,
    completed,
    level: challenge.level,
    stickerId: completed ? stickerId : undefined,
    stickerLabel: completed ? stickerLabel : undefined,
    albumWeek: completed ? albumWeek : undefined,
    pendingId: completed ? pendingId : undefined,
    progress: completed ? target : nextProgress,
    target,
    nextLevel: completed ? challenge.level + 1 : undefined,
  };
}

/**
 * @param {string | null | undefined} slug
 * @param {string} pendingId
 * @param {string} albumWeek
 * @param {number} slot
 * @returns {{ ok: boolean; error?: string }}
 */
export function placePendingSticker(slug, pendingId, albumWeek, slot) {
  if (!slug) return { ok: false, error: "no_player" };
  const state = loadRoadmap(slug);
  const pending = state.pendingStickers.find((p) => p.id === pendingId);
  if (!pending) return { ok: false, error: "no_pending" };
  if (pending.albumWeek !== albumWeek) return { ok: false, error: "wrong_album" };

  const slotDef = findSlotForSticker(albumWeek, pending.stickerId);
  if (!slotDef || slotDef.slot !== slot) return { ok: false, error: "wrong_slot" };
  if (isSlotPlaced(state.placedStickers, albumWeek, slot)) {
    return { ok: false, error: "slot_taken" };
  }

  saveRoadmap(slug, {
    ...state,
    pendingStickers: state.pendingStickers.filter((p) => p.id !== pendingId),
    placedStickers: [
      ...state.placedStickers,
      { albumWeek, slot, stickerId: pending.stickerId },
    ],
  });
  return { ok: true };
}

/**
 * @param {string | null | undefined} slug
 * @param {string} avatarId
 */
export function setAvatarId(slug, avatarId) {
  if (!slug) return;
  const state = loadRoadmap(slug);
  saveRoadmap(slug, { ...state, avatarId });
}

/**
 * @param {string | null | undefined} slug
 */
export function getAvatarId(slug) {
  return loadRoadmap(slug).avatarId || DEFAULT_AVATAR_ID;
}

/**
 * @param {string | null | undefined} slug
 * @param {{ mode: GameMode; level: GameLevel; elapsedMs?: number }} event
 * @returns {RoadmapEventResult}
 */
export function onSoloWin(slug, event) {
  const nope = /** @type {RoadmapEventResult} */ ({ progressed: false, completed: false });
  if (!slug) return nope;

  const state = loadRoadmap(slug);
  const challenge = getLevelChallenge(state.currentLevel);
  const goal = challenge.goal;

  if (goal.type === "wins") {
    if (!winsGoalMatches(goal, event.mode, event.level)) return nope;
    return applyProgress(slug, state, challenge);
  }
  if (goal.type === "fastWin") {
    if (!fastWinGoalMatches(goal, event.mode, event.level, event.elapsedMs)) return nope;
    return applyProgress(slug, state, challenge);
  }

  return nope;
}

/**
 * @param {string | null | undefined} slug
 * @param {{ mode: GameMode; perfect: boolean }} event
 * @returns {RoadmapEventResult}
 */
export function onTestPass(slug, event) {
  const nope = /** @type {RoadmapEventResult} */ ({ progressed: false, completed: false });
  if (!slug || !event.perfect) return nope;

  const state = loadRoadmap(slug);
  const challenge = getLevelChallenge(state.currentLevel);
  if (challenge.goal.type !== "testPass") return nope;
  if (!testPassGoalMatches(challenge.goal, event.mode)) return nope;

  return applyProgress(slug, state, challenge);
}

/**
 * TEMP: dev helper — completes the current level exactly as a real win would.
 * Remove before release.
 * @param {string | null | undefined} slug
 * @returns {RoadmapEventResult}
 */
export function devCompleteCurrentLevel(slug) {
  const nope = /** @type {RoadmapEventResult} */ ({ progressed: false, completed: false });
  if (!slug) return nope;
  const state = loadRoadmap(slug);
  const challenge = getLevelChallenge(state.currentLevel);
  return applyProgress(slug, state, challenge, true);
}

/**
 * Sliding window of 10 levels on the map. Levels 1–10, then 11–20, and so on.
 *
 * @param {string | null | undefined} slug
 * @returns {{ start: number; end: number }}
 */
export function getVisibleLevelRange(slug) {
  const state = loadRoadmap(slug);
  const start =
    Math.floor((Math.max(1, state.currentLevel) - 1) / VISIBLE_LEVELS_PER_SCREEN) *
      VISIBLE_LEVELS_PER_SCREEN +
    1;
  const end = Math.min(ROADMAP_MAX_LEVELS, start + VISIBLE_LEVELS_PER_SCREEN - 1);
  return { start, end };
}

/**
 * @param {string | null | undefined} slug
 * @returns {number}
 */
export function getVisibleLevelCount(slug) {
  return getVisibleLevelRange(slug).end;
}

/**
 * @param {string | null | undefined} slug
 * @returns {{
 *   state: RoadmapState;
 *   current: RoadmapLevel;
 *   progress: number;
 *   target: number;
 *   currentWeekId: string;
 *   weekCollected: number;
 * }}
 */
export function getRoadmapSummary(slug) {
  const state = loadRoadmap(slug);
  const current = getLevelChallenge(state.currentLevel);
  const currentWeekId = getAlbumPeriodId();
  return {
    state,
    current,
    progress: state.progress,
    target: goalTargetCount(current.goal),
    currentWeekId,
    weekCollected: countAlbumPlaced(state.placedStickers, currentWeekId),
  };
}

/** @deprecated use getLevelChallenge */
export function getChallengeByDay(day) {
  return getLevelChallenge(day);
}

/** @deprecated */
export const ROADMAP_CHALLENGES = LEVEL_TEMPLATES.map((t, i) => ({
  ...t,
  day: i + 1,
  level: i + 1,
  stickerId: "",
  stickerEmoji: "",
}));
