import "./style.css";
import { applyAppBranding } from "./branding.js";
import {
  pickFacts,
  buildDeck,
  shuffle,
  isPairMatch,
  uniqueProductCount,
} from "./game.js";
import {
  ENGLISH_TOPIC_IDS,
  englishTopicMessageKey,
  getEnglishPool,
  pickEnglishTopicId,
  pickEnglishEntries,
  buildEnglishDeck,
} from "./english-game.js";
import { speakMemoryWord, cancelEnglishSpeech } from "./english-speech.js";
import {
  buildFractionPool,
  pickFractionEntries,
  buildFractionDeck,
  createPieSvg,
} from "./fraction-game.js";
import {
  buildSumPool,
  pickSumEntries,
  buildSumDeck,
  uniqueSumResultCount,
} from "./sums-game.js";
import { initLocale, setLocale, getLocale, t, setPageTitleForMode } from "./i18n.js";
import {
  initDisclaimerUi,
  openDisclaimerDialog,
  refreshDisclaimerLabels,
  hasAcceptedDisclaimer,
} from "./disclaimer-ui.js";
import { initAboutUi, refreshAboutLabels } from "./about-ui.js";
import {
  loadRecords,
  loadRecordsForUser,
  recordWin,
  recordAbandoned,
  recordTestResult,
  formatDuration,
  formatScorePercent,
} from "./records.js";
import { buildQuizFromGame, scorePercent } from "./quiz.js";
import {
  listUsers,
  addUser,
  removeUser,
  setCurrentUserSlug,
  getCurrentUser,
  isAdminUser,
  ensureUserRemoteIds,
  ensureAccountPlayer,
} from "./user-store.js";
import {
  isAdminSessionUnlocked,
  tryUnlockAdminSession,
  clearAdminSession,
} from "./admin-auth.js";
import {
  isCloudSyncEnabled,
  fetchPlayersForOwner,
  syncAllLocalUsersToCloud,
  commitPlayerListToCloud,
} from "./cloud-sync.js";
import {
  initAuth,
  onAuthChange,
  isSignedIn,
  getAuthUserId,
  getAuthEmail,
  getAuthDisplayName,
  getAuthAvatarUrl,
  signInWithGoogle,
  signOutAuth,
} from "./auth.js";
import { armCelebrationAudio, celebrateWin } from "./celebrate.js";
import { applySnapshotToState } from "./multiplayer/protocol.js";
import { buildOnlineHostConfig } from "./multiplayer/online-deck.js";
import {
  leaveOnlineSession,
  getActiveOnlineSession,
  getOnlineGameConfig,
  adminFinishOnlineGame,
} from "./multiplayer/online-session.js";
import {
  initOnlinePlay,
  onlineLocalFlip,
  isOnlineGameActive,
  refreshOnlineLabels,
  quitOnlineGame,
  playOnlineAgain,
} from "./online-ui.js";

// Theme constants live up top: refreshChrome() runs during module init and
// reads these via nextTheme(), so they must be initialized before that point
// (avoids a temporal-dead-zone ReferenceError on boot).
const THEME_KEY = "memory-theme-v1";
/** Cycle order for the theme toggle. Dark is the default. */
const THEME_ORDER = /** @type {const} */ (["dark", "light", "fun"]);

const board = document.querySelector("#board");
const movesEl = document.querySelector("#moves");
const matchesEl = document.querySelector("#matches");
const elapsedEl = document.querySelector("#elapsed");
const winMessage = document.querySelector("#winMessage");
const winActions = document.querySelector("#winActions");
const testMeBtn = document.querySelector("#testMeBtn");
const quizDialog = document.querySelector("#quizDialog");
const quizTitle = document.querySelector("#quizTitle");
const quizProgress = document.querySelector("#quizProgress");
const quizPrompt = document.querySelector("#quizPrompt");
const quizChoices = document.querySelector("#quizChoices");
const quizFeedback = document.querySelector("#quizFeedback");
const quizSummary = document.querySelector("#quizSummary");
const closeQuizBtn = document.querySelector("#closeQuiz");
const dismissQuizBtn = document.querySelector("#dismissQuiz");
const adminSpeedFinishBtn = document.querySelector("#adminSpeedFinish");
const gameModeSelect = document.querySelector("#gameMode");
const pairCountSelect = document.querySelector("#pairCount");
const englishLevelSelect = document.querySelector("#englishLevel");
const sumsLevelSelect = document.querySelector("#sumsLevel");
const mathLevelSelect = document.querySelector("#mathLevel");
const fractionLevelSelect = document.querySelector("#fractionLevel");
const pairsField = document.querySelector("#pairsField");
const englishLevelField = document.querySelector("#englishLevelField");
const sumsLevelField = document.querySelector("#sumsLevelField");
const mathLevelField = document.querySelector("#mathLevelField");
const fractionLevelField = document.querySelector("#fractionLevelField");
const labelSumsLevel = document.querySelector("#labelSumsLevel");
const labelMathLevel = document.querySelector("#labelMathLevel");
const labelFractionLevel = document.querySelector("#labelFractionLevel");
const tableMaxSelect = document.querySelector("#tableMax");
const tablesField = document.querySelector("#tablesField");
const localeSelect = document.querySelector("#locale");
const userDialogLocale = document.querySelector("#userDialogLocale");
const labelUserDialogLanguage = document.querySelector("#labelUserDialogLanguage");
const newGameBtn = document.querySelector("#newGame");
const restartDeckBtn = document.querySelector("#restartDeck");
const winNewGameBtn = document.querySelector("#winNewGame");
const winRestartDeckBtn = document.querySelector("#winRestartDeck");
const onlineQuitBtn = document.querySelector("#onlineQuit");
const onlinePlayAgainBtn = document.querySelector("#onlinePlayAgain");
const onlineLeaveAfterWinBtn = document.querySelector("#onlineLeaveAfterWin");
const gameActionsEl = document.querySelector("#gameActions");
const winGameActionsEl = document.querySelector("#winGameActions");
const openRecordsBtn = document.querySelector("#openRecords");
const recordsDialog = document.querySelector("#recordsDialog");
const closeRecordsBtn = document.querySelector("#closeRecords");
const emailRecordsBtn = document.querySelector("#emailRecords");
const gameTitle = document.querySelector("#gameTitle");
const gameTagline = document.querySelector("#gameTagline");
const appPurposeEl = document.querySelector("#appPurpose");
const publicAppTitleEl = document.querySelector("#publicAppTitle");
const publicWhatTitleEl = document.querySelector("#publicWhatTitle");
const publicWhat1El = document.querySelector("#publicWhat1");
const publicWhat2El = document.querySelector("#publicWhat2");
const publicWhat3El = document.querySelector("#publicWhat3");
const publicGoogleTitleEl = document.querySelector("#publicGoogleTitle");
const publicGooglePurposeEl = document.querySelector("#publicGooglePurpose");
const labelGameMode = document.querySelector("#labelGameMode");
const labelPairs = document.querySelector("#labelPairs");
const labelEnglishLevel = document.querySelector("#labelEnglishLevel");
const labelTables = document.querySelector("#labelTables");
const labelLanguage = document.querySelector("#labelLanguage");
const labelMoves = document.querySelector("#labelMoves");
const labelMatches = document.querySelector("#labelMatches");
const labelTime = document.querySelector("#labelTime");
const appRoot = document.querySelector("#appRoot");
const openUserMenuBtn = document.querySelector("#openUserMenu");
const openAdminBtn = document.querySelector("#openAdmin");
const themeToggleBtn = document.querySelector("#themeToggle");
const themeToggleLabel = document.querySelector("#themeToggleLabel");
const accountBadge = document.querySelector("#accountBadge");
const accountBadgeInitial = document.querySelector("#accountBadgeInitial");
const userGoogleSection = document.querySelector("#userGoogleSection");
const userGoogleBtn = document.querySelector("#userGoogleBtn");
const userGoogleStatus = document.querySelector("#userGoogleStatus");
const userGoogleHint = document.querySelector("#userGoogleHint");
const userGoogleOr = document.querySelector("#userGoogleOr");
const userPickSection = document.querySelector("#userPickSection");
const userAddSection = document.querySelector("#userAddSection");
const userStepPickTitle = document.querySelector("#userStepPickTitle");
const userDialog = document.querySelector("#userDialog");
const userListMount = document.querySelector("#userListMount");
const newUserNameInput = document.querySelector("#newUserName");
const userAddError = document.querySelector("#userAddError");
const addUserBtn = document.querySelector("#addUserBtn");
const userDialogContinue = document.querySelector("#userDialogContinue");
const userDialogPrivacyLink = document.querySelector("#userDialogPrivacyLink");
const privacyPolicyLink = document.querySelector("#privacyPolicyLink");
const adminUnlockDialog = document.querySelector("#adminUnlockDialog");
const adminUnlockForm = document.querySelector("#adminUnlockForm");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const adminPasswordToggle = document.querySelector("#adminPasswordToggle");
const adminUnlockSubmit = document.querySelector("#adminUnlockSubmit");
const adminUnlockCancel = document.querySelector("#adminUnlockCancel");
const adminUnlockError = document.querySelector("#adminUnlockError");
const adminDialog = document.querySelector("#adminDialog");
const adminTableHead = document.querySelector("#adminTableHead");
const adminTableBody = document.querySelector("#adminTableBody");
const closeAdminBtn = document.querySelector("#closeAdmin");
const settingsMenuBtn = document.querySelector("#settingsMenuBtn");
const settingsMenu = document.querySelector("#settingsMenu");

/** @typedef {"math" | "sums" | "english1" | "english2" | "fractions"} GameMode */
/** @typedef {"easy" | "medium" | "hard"} EnglishLevel */
/** @typedef {"easy" | "medium" | "hard"} SumsLevel */
/** @typedef {"easy" | "medium" | "hard"} MathLevel */
/** @typedef {"easy" | "medium" | "hard"} FractionLevel */

/** @type {{ mode: GameMode; cards: any[]; flipped: string[]; matched: Set<string>; matchPairByCardId: Map<string, number>; moves: number; lock: boolean; clockStart: number | null; winHandled: boolean; englishSpeech?: "both" | "text" | "none"; englishTopicId?: string; online?: boolean; turn?: 'host' | 'guest'; hostScore?: number; guestScore?: number; winner?: 'host' | 'guest' | null } | null} */
let state = null;

/** @type {string | null} */
let pendingUserSlug = null;

/** @type {Record<GameMode, string | null>} */
const lastSignature = { math: null, sums: null, english1: null, english2: null, fractions: null };

/**
 * Last built deck content — used to reshuffle the same questions on board.
 * @type {{
 *   mode: GameMode;
 *   facts?: import("./game.js").MultiplicationFact[];
 *   entries?: unknown[];
 *   englishTopicId?: string;
 *   englishSpeech?: "both" | "text" | "none";
 * } | null}
 */
let lastDeckSource = null;

/** @param {GameMode} mode */
function isEnglishMode(mode) {
  return mode === "english1" || mode === "english2";
}

let booted = false;

/** @type {string[]} */
let lastOnlineFlippedIds = [];

/** @type {{ mode: GameMode; cards: unknown[] } | null} */
let lastWinForQuiz = null;

/**
 * @type {{
 *   mode: GameMode;
 *   questions: import("./quiz.js").QuizQuestion[];
 *   index: number;
 *   correct: number;
 *   locked: boolean;
 * } | null}
 */
let quizSession = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let winAutoRestartTimer = null;

/** @type {ReturnType<typeof setTimeout> | null} */
let quizAdvanceTimer = null;

function clearQuizAdvance() {
  if (quizAdvanceTimer != null) {
    window.clearTimeout(quizAdvanceTimer);
    quizAdvanceTimer = null;
  }
}

/** @param {HTMLSelectElement | null} select */
function applyGameModeOptionLabels(select) {
  if (!select) return;
  for (const opt of select.options) {
    switch (opt.value) {
      case "english1":
        opt.textContent = t("modeEnglish1");
        break;
      case "english2":
        opt.textContent = t("modeEnglish2");
        break;
      case "sums":
        opt.textContent = t("modeSums");
        break;
      case "math":
        opt.textContent = t("modeMath");
        break;
      case "fractions":
        opt.textContent = t("modeFractions");
        break;
      default:
        break;
    }
  }
}

function isOnlineBoardActive() {
  return Boolean(state?.online);
}

