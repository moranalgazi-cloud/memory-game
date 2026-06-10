/** @typedef {"math" | "sums" | "english1" | "english2" | "fractions"} GameMode */
/** @typedef {"easy" | "medium" | "hard"} GameLevel */

import {
  getAlbumPeriodId,
  pickRewardSticker,
  getStickerDef,
  countAlbumPlaced,
  findSlotForSticker,
  isSlotPlaced,
} from "./roadmap-albums.js";
import { DEFAULT_AVATAR_ID } from "./roadmap-avatars.js";

/**
 * @typedef {{ type: "wins"; mode?: GameMode | null; level?: GameLevel | null; count: number }} WinsGoal
 * @typedef {{ type: "testPass"; mode?: GameMode | "english" | null; count: number }} TestPassGoal
 * @typedef {WinsGoal | TestPassGoal} RoadmapGoal
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
export const VISIBLE_LEVELS_AHEAD = 6;
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

  for (const difficulty of CHALLENGE_DIFFICULTIES) {
    for (const mode of CHALLENGE_MODES) {
      templates.push({
        templateId: templateId++,
        goal: { type: "wins", mode, level: difficulty, count: CHALLENGE_WIN_COUNT },
        preset: { mode, level: difficulty },
      });
    }
    templates.push({
      templateId: templateId++,
      goal: {
        type: "testPass",
        mode: difficulty === "easy" ? "english" : null,
        count: 1,
      },
      preset: { mode: "math", level: difficulty },
    });
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
  const mode = goal.mode ? t(MODE_LABEL_KEYS[goal.mode]) : "";
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
  const mode = goal.mode ? t(MODE_LABEL_KEYS[goal.mode]) : t("roadmapChallengeAnyMode");
  const difficulty = goal.level ? t(DIFFICULTY_LABEL_KEYS[goal.level]) : "";
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

  const week = getAlbumPeriodId();
  const reward = pickRewardSticker(state.placedStickers, state.pendingStickers, week);
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
    const week = getAlbumPeriodId();
    const reward = pickRewardSticker(placedStickers, pendingStickers, week);
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
 * @param {{ mode: GameMode; level: GameLevel }} event
 * @returns {RoadmapEventResult}
 */
export function onSoloWin(slug, event) {
  const nope = /** @type {RoadmapEventResult} */ ({ progressed: false, completed: false });
  if (!slug) return nope;

  const state = loadRoadmap(slug);
  const challenge = getLevelChallenge(state.currentLevel);
  if (challenge.goal.type !== "wins") return nope;
  if (!winsGoalMatches(challenge.goal, event.mode, event.level)) return nope;

  return applyProgress(slug, state, challenge);
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
 * @param {string | null | undefined} slug
 * @returns {number}
 */
export function getVisibleLevelCount(slug) {
  const state = loadRoadmap(slug);
  return Math.max(state.currentLevel + VISIBLE_LEVELS_AHEAD, 8);
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