function refreshOnlineChrome() {
  const playing = Boolean(state?.online && isOnlineGameActive());
  const ended = Boolean(state?.online && state.winHandled);
  const lockUserSwitch = isOnlineBoardActive();
  if (openUserMenuBtn instanceof HTMLButtonElement) {
    openUserMenuBtn.disabled = lockUserSwitch;
    openUserMenuBtn.setAttribute(
      "aria-label",
      lockUserSwitch ? t("ariaUserMenuDisabledOnline") : t("ariaUserMenu"),
    );
  }
  if (onlineQuitBtn) {
    onlineQuitBtn.classList.toggle("is-hidden", !playing);
  }
  if (onlinePlayAgainBtn) {
    onlinePlayAgainBtn.classList.toggle("is-hidden", !ended);
  }
  if (onlineLeaveAfterWinBtn) {
    onlineLeaveAfterWinBtn.classList.toggle("is-hidden", !ended);
  }
  if (winGameActionsEl) {
    winGameActionsEl.classList.toggle("is-hidden", ended && Boolean(state?.online));
  }
  if (winRestartDeckBtn) {
    winRestartDeckBtn.classList.toggle(
      "is-hidden",
      Boolean(state?.online && (playing || ended)),
    );
  }
}

function hideWinActions() {
  if (winActions) winActions.hidden = true;
  if (testMeBtn) testMeBtn.hidden = true;
  refreshOnlineChrome();
}

function showWinActions() {
  if (winActions) winActions.hidden = false;
  if (testMeBtn) testMeBtn.hidden = false;
  refreshOnlineChrome();
}

function clearWinAutoRestart() {
  if (winAutoRestartTimer != null) {
    window.clearTimeout(winAutoRestartTimer);
    winAutoRestartTimer = null;
  }
}

function isSettingsMenuOpen() {
  return Boolean(settingsMenu && !settingsMenu.hidden);
}

function setSettingsMenuOpen(open) {
  if (!settingsMenu || !settingsMenuBtn) return;
  settingsMenu.hidden = !open;
  settingsMenuBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function closeSettingsMenu() {
  setSettingsMenuOpen(false);
}

/** Pause before matched cards are finalized (ms). */
const MATCH_PAUSE_MS = 400;
/** Pause before a non-matching pair flips back — longer so players can compare. */
const MISMATCH_PAUSE_MS = 1000;

/** Hues (0–360) cycled per matched pair so each pair has a distinct highlight. */
const MATCH_PAIR_HUES = [150, 205, 35, 285, 20, 220, 48, 325, 175, 265, 95, 310];

/**
 * After `renderBoard()` replaces the grid, the focused card is removed and the
 * viewport often jumps; restore the previous scroll position.
 * @param {number} savedY
 */
function restoreViewportScrollAfterBoardRefresh(savedY) {
  const apply = () => {
    window.scrollTo(0, savedY);
  };
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

function randomUnit() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

function getMode() {
  const v = gameModeSelect?.value;
  if (v === "english1" || v === "english2") return v;
  if (v === "fractions") return "fractions";
  if (v === "sums") return "sums";
  return "math";
}

/** @returns {SumsLevel} */
function getSumsLevel() {
  const v = sumsLevelSelect?.value;
  if (v === "medium" || v === "hard") return v;
  return "easy";
}

/**
 * @param {SumsLevel} level
 * @returns {{ pairCount: number; maxNumber: number }}
 */
function getSumsLevelSettings(level) {
  if (level === "hard") return { pairCount: 9, maxNumber: 100 };
  if (level === "medium") return { pairCount: 6, maxNumber: 50 };
  return { pairCount: 6, maxNumber: 10 };
}

/** @returns {EnglishLevel} */
function getEnglishLevel() {
  const v = englishLevelSelect?.value;
  if (v === "medium" || v === "hard") return v;
  return "easy";
}

/**
 * @param {EnglishLevel} level
 * @returns {{ pairCount: number; englishSpeech: "both" | "text" | "none" }}
 */
function getEnglishLevelSettings(level) {
  if (level === "hard") return { pairCount: 9, englishSpeech: "none" };
  if (level === "medium") return { pairCount: 6, englishSpeech: "text" };
  return { pairCount: 6, englishSpeech: "both" };
}

/** @returns {MathLevel} */
function getMathLevel() {
  const v = mathLevelSelect?.value;
  if (v === "medium" || v === "hard") return v;
  return "easy";
}

/**
 * @param {MathLevel} level
 * @returns {{ pairCount: number; tableMax: number }}
 */
function getMathLevelSettings(level) {
  if (level === "hard") return { pairCount: 9, tableMax: 10 };
  if (level === "medium") return { pairCount: 6, tableMax: 10 };
  return { pairCount: 4, tableMax: 5 };
}

/** @returns {FractionLevel} */
function getFractionLevel() {
  const v = fractionLevelSelect?.value;
  if (v === "medium" || v === "hard") return v;
  return "easy";
}

/**
 * @param {FractionLevel} level
 * @returns {{ pairCount: number; tableMax: number }}
 */
function getFractionLevelSettings(level) {
  if (level === "hard") return { pairCount: 8, tableMax: 12 };
  if (level === "medium") return { pairCount: 6, tableMax: 9 };
  return { pairCount: 4, tableMax: 5 };
}

function refreshChrome() {
  applyAppBranding(t);
  const mode = getMode();
  setPageTitleForMode(mode);
  if (gameTitle) {
    if (mode === "english1") gameTitle.textContent = t("titleEnglish1");
    else if (mode === "english2") gameTitle.textContent = t("titleEnglish2");
    else if (mode === "fractions") gameTitle.textContent = t("titleFractions");
    else if (mode === "sums") gameTitle.textContent = t("titleSums");
    else gameTitle.textContent = t("titleMath");
  }
  if (appPurposeEl) appPurposeEl.textContent = t("appPurpose");
  if (publicAppTitleEl) publicAppTitleEl.textContent = t("publicAppTitle");
  if (publicWhatTitleEl) publicWhatTitleEl.textContent = t("publicWhatTitle");
  if (publicWhat1El) publicWhat1El.textContent = t("publicWhat1");
  if (publicWhat2El) publicWhat2El.textContent = t("publicWhat2");
  if (publicWhat3El) publicWhat3El.textContent = t("publicWhat3");
  if (publicGoogleTitleEl) publicGoogleTitleEl.textContent = t("publicGoogleTitle");
  if (publicGooglePurposeEl) publicGooglePurposeEl.textContent = t("publicGooglePurpose");
  if (gameTagline) {
    if (
      state &&
      isEnglishMode(state.mode) &&
      state.englishTopicId
    ) {
      const tagKey = state.mode === "english2" ? "taglineEnglish2" : "taglineEnglish1";
      gameTagline.textContent = t(tagKey, {
        topic: t(englishTopicMessageKey(state.englishTopicId)),
      });
    } else if (mode === "english1") gameTagline.textContent = t("taglineEnglish1Generic");
    else if (mode === "english2") gameTagline.textContent = t("taglineEnglish2Generic");
    else if (mode === "fractions") gameTagline.textContent = t("taglineFractions");
    else if (mode === "sums") gameTagline.textContent = t("taglineSums");
    else gameTagline.textContent = t("taglineMath");
  }
  if (labelGameMode) labelGameMode.textContent = t("gameType");
  if (labelPairs) labelPairs.textContent = t("pairs");
  if (labelTables) {
    labelTables.textContent =
      mode === "fractions" ? t("tablesAsDenominator") : t("tables");
  }
  if (labelLanguage) labelLanguage.textContent = t("language");
  updateThemeToggleLabel();
  refreshAuthUI();
  if (labelMoves) labelMoves.textContent = t("moves");
  if (labelMatches) labelMatches.textContent = t("matches");
  if (labelTime) labelTime.textContent = t("time");
  if (gameActionsEl) gameActionsEl.setAttribute("aria-label", t("ariaGameActions"));
  if (winGameActionsEl) winGameActionsEl.setAttribute("aria-label", t("ariaWinGameActions"));
  for (const [btn, key] of [
    [newGameBtn, "ariaNewGame"],
    [restartDeckBtn, "ariaRestartDeck"],
    [winNewGameBtn, "ariaNewGame"],
    [winRestartDeckBtn, "ariaRestartDeck"],
  ]) {
    if (btn instanceof HTMLButtonElement) {
      btn.setAttribute("aria-label", t(key));
      btn.setAttribute("title", t(key));
    }
  }
  if (testMeBtn) testMeBtn.textContent = t("testMe");
  if (dismissQuizBtn) dismissQuizBtn.setAttribute("aria-label", t("ariaCloseQuiz"));
  if (openRecordsBtn) {
    openRecordsBtn.textContent = t("records");
    openRecordsBtn.setAttribute("aria-label", t("ariaRecords"));
  }
  if (settingsMenuBtn) {
    settingsMenuBtn.setAttribute("aria-label", t("ariaSettings"));
  }
  const cur = getCurrentUser();
  if (openUserMenuBtn) {
    openUserMenuBtn.textContent = cur ? `${t("userPlayingAs")}: ${cur.name}` : t("userPlayingAs");
    openUserMenuBtn.setAttribute("aria-label", t("ariaUserMenu"));
  }
  if (openAdminBtn) {
    const show = Boolean(cur && isAdminUser(cur));
    openAdminBtn.classList.toggle("is-hidden", !show);
    openAdminBtn.textContent = t("adminOverview");
    openAdminBtn.setAttribute("aria-label", t("ariaAdmin"));
  }
  refreshAdminSpeedFinish();
  if (adminSpeedFinishBtn) {
    adminSpeedFinishBtn.textContent = t("adminSpeedFinish");
    adminSpeedFinishBtn.setAttribute("aria-label", t("ariaAdminSpeedFinish"));
  }
  const udt = document.querySelector("#userDialogTitle");
  const udl = document.querySelector("#userDialogLead");
  const ust1 = document.querySelector("#userStepPickTitle");
  const ush1 = document.querySelector("#userStepPickHint");
  const ust2 = document.querySelector("#userStepAddTitle");
  const ush2 = document.querySelector("#userStepAddHint");
  const lnu = document.querySelector("#labelNewUser");
  const adt = document.querySelector("#adminDialogTitle");
  const adh = document.querySelector("#adminDialogHint");
  if (udt) udt.textContent = t("userDialogTitle");
  if (udl) udl.textContent = t("userDialogLead");
  if (ust1) ust1.textContent = t("userStepPickTitle");
  if (ush1) ush1.textContent = t("userStepPickHint");
  if (ust2) ust2.textContent = t("userStepAddTitle");
  if (ush2) ush2.textContent = t("userStepAddHint");
  syncUserDialogAccountMode();
  if (lnu) lnu.textContent = t("labelNewUser");
  if (addUserBtn) addUserBtn.textContent = t("addUser");
  if (userDialogContinue) userDialogContinue.textContent = t("userContinue");
  if (userDialogPrivacyLink) userDialogPrivacyLink.textContent = t("privacyPolicyLink");
  if (privacyPolicyLink) privacyPolicyLink.textContent = t("privacyPolicyLink");
  if (adt) adt.textContent = t("adminDialogTitle");
  if (adh) adh.textContent = t("adminDialogHint");
  if (closeAdminBtn) closeAdminBtn.textContent = t("closeAdmin");
  const aut = document.querySelector("#adminUnlockTitle");
  const auh = document.querySelector("#adminUnlockHint");
  const lap = document.querySelector("#labelAdminPassword");
  if (aut) aut.textContent = t("adminUnlockTitle");
  if (auh) auh.textContent = t("adminUnlockHint");
  if (lap) lap.textContent = t("labelAdminPassword");
  if (adminUnlockCancel) adminUnlockCancel.textContent = t("adminUnlockCancel");
  if (adminUnlockSubmit) adminUnlockSubmit.textContent = t("adminUnlockSubmit");
  updateAdminPasswordToggleLabel();

  if (gameModeSelect) {
    gameModeSelect.setAttribute("aria-label", t("ariaGameMode"));
    applyGameModeOptionLabels(gameModeSelect);
  }
  if (onlineQuitBtn) {
    onlineQuitBtn.textContent = t("onlineQuit");
    onlineQuitBtn.setAttribute("aria-label", t("ariaOnlineQuit"));
  }
  if (onlinePlayAgainBtn) onlinePlayAgainBtn.textContent = t("onlinePlayAgain");
  if (onlineLeaveAfterWinBtn) onlineLeaveAfterWinBtn.textContent = t("onlineLeave");

  if (pairCountSelect) pairCountSelect.setAttribute("aria-label", t("ariaPairs"));
  if (englishLevelSelect) {
    englishLevelSelect.setAttribute("aria-label", t("ariaEnglishLevel"));
    const elo = englishLevelSelect.querySelectorAll("option");
    if (elo[0]) elo[0].textContent = t("englishLevelEasy");
    if (elo[1]) elo[1].textContent = t("englishLevelMedium");
    if (elo[2]) elo[2].textContent = t("englishLevelHard");
  }
  if (sumsLevelSelect) {
    sumsLevelSelect.setAttribute("aria-label", t("ariaSumsLevel"));
    const slo = sumsLevelSelect.querySelectorAll("option");
    if (slo[0]) slo[0].textContent = t("sumsLevelEasy");
    if (slo[1]) slo[1].textContent = t("sumsLevelMedium");
    if (slo[2]) slo[2].textContent = t("sumsLevelHard");
  }
  if (mathLevelSelect) {
    mathLevelSelect.setAttribute("aria-label", t("ariaMathLevel"));
    const mlo = mathLevelSelect.querySelectorAll("option");
    if (mlo[0]) mlo[0].textContent = t("mathLevelEasy");
    if (mlo[1]) mlo[1].textContent = t("mathLevelMedium");
    if (mlo[2]) mlo[2].textContent = t("mathLevelHard");
  }
  if (fractionLevelSelect) {
    fractionLevelSelect.setAttribute("aria-label", t("ariaFractionLevel"));
    const flo = fractionLevelSelect.querySelectorAll("option");
    if (flo[0]) flo[0].textContent = t("fractionLevelEasy");
    if (flo[1]) flo[1].textContent = t("fractionLevelMedium");
    if (flo[2]) flo[2].textContent = t("fractionLevelHard");
  }
  if (labelEnglishLevel) labelEnglishLevel.textContent = t("englishLevel");
  if (labelSumsLevel) labelSumsLevel.textContent = t("sumsLevel");
  if (labelMathLevel) labelMathLevel.textContent = t("mathLevel");
  if (labelFractionLevel) labelFractionLevel.textContent = t("fractionLevel");
  if (pairsField) {
    pairsField.classList.toggle(
      "is-hidden",
      isEnglishMode(mode) || mode === "sums" || mode === "math" || mode === "fractions",
    );
  }
  if (englishLevelField) englishLevelField.classList.toggle("is-hidden", !isEnglishMode(mode));
  if (sumsLevelField) sumsLevelField.classList.toggle("is-hidden", mode !== "sums");
  if (mathLevelField) mathLevelField.classList.toggle("is-hidden", mode !== "math");
  if (fractionLevelField) fractionLevelField.classList.toggle("is-hidden", mode !== "fractions");

  if (tableMaxSelect) {
    tableMaxSelect.setAttribute(
      "aria-label",
      mode === "fractions" ? t("ariaDenominator") : t("ariaTables"),
    );
    const opts = tableMaxSelect.querySelectorAll("option");
    const rangeKeys = ["tablesRange5", "tablesRange9", "tablesRange12"];
    opts.forEach((opt, i) => {
      const key = rangeKeys[i];
      if (key) opt.textContent = t(key);
    });
  }
  if (localeSelect) {
    localeSelect.setAttribute("aria-label", t("language"));
    localeSelect.value = getLocale();
  }
  if (labelUserDialogLanguage) labelUserDialogLanguage.textContent = t("language");
  if (userDialogLocale) {
    userDialogLocale.setAttribute("aria-label", t("language"));
    userDialogLocale.value = getLocale();
  }
  if (board) board.setAttribute("aria-label", t("ariaBoard"));

  if (tablesField) {
    tablesField.classList.toggle(
      "is-hidden",
      isEnglishMode(mode) || mode === "sums" || mode === "math" || mode === "fractions",
    );
  }

  refreshRecordsLabels();
  refreshOnlineLabels();
  refreshDisclaimerLabels();
  refreshAboutLabels();
  refreshOnlineChrome();
}

/**
 * @param {unknown[]} cards
 */
function boardMatchesCards(cards) {
  if (!board) return false;
  const typed = /** @type {{ id: string }[]} */ (cards);
  const buttons = board.querySelectorAll("button[data-id]");
  if (buttons.length !== typed.length) return false;
  for (let i = 0; i < typed.length; i += 1) {
    const btn = buttons[i];
    if (!(btn instanceof HTMLButtonElement) || btn.dataset.id !== typed[i].id) {
      return false;
    }
  }
  return true;
}

function refreshOnlineBoardInPlace() {
  if (!board || !state) return;
  for (const card of state.cards) {
    syncCardDom(card.id);
  }
  const session = getActiveOnlineSession();
  const myTurn = session?.role != null && state.turn === session.role;
  board.classList.toggle("board--waiting-turn", !myTurn && !state.lock);
}

/**
 * @param {import('./multiplayer/protocol.js').OnlineStateSnapshot} snap
 * @param {unknown[]} cards
 */
function applyOnlineSnapshot(snap, cards) {
  const scrollY = window.scrollY;
  const inPlace = boardMatchesCards(cards);
  if (!inPlace) lastOnlineFlippedIds = [];
  state = applySnapshotToState(snap, /** @type {any[]} */ (cards), getOnlineGameConfig());
  cancelEnglishSpeech();
  hideWinActions();
  if (winMessage) winMessage.textContent = "";
  if (state && gameTagline) {
    setPageTitleForMode(state.mode);
    if (isEnglishMode(state.mode) && state.englishTopicId) {
      const tagKey = state.mode === "english2" ? "taglineEnglish2" : "taglineEnglish1";
      gameTagline.textContent = t(tagKey, {
        topic: t(englishTopicMessageKey(state.englishTopicId)),
      });
    } else if (state.mode === "fractions") {
      gameTagline.textContent = t("taglineFractions");
    } else if (state.mode === "sums") {
      gameTagline.textContent = t("taglineSums");
    } else {
      gameTagline.textContent = t("taglineMath");
    }
  }
  syncOnlineEnglishSpeechFromFlipped();
  if (inPlace) {
    refreshOnlineBoardInPlace();
  } else {
    renderBoard();
  }
  updateStats();
  refreshOnlineChrome();
  restoreViewportScrollAfterBoardRefresh(scrollY);
}

/**
 * @param {string} cardId
 */
function speakEnglishCardIfNeeded(cardId) {
  if (!state || !isEnglishMode(state.mode)) return;
  const c = state.cards.find((x) => x.id === cardId);
  const sp = state.englishSpeech;
  if (!c?.word?.trim()) return;
  if (state.mode === "english1") {
    if (sp === "both") speakMemoryWord(c.word, "en");
    else if (sp === "text" && c.side === "word") speakMemoryWord(c.word, "en");
  } else if (state.mode === "english2") {
    const lang = c.side === "he" ? "he" : "en";
    if (sp === "both") speakMemoryWord(c.word, lang);
    else if (sp === "text" && c.side === "en") speakMemoryWord(c.word, "en");
  }
}

function syncOnlineEnglishSpeechFromFlipped() {
  if (!state?.online || !isEnglishMode(state.mode)) return;
  const prev = new Set(lastOnlineFlippedIds);
  for (const id of state.flipped) {
    if (!prev.has(id)) speakEnglishCardIfNeeded(id);
  }
  lastOnlineFlippedIds = [...state.flipped];
}

function refreshOnlineTagline() {
  if (!state?.online || !gameTagline) return;
  const session = getActiveOnlineSession();
  const role = session?.role;
  if (!role) return;
  const turnText =
    state.turn === role ? t("onlineYourTurn") : t("onlineOpponentTurn");
  if (isEnglishMode(state.mode) && state.englishTopicId) {
    const tagKey = state.mode === "english2" ? "taglineEnglish2" : "taglineEnglish1";
    const topic = t(englishTopicMessageKey(state.englishTopicId));
    gameTagline.textContent = `${t(tagKey, { topic })}\n${turnText}`;
  } else {
    gameTagline.textContent = turnText;
  }
}

/**
 * @param {string} message
 * @param {number} hostScore
 * @param {number} guestScore
 */
function showOnlineWin(message, hostScore, guestScore) {
  if (winMessage) {
    winMessage.textContent = `${message} (${hostScore}–${guestScore})`;
  }
  showWinActions();
  if (testMeBtn) testMeBtn.hidden = true;
  refreshAdminSpeedFinish();
  refreshOnlineChrome();
}

function renderQuizPrompt(q) {
  if (!quizPrompt) return;
  quizPrompt.className = "quiz-prompt";
  if (quizSession?.mode === "english1" && q.prompt.length <= 4) {
    quizPrompt.classList.add("quiz-prompt--symbol");
    quizPrompt.textContent = q.prompt;
    return;
  }
  if (quizSession?.mode === "english2") {
    quizPrompt.classList.add("quiz-prompt--hebrew");
    quizPrompt.textContent = `${t("quizEnglishFor")} ${q.prompt}`;
    return;
  }
  if (quizSession?.mode === "english1") {
    quizPrompt.textContent = `${t("quizChooseWord")} ${q.prompt}`;
    return;
  }
  quizPrompt.textContent = q.prompt;
}

function renderQuizQuestion() {
  if (!quizSession || !quizChoices || !quizProgress) return;
  const { questions, index } = quizSession;
  const q = questions[index];
  if (!q) return;

  quizProgress.textContent = t("quizProgress", {
    current: String(index + 1),
    total: String(questions.length),
  });
  renderQuizPrompt(q);

  if (quizFeedback) {
    quizFeedback.hidden = true;
    quizFeedback.textContent = "";
    quizFeedback.className = "quiz-feedback";
  }
  if (quizSummary) quizSummary.hidden = true;
  if (closeQuizBtn) closeQuizBtn.hidden = true;

  quizChoices.replaceChildren();
  quizChoices.setAttribute("aria-label", t("ariaQuizChoices"));
  const pieChoices = q.pieChoices;
  if (pieChoices?.length) {
    pieChoices.forEach((pie, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-choice quiz-choice--pie";
      btn.setAttribute("aria-label", pie.key);
      btn.append(createPieSvg(pie.n, pie.d, 80));
      btn.addEventListener("click", () => handleQuizAnswer(i));
      quizChoices.append(btn);
    });
    return;
  }
  q.choices.forEach((label, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "quiz-choice";
    if (quizSession?.mode === "english2") btn.classList.add("quiz-choice--hebrew");
    btn.textContent = label;
    btn.addEventListener("click", () => handleQuizAnswer(i));
    quizChoices.append(btn);
  });
}

/**
 * @param {number} choiceIndex
 */
function handleQuizAnswer(choiceIndex) {
  if (!quizSession || quizSession.locked) return;
  const q = quizSession.questions[quizSession.index];
  if (!q) return;

  quizSession.locked = true;
  const correct = choiceIndex === q.correctIndex;
  if (correct) quizSession.correct += 1;

  const buttons = quizChoices?.querySelectorAll(".quiz-choice");
  buttons?.forEach((btn, i) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.disabled = true;
    if (i === q.correctIndex) btn.classList.add("is-correct");
    else if (i === choiceIndex && !correct) btn.classList.add("is-wrong");
  });

  if (quizFeedback) {
    quizFeedback.hidden = false;
    quizFeedback.className = correct ? "quiz-feedback is-correct" : "quiz-feedback is-wrong";
    quizFeedback.textContent = correct
      ? t("quizCorrect")
      : t("quizWrong", { answer: q.choices[q.correctIndex] });
  }

  clearQuizAdvance();
  quizAdvanceTimer = window.setTimeout(() => {
    quizAdvanceTimer = null;
    if (!quizSession) return;
    quizSession.locked = false;
    quizSession.index += 1;
    if (quizSession.index >= quizSession.questions.length) {
      finishQuiz();
    } else {
      renderQuizQuestion();
    }
  }, correct ? 700 : 1200);
}

function finishQuiz() {
  if (!quizSession) return;
  const { mode, questions, correct } = quizSession;
  const total = questions.length;
  recordTestResult(mode, correct, total);
  const pct = scorePercent(correct, total);

  if (quizChoices) quizChoices.replaceChildren();
  if (quizPrompt) quizPrompt.textContent = "";
  if (quizProgress) quizProgress.textContent = "";

  if (quizFeedback) quizFeedback.hidden = true;
  if (quizSummary) {
    quizSummary.hidden = false;
    quizSummary.textContent =
      correct === total
        ? `${t("quizSummaryPerfect")} ${t("quizSummary", {
            correct: String(correct),
            total: String(total),
            percent: String(pct),
          })}`
        : t("quizSummary", {
            correct: String(correct),
            total: String(total),
            percent: String(pct),
          });
  }
  if (closeQuizBtn) closeQuizBtn.hidden = false;
  quizSession = null;
}

function openQuiz() {
  if (!lastWinForQuiz || !quizDialog) return;
  const questions = buildQuizFromGame(
    lastWinForQuiz.mode,
    lastWinForQuiz.cards,
    randomUnit,
  );
  if (!questions.length) return;

  quizSession = {
    mode: lastWinForQuiz.mode,
    questions,
    index: 0,
    correct: 0,
    locked: false,
  };

  if (quizTitle) quizTitle.textContent = t("quizTitle");
  if (closeQuizBtn) closeQuizBtn.textContent = t("quizDone");
  renderQuizQuestion();
  quizDialog.showModal();
}

function closeQuiz() {
  clearQuizAdvance();
  quizSession = null;
  quizDialog?.close();
}

function refreshRecordsLabels() {
  const title = document.querySelector("#recordsTitle");
  const gamesHeading = document.querySelector("#recordsGamesHeading");
  const testsHeading = document.querySelector("#recordsTestsHeading");
  const hMath = document.querySelector("#recordsHeadingMath");
  const hSums = document.querySelector("#recordsHeadingSums");
  const hEng1 = document.querySelector("#recordsHeadingEnglish1");
  const hEng2 = document.querySelector("#recordsHeadingEnglish2");
  const hFrac = document.querySelector("#recordsHeadingFractions");
  const close = document.querySelector("#closeRecords");
  if (title) title.textContent = t("recordsTitle");
  if (gamesHeading) gamesHeading.textContent = t("recordsGamesHeading");
  if (testsHeading) testsHeading.textContent = t("recordsTestsHeading");
  if (hMath) hMath.textContent = t("recordsMath");
  if (hSums) hSums.textContent = t("recordsSums");
  if (hEng1) hEng1.textContent = t("recordsEnglish1");
  if (hEng2) hEng2.textContent = t("recordsEnglish2");
  if (hFrac) hFrac.textContent = t("recordsFractions");
  if (close) close.textContent = t("recordsClose");
  for (const [id, key] of [
    ["#recMathBestLabel", "recordsBestTime"],
    ["#recMathWonLabel", "recordsWon"],
    ["#recMathPlayedLabel", "recordsPlayed"],
    ["#recSumsBestLabel", "recordsBestTime"],
    ["#recSumsWonLabel", "recordsWon"],
    ["#recSumsPlayedLabel", "recordsPlayed"],
    ["#recEng1BestLabel", "recordsBestTime"],
    ["#recEng1WonLabel", "recordsWon"],
    ["#recEng1PlayedLabel", "recordsPlayed"],
    ["#recEng2BestLabel", "recordsBestTime"],
    ["#recEng2WonLabel", "recordsWon"],
    ["#recEng2PlayedLabel", "recordsPlayed"],
    ["#recFracBestLabel", "recordsBestTime"],
    ["#recFracWonLabel", "recordsWon"],
    ["#recFracPlayedLabel", "recordsPlayed"],
    ["#recTestMathBestLabel", "recordsBestScore"],
    ["#recTestMathPassedLabel", "recordsTestsPassed"],
    ["#recTestMathTakenLabel", "recordsTestsTaken"],
    ["#recTestSumsBestLabel", "recordsBestScore"],
    ["#recTestSumsPassedLabel", "recordsTestsPassed"],
    ["#recTestSumsTakenLabel", "recordsTestsTaken"],
    ["#recTestEng1BestLabel", "recordsBestScore"],
    ["#recTestEng1PassedLabel", "recordsTestsPassed"],
    ["#recTestEng1TakenLabel", "recordsTestsTaken"],
    ["#recTestEng2BestLabel", "recordsBestScore"],
    ["#recTestEng2PassedLabel", "recordsTestsPassed"],
    ["#recTestEng2TakenLabel", "recordsTestsTaken"],
    ["#recTestFracBestLabel", "recordsBestScore"],
    ["#recTestFracPassedLabel", "recordsTestsPassed"],
    ["#recTestFracTakenLabel", "recordsTestsTaken"],
  ]) {
    const el = document.querySelector(id);
    if (el) el.textContent = t(key);
  }
  const testHeadings = [
    ["#recordsTestHeadingMath", "recordsMath"],
    ["#recordsTestHeadingSums", "recordsSums"],
    ["#recordsTestHeadingEnglish1", "recordsEnglish1"],
    ["#recordsTestHeadingEnglish2", "recordsEnglish2"],
    ["#recordsTestHeadingFractions", "recordsFractions"],
  ];
  for (const [id, key] of testHeadings) {
    const el = document.querySelector(id);
    if (el) el.textContent = t(key);
  }
  if (emailRecordsBtn) {
    emailRecordsBtn.textContent = t("emailRecords");
    emailRecordsBtn.setAttribute("aria-label", t("ariaEmailRecords"));
  }
}

function fillRecordsDialog() {
  const data = loadRecords();
  const mMath = document.querySelector("#recMathBest");
  const mWon = document.querySelector("#recMathWon");
  const mPlayed = document.querySelector("#recMathPlayed");
  const sBest = document.querySelector("#recSumsBest");
  const sWon = document.querySelector("#recSumsWon");
  const sPlayed = document.querySelector("#recSumsPlayed");
  const e1Best = document.querySelector("#recEng1Best");
  const e1Won = document.querySelector("#recEng1Won");
  const e1Played = document.querySelector("#recEng1Played");
  const e2Best = document.querySelector("#recEng2Best");
  const e2Won = document.querySelector("#recEng2Won");
  const e2Played = document.querySelector("#recEng2Played");
  const fBest = document.querySelector("#recFracBest");
  const fWon = document.querySelector("#recFracWon");
  const fPlayed = document.querySelector("#recFracPlayed");
  if (mMath) mMath.textContent = formatDuration(data.math.bestTimeMs);
  if (mWon) mWon.textContent = String(data.math.gamesWon);
  if (mPlayed) mPlayed.textContent = String(data.math.gamesPlayed);
  if (sBest) sBest.textContent = formatDuration(data.sums.bestTimeMs);
  if (sWon) sWon.textContent = String(data.sums.gamesWon);
  if (sPlayed) sPlayed.textContent = String(data.sums.gamesPlayed);
  if (e1Best) e1Best.textContent = formatDuration(data.english1.bestTimeMs);
  if (e1Won) e1Won.textContent = String(data.english1.gamesWon);
  if (e1Played) e1Played.textContent = String(data.english1.gamesPlayed);
  if (e2Best) e2Best.textContent = formatDuration(data.english2.bestTimeMs);
  if (e2Won) e2Won.textContent = String(data.english2.gamesWon);
  if (e2Played) e2Played.textContent = String(data.english2.gamesPlayed);
  if (fBest) fBest.textContent = formatDuration(data.fractions.bestTimeMs);
  if (fWon) fWon.textContent = String(data.fractions.gamesWon);
  if (fPlayed) fPlayed.textContent = String(data.fractions.gamesPlayed);

  const tMath = data.tests.math;
  const tSums = data.tests.sums;
  const tE1 = data.tests.english1;
  const tE2 = data.tests.english2;
  const tFrac = data.tests.fractions;
  const setTest = (bestId, passedId, takenId, stats) => {
    const b = document.querySelector(bestId);
    const p = document.querySelector(passedId);
    const n = document.querySelector(takenId);
    if (b) b.textContent = formatScorePercent(stats.bestScorePercent);
    if (p) p.textContent = String(stats.testsPassed);
    if (n) n.textContent = String(stats.testsTaken);
  };
  setTest("#recTestMathBest", "#recTestMathPassed", "#recTestMathTaken", tMath);
  setTest("#recTestSumsBest", "#recTestSumsPassed", "#recTestSumsTaken", tSums);
  setTest("#recTestEng1Best", "#recTestEng1Passed", "#recTestEng1Taken", tE1);
  setTest("#recTestEng2Best", "#recTestEng2Passed", "#recTestEng2Taken", tE2);
  setTest("#recTestFracBest", "#recTestFracPassed", "#recTestFracTaken", tFrac);
}

function openRecords() {
  closeSettingsMenu();
  refreshRecordsLabels();
  fillRecordsDialog();
  recordsDialog?.showModal();
}

function closeRecords() {
  recordsDialog?.close();
}

/**
 * Opens the default mail client with subject + body listing all mode stats.
 */
function shareRecordsByEmail() {
  const data = loadRecords();
  /** @param {import("./records.js").GameMode} mode */
  const block = (titleKey, mode) => {
    const m = data[mode];
    return [
      t(titleKey),
      `${t("recordsBestTime")}: ${formatDuration(m.bestTimeMs)}`,
      `${t("recordsWon")}: ${m.gamesWon}`,
      `${t("recordsPlayed")}: ${m.gamesPlayed}`,
      "",
    ];
  };
  /** @param {string} titleKey @param {import("./records.js").GameMode} mode */
  const testBlock = (titleKey, mode) => {
    const m = data.tests[mode];
    return [
      t(titleKey),
      `${t("recordsBestScore")}: ${formatScorePercent(m.bestScorePercent)}`,
      `${t("recordsTestsPassed")}: ${m.testsPassed}`,
      `${t("recordsTestsTaken")}: ${m.testsTaken}`,
      "",
    ];
  };
  const lines = [
    t("emailRecordsIntro", { name: getCurrentUser()?.name || t("userPlayingAs") }),
    "",
    t("recordsGamesHeading"),
    ...block("recordsMath", "math"),
    ...block("recordsSums", "sums"),
    ...block("recordsEnglish1", "english1"),
    ...block("recordsEnglish2", "english2"),
    ...block("recordsFractions", "fractions"),
    t("recordsTestsHeading"),
    ...testBlock("recordsMath", "math"),
    ...testBlock("recordsSums", "sums"),
    ...testBlock("recordsEnglish1", "english1"),
    ...testBlock("recordsEnglish2", "english2"),
    ...testBlock("recordsFractions", "fractions"),
  ];
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const subject = encodeURIComponent(t("emailRecordsSubject"));
  const body = encodeURIComponent(lines.join("\n"));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

function readOptions() {
  const mode = getMode();
  const tableMax = Math.min(12, Math.max(2, Number(tableMaxSelect?.value ?? 9)));
  if (isEnglishMode(mode)) {
    const level = getEnglishLevel();
    const { pairCount, englishSpeech } = getEnglishLevelSettings(level);
    return { pairCount, tableMax, englishLevel: level, englishSpeech };
  }
  if (mode === "sums") {
    const level = getSumsLevel();
    const { pairCount, maxNumber } = getSumsLevelSettings(level);
    return { pairCount, tableMax, sumsLevel: level, maxNumber };
  }
  if (mode === "math") {
    const level = getMathLevel();
    const { pairCount, tableMax: tm } = getMathLevelSettings(level);
    return { pairCount, tableMax: tm, mathLevel: level };
  }
  if (mode === "fractions") {
    const level = getFractionLevel();
    const { pairCount, tableMax: tm } = getFractionLevelSettings(level);
    return { pairCount, tableMax: tm, fractionLevel: level };
  }
  return { pairCount: 6, tableMax };
}

/**
 * @param {"init" | "restart" | "options" | "switch-user" | "restart-same"} source
 */
function maybeRecordAbandoned(source) {
  const prev = state;
  if (!booted || !prev || prev.matched.size >= prev.cards.length) return;
  const touched =
    prev.moves > 0 || prev.matched.size > 0 || prev.clockStart !== null;
  if (touched && source !== "init" && source !== "switch-user") {
    recordAbandoned(prev.mode);
  }
}

/**
 * @param {NonNullable<typeof lastDeckSource>} src
 * @param {() => number} rng
 */
function buildCardsFromDeckSource(src, rng) {
  if (src.mode === "math" && src.facts?.length) {
    return shuffle(buildDeck(src.facts, rng), rng);
  }
  if (src.mode === "sums" && src.entries?.length) {
    return shuffle(buildSumDeck(/** @type {any[]} */ (src.entries), rng), rng);
  }
  if (isEnglishMode(src.mode) && src.entries?.length) {
    return shuffle(
      buildEnglishDeck(/** @type {any[]} */ (src.entries), src.mode),
      rng,
    );
  }
  if (src.mode === "fractions" && src.entries?.length) {
    return shuffle(buildFractionDeck(/** @type {any[]} */ (src.entries)), rng);
  }
  return [];
}

function restartSameDeck() {
  cancelEnglishSpeech();
  clearWinAutoRestart();
  clearQuizAdvance();
  hideWinActions();
  lastWinForQuiz = null;
  if (quizDialog?.open) quizDialog.close();
  quizSession = null;

  if (!lastDeckSource) {
    startGame("restart");
    return;
  }

  const src = lastDeckSource;
  const rng = randomUnit;
  const cards = buildCardsFromDeckSource(src, rng);
  if (!cards.length) {
    startGame("restart");
    return;
  }

  maybeRecordAbandoned("restart-same");

  state = {
    mode: src.mode,
    cards,
    flipped: [],
    matched: new Set(),
    matchPairByCardId: new Map(),
    moves: 0,
    lock: false,
    clockStart: null,
    winHandled: false,
    englishSpeech: src.englishSpeech,
    englishTopicId: src.englishTopicId,
  };

  if (isEnglishMode(src.mode) && src.englishTopicId && gameTagline) {
    const tagKey = src.mode === "english2" ? "taglineEnglish2" : "taglineEnglish1";
    gameTagline.textContent = t(tagKey, {
      topic: t(englishTopicMessageKey(src.englishTopicId)),
    });
  }

  hideWinActions();
  refreshChrome();
  renderBoard();
  updateStats();
}

/**
 * @param {"init" | "restart" | "options" | "switch-user"} source
 */
function startGame(source) {
  if (isOnlineGameActive()) {
    void leaveOnlineSession();
    appRoot?.classList.remove("is-online-active");
  }
  cancelEnglishSpeech();
  clearWinAutoRestart();
  clearQuizAdvance();
  hideWinActions();
  lastWinForQuiz = null;
  if (quizDialog?.open) quizDialog.close();
  quizSession = null;
  let mode = getMode();

  maybeRecordAbandoned(source);

  const rng = randomUnit;
  /** @type {any[]} */
  let cards = [];
  let signature = "";
  /** @type {"both" | "text" | "none" | undefined} */
  let englishSpeech;
  /** @type {string | undefined} */
  let englishTopicId;

  try {
    if (mode === "math") {
      const { pairCount, tableMax, mathLevel } = readOptions();
      const maxPairs = uniqueProductCount(tableMax);
      const count = Math.min(pairCount, maxPairs);
      const canVary = count < maxPairs;

      let facts = pickFacts(tableMax, count, rng);
      signature =
        `${mathLevel}\0` + [...facts].map((f) => f.key).sort().join("\0");
      let tries = 0;
      while (
        canVary &&
        lastSignature.math !== null &&
        signature === lastSignature.math &&
        tries < 64
      ) {
        facts = pickFacts(tableMax, count, rng);
        signature =
          `${mathLevel}\0` + [...facts].map((f) => f.key).sort().join("\0");
        tries += 1;
      }
      lastSignature.math = signature;
      lastDeckSource = { mode: "math", facts: [...facts] };
      cards = shuffle(buildDeck(facts, rng), rng);
    } else if (mode === "sums") {
      const { pairCount, maxNumber, sumsLevel } = readOptions();
      const pool = buildSumPool(maxNumber);
      const maxPairs = uniqueSumResultCount(pool);
      const count = Math.min(pairCount, maxPairs);
      let entries = pickSumEntries(pool, count, rng);
      signature =
        `${sumsLevel}\0` + [...entries].map((e) => e.key).sort().join("\0");
      let tries = 0;
      while (
        lastSignature.sums !== null &&
        signature === lastSignature.sums &&
        tries < 64 &&
        count < maxPairs
      ) {
        entries = pickSumEntries(pool, count, rng);
        signature =
          `${sumsLevel}\0` + [...entries].map((e) => e.key).sort().join("\0");
        tries += 1;
      }
      lastSignature.sums = signature;
      lastDeckSource = { mode: "sums", entries: [...entries] };
      cards = shuffle(buildSumDeck(entries, rng), rng);
    } else if (isEnglishMode(mode)) {
      const { pairCount, englishLevel, englishSpeech: es } = readOptions();
      englishSpeech = es;
      const topicId = pickEnglishTopicId(rng);
      const pool = getEnglishPool(topicId);
      const maxPairs = pool.length;
      const count = Math.min(pairCount, maxPairs);
      let entries = pickEnglishEntries(pool, count, mode, rng);
      const sigKey = mode === "english1" ? "english1" : "english2";
      signature =
        `${englishLevel}\0${topicId}\0` +
        [...entries].map((e) => e.key).sort().join("\0");
      let tries = 0;
      while (
        lastSignature[sigKey] !== null &&
        signature === lastSignature[sigKey] &&
        tries < 64 &&
        count < maxPairs
      ) {
        entries = pickEnglishEntries(pool, count, mode, rng);
        signature =
          `${englishLevel}\0${topicId}\0` +
          [...entries].map((e) => e.key).sort().join("\0");
        tries += 1;
      }
      lastSignature[sigKey] = signature;
      lastDeckSource = {
        mode,
        entries: [...entries],
        englishTopicId: topicId,
        englishSpeech: es,
      };
      cards = shuffle(buildEnglishDeck(entries, mode), rng);
      englishTopicId = topicId;
      if (gameTagline) {
        const tagKey = mode === "english2" ? "taglineEnglish2" : "taglineEnglish1";
        gameTagline.textContent = t(tagKey, {
          topic: t(englishTopicMessageKey(topicId)),
        });
      }
    } else {
      const { pairCount, tableMax, fractionLevel } = readOptions();
      const pool = buildFractionPool(tableMax);
      const maxPairs = pool.length;
      const count = Math.min(pairCount, maxPairs);
      let entries = pickFractionEntries(pool, count, rng);
      signature =
        `${fractionLevel}\0` + [...entries].map((e) => e.key).sort().join("\0");
      let tries = 0;
      while (
        lastSignature.fractions !== null &&
        signature === lastSignature.fractions &&
        tries < 64 &&
        count < maxPairs
      ) {
        entries = pickFractionEntries(pool, count, rng);
        signature =
          `${fractionLevel}\0` + [...entries].map((e) => e.key).sort().join("\0");
        tries += 1;
      }
      lastSignature.fractions = signature;
      lastDeckSource = { mode: "fractions", entries: [...entries] };
      cards = shuffle(buildFractionDeck(entries), rng);
    }
  } catch (err) {
    console.error("[app] startGame deck build:", err);
    englishSpeech = undefined;
    const facts = pickFacts(2, 1, rng);
    lastDeckSource = { mode: "math", facts: [...facts] };
    cards = shuffle(buildDeck(facts, rng), rng);
    mode = "math";
    if (gameModeSelect) gameModeSelect.value = "math";
  }

  if (cards.length === 0) {
    console.warn("[app] Empty deck after build; applying mode-specific fallback.");
    if (isEnglishMode(mode) && ENGLISH_TOPIC_IDS.length > 0) {
      const topicId = pickEnglishTopicId(rng);
      const pool = getEnglishPool(topicId);
      const picked = pool.length ? pickEnglishEntries(pool, 1, mode, rng) : [];
      if (picked.length) {
        lastDeckSource = {
          mode,
          entries: [...picked],
          englishTopicId: topicId,
          englishSpeech,
        };
        cards = shuffle(buildEnglishDeck(picked, mode), rng);
      }
      englishTopicId = topicId;
    } else if (mode === "sums") {
      const pool = buildSumPool(10);
      const entries = pool.length ? pickSumEntries(pool, 1, rng) : [];
      if (entries.length) {
        lastDeckSource = { mode: "sums", entries: [...entries] };
        cards = shuffle(buildSumDeck(entries, rng), rng);
      }
    } else if (mode === "fractions") {
      const pool = buildFractionPool(5);
      const entries = pool.length ? pickFractionEntries(pool, 1, rng) : [];
      if (entries.length) {
        lastDeckSource = { mode: "fractions", entries: [...entries] };
        cards = shuffle(buildFractionDeck(entries), rng);
      }
    }
    if (cards.length === 0) {
      const facts = pickFacts(2, 1, rng);
      lastDeckSource = { mode: "math", facts: [...facts] };
      cards = shuffle(buildDeck(facts, rng), rng);
      mode = "math";
      englishSpeech = undefined;
      if (gameModeSelect) gameModeSelect.value = "math";
    }
  }

  state = {
    mode,
    cards,
    flipped: [],
    matched: new Set(),
    matchPairByCardId: new Map(),
    moves: 0,
    lock: false,
    clockStart: null,
    winHandled: false,
    englishSpeech,
    englishTopicId,
  };

  if (winMessage) {
    if (mode === "english1") winMessage.textContent = t("winEnglish1");
    else if (mode === "english2") winMessage.textContent = t("winEnglish2");
    else if (mode === "fractions") winMessage.textContent = t("winFractions");
    else if (mode === "sums") winMessage.textContent = t("winSums");
    else winMessage.textContent = t("winMath");
  }
  hideWinActions();
  refreshChrome();
  renderBoard();
  updateStats();
  booted = true;
}

function formatElapsed(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function refreshAdminSpeedFinish() {
  if (!adminSpeedFinishBtn) return;
  const cur = getCurrentUser();
  const session = getActiveOnlineSession();
  const onlineHost =
    Boolean(state?.online && session?.role === "host" && session.phase === "playing");
  const show = Boolean(
    cur &&
      isAdminUser(cur) &&
      state &&
      !state.winHandled &&
      state.cards.length > 0 &&
      (!state.online || onlineHost),
  );
  adminSpeedFinishBtn.classList.toggle("is-hidden", !show);
}

function completeGameWin() {
  if (!state || state.winHandled) return;
  state.winHandled = true;
  celebrateWin();
  const elapsed =
    state.clockStart !== null ? Date.now() - state.clockStart : null;
  if (elapsed !== null && elapsed > 0) {
    recordWin(state.mode, elapsed);
  }
  lastWinForQuiz = { mode: state.mode, cards: [...state.cards] };
  clearWinAutoRestart();
  showWinActions();
  refreshAdminSpeedFinish();
}

function markAllCardsMatched() {
  if (!state) return;
  state.flipped = [];
  state.lock = false;
  state.matched.clear();
  state.matchPairByCardId.clear();
  /** @type {Map<string, string[]>} */
  const byKey = new Map();
  for (const card of state.cards) {
    const key =
      typeof card.factKey === "string" && card.factKey.length
        ? card.factKey
        : card.id;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(card.id);
  }
  let pairIdx = 0;
  for (const ids of byKey.values()) {
    for (const id of ids) {
      state.matched.add(id);
      state.matchPairByCardId.set(id, pairIdx);
    }
    pairIdx += 1;
  }
}

function speedFinishGame() {
  const cur = getCurrentUser();
  if (!state || state.winHandled || !cur || !isAdminUser(cur)) return;

  cancelEnglishSpeech();
  armCelebrationAudio();
  if (state.clockStart === null) {
    state.clockStart = Date.now() - 2000;
  }

  if (state.online) {
    const session = getActiveOnlineSession();
    if (!session || session.role !== "host") return;
    adminFinishOnlineGame(session.role);
    return;
  }

  markAllCardsMatched();
  renderBoard();
  updateStats();
}

function updateStats() {
  if (!state) return;

  if (state.online) {
    const session = getActiveOnlineSession();
    const role = session?.role;
    const myScore = role === "host" ? (state.hostScore ?? 0) : (state.guestScore ?? 0);
    const theirScore = role === "host" ? (state.guestScore ?? 0) : (state.hostScore ?? 0);
    if (movesEl) movesEl.textContent = String(state.moves);
    if (matchesEl) {
      matchesEl.textContent = t("onlineScore", {
        mine: String(myScore),
        theirs: String(theirScore),
      });
    }
    if (elapsedEl) {
      if (state.clockStart !== null) {
        elapsedEl.textContent = formatElapsed(Date.now() - state.clockStart);
      } else {
        elapsedEl.textContent = "0:00";
      }
    }
    refreshOnlineTagline();
    if (board) {
      const myTurn = role != null && state.turn === role;
      board.classList.toggle("board--waiting-turn", !myTurn && !state.lock);
    }
    return;
  }

  const totalPairs = state.cards.length / 2;
  const matchedPairs = state.matched.size / 2;
  if (movesEl) movesEl.textContent = String(state.moves);
  if (matchesEl) matchesEl.textContent = `${matchedPairs} / ${totalPairs}`;

  if (elapsedEl) {
    if (state.clockStart !== null) {
      elapsedEl.textContent = formatElapsed(Date.now() - state.clockStart);
    } else {
      elapsedEl.textContent = "0:00";
    }
  }

  if (board) board.classList.remove("board--waiting-turn");

  if (matchedPairs === totalPairs && winActions) {
    completeGameWin();
  }
}

function renderBoard() {
  if (!board || !state) return;
  if (state.online) {
    const session = getActiveOnlineSession();
    const myTurn = session?.role != null && state.turn === session.role;
    board.classList.toggle("board--waiting-turn", !myTurn && !state.lock);
  }
  board.replaceChildren();

  const cols = Math.ceil(Math.sqrt(state.cards.length));
  board.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  for (const card of state.cards) {
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.dataset.id = card.id;
    btn.setAttribute("aria-label", t("ariaHiddenCard"));

    const back = document.createElement("span");
    back.className = "card-face card-face--back";
    back.textContent = "★";
    back.setAttribute("aria-hidden", "true");

    const front = document.createElement("span");
    front.className = "card-face card-face--front";
    const pieN = card.n ?? card.num;
    const pieD = card.d ?? card.den;
    if (card.side === "diagram" && pieN != null && pieD != null) {
      front.classList.add("card-face--diagram");
      try {
        front.append(createPieSvg(pieN, pieD));
      } catch (e) {
        console.warn("[app] fraction pie SVG:", e);
        front.textContent =
          card.label && String(card.label).trim()
            ? String(card.label)
            : `${pieN}/${pieD}`;
      }
    } else if (card.symbol && card.side === "picture") {
      front.classList.add("card-face--picture");
      const sym = document.createElement("span");
      sym.className = "card-symbol";
      sym.textContent = card.symbol;
      sym.setAttribute("aria-hidden", "true");
      front.append(sym);
    } else if (card.imageUrl) {
      front.classList.add("card-face--picture");
      const img = document.createElement("img");
      img.className = "card-picture";
      img.src = card.imageUrl;
      img.alt = "";
      img.decoding = "async";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      front.append(img);
    } else if (card.side === "fraction" && card.label) {
      front.classList.add("card-face--fraction");
      front.textContent = card.label;
    } else {
      if (card.side === "he" || (card.side === "word" && card.lang === "he")) {
        front.classList.add("card-face--hebrew");
      } else if (card.side === "en") {
        front.classList.add("card-face--english");
      }
      front.textContent = card.label;
    }

    btn.append(back, front);

    const isUp =
      state.flipped.includes(card.id) || state.matched.has(card.id);
    if (isUp) btn.classList.add("is-flipped");
    if (state.matched.has(card.id)) {
      btn.classList.add("is-matched");
      const pairIdx = state.matchPairByCardId.get(card.id);
      if (typeof pairIdx === "number") {
        const hue = MATCH_PAIR_HUES[pairIdx % MATCH_PAIR_HUES.length];
        btn.style.setProperty("--match-hue", String(hue));
      } else {
        btn.style.removeProperty("--match-hue");
      }
      btn.disabled = true;
      const label =
        card.word ?? (card.label && card.label.trim() ? card.label : card.factKey);
      btn.setAttribute("aria-label", t("ariaMatched", { label }));
    } else if (isUp && (card.symbol || card.imageUrl) && card.word) {
      btn.setAttribute("aria-label", t("ariaPictureCard", { word: card.word }));
    } else if (isUp && card.side === "he" && card.label) {
      btn.setAttribute("aria-label", card.label);
    } else if (isUp && card.side === "en" && card.label) {
      btn.setAttribute("aria-label", card.label);
    } else if (isUp && card.side === "diagram" && card.word) {
      btn.setAttribute("aria-label", t("ariaFractionPie", { word: card.word }));
    } else if (isUp && card.side === "fraction" && card.label) {
      btn.setAttribute("aria-label", card.label);
    }

    btn.addEventListener("click", () => onCardClick(card.id));
    wrap.append(btn);
    board.append(wrap);
  }
}

/**
 * @param {string} id
 */
function onCardClick(id) {
  if (!state || state.lock) return;
  if (state.matched.has(id)) return;
  if (state.flipped.includes(id)) return;

  if (state.online) {
    const session = getActiveOnlineSession();
    if (!session || session.role !== state.turn) return;
    armCelebrationAudio();
    onlineLocalFlip(id);
    speakEnglishCardIfNeeded(id);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    return;
  }

  armCelebrationAudio();

  if (state.clockStart === null) {
    state.clockStart = Date.now();
  }

  state.flipped.push(id);
  syncCardDom(id);
  if (isEnglishMode(state.mode)) {
    const c = state.cards.find((x) => x.id === id);
    const sp = state.englishSpeech;
    if (c?.word?.trim()) {
      if (state.mode === "english1") {
        if (sp === "both") speakMemoryWord(c.word, "en");
        else if (sp === "text" && c.side === "word") speakMemoryWord(c.word, "en");
      } else if (state.mode === "english2") {
        const lang = c.side === "he" ? "he" : "en";
        if (sp === "both") speakMemoryWord(c.word, lang);
        else if (sp === "text" && c.side === "en") speakMemoryWord(c.word, "en");
      }
    }
  }

  if (state.flipped.length < 2) return;

  state.lock = true;
  state.moves += 1;
  updateStats();

  const [a, b] = state.flipped.map((fid) =>
    state.cards.find((c) => c.id === fid),
  );
  const match = isPairMatch(a ?? null, b ?? null);

  window.setTimeout(() => {
    if (!state) return;
    const scrollY = window.scrollY;
    if (match && a && b) {
      const pairIdx = state.matched.size / 2;
      state.matched.add(a.id);
      state.matched.add(b.id);
      state.matchPairByCardId.set(a.id, pairIdx);
      state.matchPairByCardId.set(b.id, pairIdx);
      [a.id, b.id].forEach(syncCardDom);
    }
    state.flipped = [];
    state.lock = false;
    renderBoard();
    updateStats();
    restoreViewportScrollAfterBoardRefresh(scrollY);
  }, match ? MATCH_PAUSE_MS : MISMATCH_PAUSE_MS);
}

/**
 * @param {string} id
 */
function syncCardDom(id) {
  if (!board || !state) return;
  const btn = board.querySelector(`button[data-id="${CSS.escape(id)}"]`);
  if (!(btn instanceof HTMLButtonElement)) return;
  const card = state.cards.find((c) => c.id === id);
  const up = state.flipped.includes(id) || state.matched.has(id);
  btn.classList.toggle("is-flipped", up);

  if (state.matched.has(id)) {
    btn.classList.add("is-matched");
    const pairIdx = state.matchPairByCardId.get(id);
    if (typeof pairIdx === "number") {
      const hue = MATCH_PAIR_HUES[pairIdx % MATCH_PAIR_HUES.length];
      btn.style.setProperty("--match-hue", String(hue));
    } else {
      btn.style.removeProperty("--match-hue");
    }
    btn.disabled = true;
    const label =
      card?.word ??
      (card?.label && String(card.label).trim()
        ? String(card.label)
        : card?.factKey ?? "");
    btn.setAttribute(
      "aria-label",
      card ? t("ariaMatched", { label }) : t("ariaMatchedUnknown"),
    );
    return;
  }

  btn.classList.remove("is-matched");
  btn.disabled = false;
  btn.style.removeProperty("--match-hue");

  if (up && (card?.symbol || card?.imageUrl) && card.word) {
    btn.setAttribute("aria-label", t("ariaPictureCard", { word: card.word }));
  } else if (up && card?.side === "he" && card.label) {
    btn.setAttribute("aria-label", String(card.label));
  } else if (up && card?.side === "en" && card.label) {
    btn.setAttribute("aria-label", String(card.label));
  } else if (up && card?.side === "diagram" && card.word) {
    btn.setAttribute("aria-label", t("ariaFractionPie", { word: card.word }));
  } else if (up && card?.side === "fraction" && card.label) {
    btn.setAttribute("aria-label", String(card.label));
  } else if (up && card?.label) {
    btn.setAttribute("aria-label", String(card.label));
  } else {
    btn.setAttribute("aria-label", t("ariaHiddenCard"));
  }
}

function formatLastPlayed(ts) {
  const n = typeof ts === "number" ? ts : typeof ts === "string" && ts.length ? Number(ts) : NaN;
  if (!Number.isFinite(n) || n <= 0) return t("adminNever");
  return new Date(n).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** Add player vs Continue: highlight the action that matches what the user is doing. */
function syncUserDialogButtonEmphasis() {
  if (!addUserBtn || !userDialogContinue) return;
  const typed = (newUserNameInput?.value ?? "").trim();
  const addFlow = typed.length >= 2;

  addUserBtn.classList.toggle("btn--primary", addFlow);
  addUserBtn.classList.toggle("btn--ghost", !addFlow);
  userDialogContinue.classList.toggle("btn--primary", !addFlow);
  userDialogContinue.classList.toggle("btn--ghost", addFlow);
}

function hideUserAddError() {
  if (userAddError) {
    userAddError.textContent = "";
    userAddError.classList.add("is-hidden");
  }
}

/** @param {string} message */
function showUserAddError(message) {
  if (!userAddError) return;
  userAddError.textContent = message;
  userAddError.classList.remove("is-hidden");
}

/** Kid-friendly avatars: pick a stable emoji + hue from the player's name so
 *  each player is visually recognizable without having to read. */
const AVATAR_EMOJIS = [
  "\u{1F436}", // dog
  "\u{1F431}", // cat
  "\u{1F98A}", // fox
  "\u{1F438}", // frog
  "\u{1F435}", // monkey
  "\u{1F981}", // lion
  "\u{1F43C}", // panda
  "\u{1F430}", // rabbit
  "\u{1F427}", // penguin
  "\u{1F984}", // unicorn
  "\u{1F422}", // turtle
  "\u{1F41D}", // bee
  "\u{1F419}", // octopus
  "\u{1F995}", // dino
  "\u{1F981}", // lion
  "\u{1F428}", // koala
];

/** @param {string} name @returns {number} */
function hashString(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** @param {string} name */
function avatarForName(name) {
  const h = hashString((name || "?").trim().toLowerCase());
  return {
    emoji: AVATAR_EMOJIS[h % AVATAR_EMOJIS.length],
    hue: h % 360,
  };
}

/** The players shown in the picker list (filtered to the account when signed in). */
function getDisplayedPickerUsers() {
  const uid = getAuthUserId();
  let users = listUsers();
  if (isAccountMode() && uid) {
    // Signed in with Google: the account is the only identity shown.
    users = users.filter((u) => u.authOwner === uid);
  }
  return users;
}

/**
 * Keep the dialog sections in sync with state:
 * - account mode hides the "add someone new" flow,
 * - the pick step (step 1) only appears when there is at least one player to pick.
 */
function syncUserDialogAccountMode() {
  const accountMode = isAccountMode();
  const hasPickable = getDisplayedPickerUsers().length > 0;
  if (userAddSection) userAddSection.classList.toggle("is-hidden", accountMode);
  if (userPickSection) userPickSection.classList.toggle("is-hidden", !hasPickable);
  if (userStepPickTitle) {
    userStepPickTitle.textContent = accountMode ? t("userAccountPlayer") : t("userStepPickTitle");
  }
  const addTitle = document.querySelector("#userStepAddTitle");
  if (addTitle) {
    // Without an existing list there is no "step 1", so the add flow stands alone.
    addTitle.textContent = hasPickable ? t("userStepAddTitle") : t("userStepAddTitleSolo");
  }
}

function renderUserPickerList() {
  if (!userListMount) return;
  userListMount.replaceChildren();
  const accountMode = isAccountMode();
  const uid = getAuthUserId();
  const users = getDisplayedPickerUsers();
  const curSlug = pendingUserSlug ?? getCurrentUser()?.slug ?? null;
  const canDelete = !accountMode && users.length > 1;
  for (const u of users) {
    const isAccountTile = accountMode && Boolean(uid) && u.authOwner === uid;
    const cell = document.createElement("div");
    cell.className = "user-pick-cell";
    cell.setAttribute("role", "listitem");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "user-pick";
    btn.dataset.slug = u.slug;
    if (u.slug === curSlug) btn.classList.add("is-selected");

    const avatar = document.createElement("span");
    avatar.className = "user-pick__avatar";
    avatar.setAttribute("aria-hidden", "true");
    if (isAccountTile) {
      // Google account: use the real profile photo (or a neutral initial),
      // never a random emoji avatar — those are for local players only.
      avatar.classList.add("user-pick__avatar--account");
      const photo = getAuthAvatarUrl();
      if (photo) {
        const img = document.createElement("img");
        img.src = photo;
        img.alt = "";
        img.referrerPolicy = "no-referrer";
        img.className = "user-pick__photo";
        avatar.append(img);
      } else {
        avatar.textContent = (u.name.trim()[0] || "?").toUpperCase();
      }
    } else {
      const { emoji, hue } = avatarForName(u.name);
      avatar.style.setProperty("--avatar-hue", String(hue));
      avatar.textContent = emoji;
    }

    const label = document.createElement("span");
    label.className = "user-pick__name";
    label.textContent = u.name;

    btn.append(avatar, label);
    btn.addEventListener("click", () => {
      pendingUserSlug = u.slug;
      if (newUserNameInput) newUserNameInput.value = "";
      hideUserAddError();
      renderUserPickerList();
      if (userDialogContinue) userDialogContinue.disabled = false;
    });
    cell.append(btn);

    if (canDelete) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "user-pick-delete";
      del.setAttribute("aria-label", t("ariaDeletePlayer", { name: u.name }));
      del.textContent = "\u00d7";
      del.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeUserFromPicker(u.slug);
      });
      cell.append(del);
    }

    userListMount.append(cell);
  }
  if (userDialogContinue) {
    userDialogContinue.disabled = !pendingUserSlug;
  }
  syncUserDialogAccountMode();
  syncUserDialogButtonEmphasis();
}

/** @param {string} slug */
async function removeUserFromPicker(slug) {
  const prevCurrent = getCurrentUser()?.slug ?? null;
  const res = removeUser(slug);
  if (!res.ok) {
    if (res.reason === "last") showUserAddError(t("userErrorLastPlayer"));
    if (res.reason === "storage") showUserAddError(t("userErrorStorage"));
    return;
  }
  if (isCloudSyncEnabled()) {
    if (addUserBtn) addUserBtn.disabled = true;
    if (userDialogContinue) userDialogContinue.disabled = true;
    try {
      const cloud = await commitPlayerListToCloud({ cancelSlug: slug, removed: res.removed });
      if (!cloud.ok) {
        const detail = cloud.failures.length ? cloud.failures.join(" · ").slice(0, 220) : "—";
        showUserAddError(t("userErrorCloudSync", { detail }));
      } else {
        hideUserAddError();
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.warn("[app] remove user cloud sync:", e);
      showUserAddError(t("userErrorCloudSync", { detail: detail.slice(0, 220) }));
    } finally {
      if (addUserBtn) addUserBtn.disabled = false;
      if (userDialogContinue) userDialogContinue.disabled = false;
    }
  } else {
    hideUserAddError();
  }
  if (pendingUserSlug === slug) {
    pendingUserSlug = getCurrentUser()?.slug ?? listUsers()[0]?.slug ?? null;
  }
  renderUserPickerList();
  if (booted && prevCurrent === slug) {
    cancelEnglishSpeech();
    refreshChrome();
    startGame("switch-user");
  } else {
    refreshChrome();
  }
}

function syncUserAddDisclaimerGate() {
  const accepted = hasAcceptedDisclaimer();
  const hint = document.querySelector("#disclaimerRequiredHint");
  if (newUserNameInput instanceof HTMLInputElement) {
    newUserNameInput.disabled = !accepted;
  }
  if (addUserBtn instanceof HTMLButtonElement) {
    addUserBtn.disabled = !accepted;
  }
  if (hint) hint.classList.toggle("is-hidden", accepted);
  const gate = document.querySelector("#disclaimerGate");
  if (gate) {
    // Once accepted, the agreement prompt has no reason to stay in this dialog.
    gate.classList.toggle("is-hidden", accepted);
    gate.classList.toggle("disclaimer-gate--locked", !accepted);
  }
}

function openUserPickerDialog() {
  if (isOnlineBoardActive()) return;
  closeSettingsMenu();
  refreshChrome();
  const users = listUsers();
  pendingUserSlug = getCurrentUser()?.slug ?? users[0]?.slug ?? null;
  hideUserAddError();
  renderUserPickerList();
  if (newUserNameInput) newUserNameInput.value = "";
  syncUserDialogButtonEmphasis();
  syncUserAddDisclaimerGate();
  userDialog?.showModal();
  if (!hasAcceptedDisclaimer() && users.length === 0) {
    openDisclaimerDialog("accept");
  }
}

function tryAddUser() {
  void tryAddUserAsync();
}

async function tryAddUserAsync() {
  hideUserAddError();
  if (!hasAcceptedDisclaimer()) {
    openDisclaimerDialog("accept");
    return;
  }
  const raw = newUserNameInput?.value ?? "";
  const result = addUser(raw);
  if (result.ok) {
    pendingUserSlug = result.user.slug;
    if (newUserNameInput) newUserNameInput.value = "";
    renderUserPickerList();
    if (userDialogContinue) userDialogContinue.disabled = false;
    if (isCloudSyncEnabled()) {
      if (addUserBtn) addUserBtn.disabled = true;
      try {
        const cloud = await commitPlayerListToCloud({});
        if (!cloud.ok) {
          const detail = cloud.failures.length ? cloud.failures.join(" · ").slice(0, 220) : "—";
          showUserAddError(t("userErrorCloudSync", { detail }));
        }
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.warn("[app] add user cloud sync:", e);
        showUserAddError(t("userErrorCloudSync", { detail: detail.slice(0, 220) }));
      } finally {
        if (addUserBtn) addUserBtn.disabled = false;
      }
    }
    return;
  }
  if (result.reason === "duplicate") showUserAddError(t("userErrorDuplicateName"));
  else if (result.reason === "storage") showUserAddError(t("userErrorStorage"));
  else showUserAddError(t("userErrorLengthName"));
}

function confirmUserChoice() {
  void confirmUserChoiceAsync();
}

async function confirmUserChoiceAsync() {
  if (!pendingUserSlug) return;
  const cont = userDialogContinue;
  try {
    if (isCloudSyncEnabled()) {
      if (cont) {
        cont.disabled = true;
        cont.textContent = t("userCloudSaving");
      }
      let cloud = { ok: true, failures: /** @type {string[]} */ ([]) };
      try {
        cloud = await commitPlayerListToCloud({});
      } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        console.warn("[app] confirm user cloud sync:", e);
        showUserAddError(t("userErrorCloudSync", { detail: detail.slice(0, 220) }));
        return;
      }
      if (!cloud.ok) {
        const detail = cloud.failures.length ? cloud.failures.join(" · ").slice(0, 220) : "—";
        showUserAddError(t("userErrorCloudSync", { detail }));
        syncUserDialogButtonEmphasis();
        return;
      }
      hideUserAddError();
    }
    clearAdminSession();
    if (!setCurrentUserSlug(pendingUserSlug)) {
      showUserAddError(t("userErrorStorage"));
      return;
    }
    userDialog?.close();
    document.body.classList.add("has-active-player");
    appRoot?.classList.remove("is-hidden");
    if (!booted) {
      refreshChrome();
      startGame("init");
    } else {
      cancelEnglishSpeech();
      refreshChrome();
      startGame("switch-user");
    }
  } finally {
    if (cont) {
      cont.textContent = t("userContinue");
      cont.disabled = !pendingUserSlug;
    }
    syncUserDialogButtonEmphasis();
  }
}

function updateAdminPasswordToggleLabel() {
  if (!adminPasswordToggle || !adminPasswordInput) return;
  const visible = adminPasswordInput.type === "text";
  adminPasswordToggle.textContent = t(visible ? "adminHidePassword" : "adminShowPassword");
  adminPasswordToggle.setAttribute("aria-pressed", visible ? "true" : "false");
  adminPasswordToggle.setAttribute(
    "aria-label",
    t(visible ? "adminHidePassword" : "adminShowPassword"),
  );
}

function setAdminPasswordVisible(visible) {
  if (!adminPasswordInput) return;
  adminPasswordInput.type = visible ? "text" : "password";
  updateAdminPasswordToggleLabel();
}

function resetAdminUnlockUI() {
  if (adminPasswordInput) adminPasswordInput.value = "";
  setAdminPasswordVisible(false);
  if (adminUnlockError) {
    adminUnlockError.textContent = "";
    adminUnlockError.classList.add("is-hidden");
  }
}

function openAdminUnlockDialog() {
  closeSettingsMenu();
  resetAdminUnlockUI();
  adminUnlockDialog?.showModal();
  queueMicrotask(() => adminPasswordInput?.focus());
}

async function submitAdminUnlock() {
  try {
    const pw = adminPasswordInput?.value ?? "";
    if (await tryUnlockAdminSession(pw)) {
      adminUnlockDialog?.close();
      await openAdminOverview();
    } else if (adminUnlockError) {
      adminUnlockError.textContent = t("adminBadPassword");
      adminUnlockError.classList.remove("is-hidden");
    }
  } catch (e) {
    console.warn("[app] admin unlock:", e);
    if (adminUnlockError) {
      adminUnlockError.textContent = t("adminUnlockFailed");
      adminUnlockError.classList.remove("is-hidden");
    }
  }
}

function buildAdminTableHeader(columnKeys) {
  if (!adminTableHead) return;
  adminTableHead.replaceChildren();
  const hr = document.createElement("tr");
  for (const key of columnKeys) {
    const th = document.createElement("th");
    th.textContent = t(key);
    hr.append(th);
  }
  adminTableHead.append(hr);
}

/** @param {null | { slug: string; name: string; lastPlayedAt?: number; remoteId?: string }} cur */
function renderAdminTableLocal(cur) {
  if (!adminTableBody) return;
  adminTableBody.replaceChildren();
  for (const u of listUsers()) {
    const st = loadRecordsForUser(u.slug);
    const total =
      st.math.gamesPlayed +
      st.sums.gamesPlayed +
      st.english1.gamesPlayed +
      st.english2.gamesPlayed +
      st.fractions.gamesPlayed;
    const tr = document.createElement("tr");
    const cells = [
      u.name + (cur?.slug === u.slug ? " *" : ""),
      formatLastPlayed(u.lastPlayedAt ?? null),
      String(total),
      formatDuration(st.math.bestTimeMs),
      formatDuration(st.sums.bestTimeMs),
      formatDuration(st.english1.bestTimeMs),
      formatDuration(st.english2.bestTimeMs),
      formatDuration(st.fractions.bestTimeMs),
    ];
    for (const text of cells) {
      const td = document.createElement("td");
      td.textContent = text;
      tr.append(td);
    }
    adminTableBody.append(tr);
  }
}

async function openAdminOverview() {
  closeSettingsMenu();
  refreshChrome();
  if (!adminTableHead || !adminTableBody || !adminDialog) return;

  const keys = [
    "adminColUser",
    "adminColLast",
    "adminColGames",
    "adminColMath",
    "adminColSums",
    "adminColEng1",
    "adminColEng2",
    "adminColFrac",
  ];

  buildAdminTableHeader(keys);
  adminDialog.showModal();
  renderAdminTableLocal(getCurrentUser());
}

initLocale();
applyAppBranding(t);
initDisclaimerUi({
  t,
  onAccepted: () => syncUserAddDisclaimerGate(),
  onGateChange: () => syncUserAddDisclaimerGate(),
});
initAboutUi({ t });

document.querySelector("#openDisclaimerFromUser")?.addEventListener("click", () => {
  openDisclaimerDialog(hasAcceptedDisclaimer() ? "view" : "accept");
});

initOnlinePlay({
  applyOnlineSnapshot,
  renderBoard,
  updateStats,
  getMode,
  readOnlineHostConfig: () => {
    const modeEl = document.querySelector("#onlineGameMode");
    const levelEl = document.querySelector("#onlineLevel");
    const mode = modeEl?.value ?? "math";
    const level = levelEl?.value ?? "easy";
    return buildOnlineHostConfig(
      /** @type {import('./multiplayer/online-deck.js').OnlineGameMode} */ (mode),
      /** @type {import('./multiplayer/online-deck.js').OnlineLevel} */ (level),
    );
  },
  t,
  hideWinActions,
  showOnlineWin,
  onExitOnline: () => {
    lastOnlineFlippedIds = [];
    startGame("restart");
  },
});
ensureUserRemoteIds();

// Phase 2: keep the account UI in sync with auth-state changes (sign in, sign
// out, or returning from a Google OAuth redirect), and apply/relax the
// account-as-player identity.
onAuthChange(() => {
  refreshAuthUI();
  syncUserDialogAccountMode();
  if (userDialog?.open) renderUserPickerList();
  void applyGoogleIdentityIfSignedIn();
});

if (getCurrentUser()) {
  document.body.classList.add("has-active-player");
  refreshChrome();
  startGame("init");
} else {
  document.body.classList.remove("has-active-player");
  appRoot?.classList.add("is-hidden");
  refreshChrome();
  queueMicrotask(() => openUserPickerDialog());
}

// Establish an auth session (anonymous by default). When signed in with Google,
// the account becomes the active player. No-op in local-only mode.
if (isCloudSyncEnabled()) {
  queueMicrotask(() => {
    void initAuth().then(async () => {
      refreshAuthUI();
      await applyGoogleIdentityIfSignedIn();
      void syncAllLocalUsersToCloud().then((r) => {
        if (!r.ok) console.warn("[cloud-sync] boot sync:", r.failures.join(" | "));
      });
    });
  });
}

userDialog?.addEventListener("cancel", (e) => {
  if (!getCurrentUser()) e.preventDefault();
});

openUserMenuBtn?.addEventListener("click", () => {
  if (openUserMenuBtn instanceof HTMLButtonElement && openUserMenuBtn.disabled) return;
  openUserPickerDialog();
});

settingsMenuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  setSettingsMenuOpen(!isSettingsMenuOpen());
});

settingsMenu?.addEventListener("click", (e) => {
  const el = e.target;
  if (!(el instanceof Element)) return;
  const btn = el.closest("button");
  if (!btn) return;
  // Theme toggle stays in-menu so the user can preview and switch back.
  if (btn.id === "themeToggle") return;
  closeSettingsMenu();
});

document.addEventListener("click", (e) => {
  if (!isSettingsMenuOpen()) return;
  const el = e.target;
  if (!(el instanceof Element)) return;
  if (el.closest(".settings-dropdown")) return;
  closeSettingsMenu();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && isSettingsMenuOpen()) {
    closeSettingsMenu();
    settingsMenuBtn?.focus();
  }
});

addUserBtn?.addEventListener("click", tryAddUser);

newUserNameInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    tryAddUser();
  }
});

newUserNameInput?.addEventListener("input", () => {
  hideUserAddError();
  syncUserDialogButtonEmphasis();
});

newUserNameInput?.addEventListener("focusin", () => {
  syncUserDialogButtonEmphasis();
});

userDialogContinue?.addEventListener("click", confirmUserChoice);

openAdminBtn?.addEventListener("click", () => {
  if (isAdminSessionUnlocked()) void openAdminOverview();
  else openAdminUnlockDialog();
});

adminUnlockForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  void submitAdminUnlock();
});

adminPasswordToggle?.addEventListener("click", () => {
  setAdminPasswordVisible(adminPasswordInput?.type !== "text");
});

adminUnlockCancel?.addEventListener("click", () => {
  adminUnlockDialog?.close();
});

adminUnlockDialog?.addEventListener("click", (e) => {
  if (e.target === adminUnlockDialog) adminUnlockDialog.close();
});

closeAdminBtn?.addEventListener("click", () => {
  adminDialog?.close();
});

adminDialog?.addEventListener("close", () => {
  refreshChrome();
});

adminDialog?.addEventListener("click", (e) => {
  if (e.target === adminDialog) adminDialog.close();
});

newGameBtn?.addEventListener("click", () => startGame("restart"));
restartDeckBtn?.addEventListener("click", () => restartSameDeck());
winNewGameBtn?.addEventListener("click", () => {
  if (state?.online && state.winHandled) void playOnlineAgain();
  else startGame("restart");
});
winRestartDeckBtn?.addEventListener("click", () => restartSameDeck());
pairCountSelect?.addEventListener("change", () => startGame("options"));
englishLevelSelect?.addEventListener("change", () => startGame("options"));
testMeBtn?.addEventListener("click", () => openQuiz());
closeQuizBtn?.addEventListener("click", () => closeQuiz());
dismissQuizBtn?.addEventListener("click", () => closeQuiz());
adminSpeedFinishBtn?.addEventListener("click", () => speedFinishGame());
onlineQuitBtn?.addEventListener("click", () => void quitOnlineGame());
onlinePlayAgainBtn?.addEventListener("click", () => void playOnlineAgain());
onlineLeaveAfterWinBtn?.addEventListener("click", () => void quitOnlineGame());
quizDialog?.addEventListener("close", () => {
  clearQuizAdvance();
  quizSession = null;
});
sumsLevelSelect?.addEventListener("change", () => startGame("options"));
mathLevelSelect?.addEventListener("change", () => startGame("options"));
fractionLevelSelect?.addEventListener("change", () => startGame("options"));
tableMaxSelect?.addEventListener("change", () => startGame("options"));
gameModeSelect?.addEventListener("change", () => startGame("options"));

/** @typedef {"light" | "dark" | "fun"} ThemeName */

/** @returns {ThemeName} The currently effective theme. */
function getEffectiveTheme() {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark" || explicit === "fun") return explicit;
  const prefersLight =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

/** @param {ThemeName} theme @returns {ThemeName} The next theme in the cycle. */
function nextTheme(theme) {
  const idx = THEME_ORDER.indexOf(theme);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
}

/** Follow OS theme changes only while the user hasn't made an explicit choice. */
if (typeof window.matchMedia === "function") {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      /* ignore */
    }
    if (saved === "light" || saved === "dark" || saved === "fun") return;
    document.documentElement.dataset.theme = e.matches ? "light" : "dark";
    updateThemeToggleLabel();
  });
}

/** @param {ThemeName} theme @returns {string} */
function themeLabel(theme) {
  if (theme === "light") return t("themeToLight");
  if (theme === "fun") return t("themeToFun");
  return t("themeToDark");
}

function updateThemeToggleLabel() {
  if (!themeToggleLabel) return;
  // Show the action: clicking switches to the NEXT theme in the cycle.
  themeToggleLabel.textContent = themeLabel(nextTheme(getEffectiveTheme()));
}

function toggleTheme() {
  const next = nextTheme(getEffectiveTheme());
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    /* ignore storage failures */
  }
  updateThemeToggleLabel();
}

/** Show/update the optional Google sign-in control based on auth + cloud state. */
function refreshAuthUI() {
  const signedIn = isCloudSyncEnabled() && isSignedIn();
  const email = signedIn ? getAuthEmail() : null;

  // Header account badge: visible only when signed in with a real account.
  appRoot?.classList.toggle("has-account-badge", Boolean(signedIn));
  if (accountBadge) {
    accountBadge.classList.toggle("is-hidden", !signedIn);
    if (signedIn) {
      const initial = (email || "?").trim().charAt(0).toUpperCase() || "?";
      if (accountBadgeInitial) accountBadgeInitial.textContent = initial;
      const label = email ? t("authSavedAs", { email }) : t("authSavedGeneric");
      accountBadge.setAttribute("aria-label", label);
      accountBadge.setAttribute("title", label);
    }
  }

  // Google option inside the "Who's playing?" dialog.
  if (userGoogleSection && userGoogleBtn) {
    if (!isCloudSyncEnabled()) {
      userGoogleSection.classList.add("is-hidden");
    } else {
      userGoogleSection.classList.remove("is-hidden");
      if (userGoogleOr) userGoogleOr.textContent = t("authOr");
      if (userGoogleHint) userGoogleHint.textContent = t("userGoogleHint");
      if (signedIn) {
        userGoogleBtn.textContent = t("authSignOut");
        if (userGoogleStatus) {
          userGoogleStatus.textContent = email
            ? t("authSavedAs", { email })
            : t("authSavedGeneric");
          userGoogleStatus.classList.remove("is-hidden");
        }
      } else {
        userGoogleBtn.textContent = t("authSignInGoogle");
        if (userGoogleStatus) {
          userGoogleStatus.textContent = "";
          userGoogleStatus.classList.add("is-hidden");
        }
      }
    }
  }
}

async function handleAuthButton() {
  if (!isCloudSyncEnabled()) return;
  userGoogleBtn?.setAttribute("disabled", "true");
  try {
    if (isSignedIn()) {
      await signOutAuth();
      refreshAuthUI();
      // Re-sync local players under the new (anonymous) session.
      if (isCloudSyncEnabled()) void syncAllLocalUsersToCloud();
    } else {
      // Triggers a full-page redirect to Google; nothing runs after on success.
      const res = await signInWithGoogle();
      if (!res.ok) {
        console.warn("[app] Google sign-in:", res.error);
      }
    }
  } finally {
    userGoogleBtn?.removeAttribute("disabled");
  }
}

let accountIdentityInFlight = false;

/** @returns {boolean} True when signed in with a real Google account + cloud on. */
function isAccountMode() {
  return isCloudSyncEnabled() && isSignedIn();
}

/**
 * When signed in with Google, make the account itself the active player:
 * ensure a single account-linked profile (adopting cloud stats if present),
 * select it, and hide local-only players.
 */
async function applyGoogleIdentityIfSignedIn() {
  if (!isAccountMode() || accountIdentityInFlight) return;
  const uid = getAuthUserId();
  if (!uid) return;
  accountIdentityInFlight = true;
  try {
    /** @type {{ id: string; display_name?: string; stats?: unknown; last_played_at?: number | null }[]} */
    let rows = [];
    try {
      rows = await fetchPlayersForOwner(uid);
    } catch (e) {
      console.warn("[cloud-sync] fetch account players:", e);
    }
    const name = getAuthDisplayName() || getAuthEmail() || "Player";
    const prevSlug = getCurrentUser()?.slug ?? null;
    const acct = ensureAccountPlayer(uid, name, rows);
    if (!acct) return;
    ensureUserRemoteIds();
    pendingUserSlug = acct.slug;
    refreshChrome();
    syncUserDialogAccountMode();
    if (userDialog?.open) {
      renderUserPickerList();
      if (userDialogContinue) userDialogContinue.disabled = false;
      // After Google sign-in (or first load while signed in), enter the game
      // automatically. Skip when the picker was opened mid-game (e.g. to sign out).
      const enteringFromPicker =
        !booted || !document.body.classList.contains("has-active-player");
      if (enteringFromPicker) {
        await confirmUserChoiceAsync();
        return;
      }
    }
    // Switch the board to the account player if we changed who is active.
    if (booted && prevSlug !== acct.slug && !isOnlineBoardActive()) {
      cancelEnglishSpeech();
      startGame("switch-user");
    }
    void syncAllLocalUsersToCloud();
  } finally {
    accountIdentityInFlight = false;
  }
}

/** @param {HTMLSelectElement | null} source */
function applyGameLocaleFromSelect(source) {
  const v = source?.value;
  if (v === "en" || v === "he") {
    setLocale(v);
    refreshChrome();
    if (booted) renderBoard();
  }
}

localeSelect?.addEventListener("change", () => {
  applyGameLocaleFromSelect(localeSelect);
  closeSettingsMenu();
});
userDialogLocale?.addEventListener("change", () => applyGameLocaleFromSelect(userDialogLocale));

themeToggleBtn?.addEventListener("click", () => {
  toggleTheme();
});

accountBadge?.addEventListener("click", (e) => {
  e.stopPropagation();
  closeSettingsMenu();
  openUserPickerDialog();
});

userGoogleBtn?.addEventListener("click", () => {
  void handleAuthButton();
});

openRecordsBtn?.addEventListener("click", openRecords);
closeRecordsBtn?.addEventListener("click", closeRecords);
emailRecordsBtn?.addEventListener("click", shareRecordsByEmail);
recordsDialog?.addEventListener("click", (e) => {
  if (e.target === recordsDialog) closeRecords();
});

window.setInterval(() => {
  if (state && state.clockStart !== null && !state.winHandled && elapsedEl) {
    elapsedEl.textContent = formatElapsed(Date.now() - state.clockStart);
  }
}, 250);
