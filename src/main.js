import "./style.css";
import {
  pickFacts,
  buildDeck,
  shuffle,
  isPairMatch,
} from "./game.js";
import {
  ENGLISH_LEXICON_KID,
  pickEnglishEntries,
  buildEnglishDeck,
} from "./english-game.js";
import { speakEnglishMemoryWord, cancelEnglishSpeech } from "./english-speech.js";
import {
  buildFractionPool,
  pickFractionEntries,
  buildFractionDeck,
  createPieSvg,
} from "./fraction-game.js";
import { buildSumPool, pickSumEntries, buildSumDeck } from "./sums-game.js";
import { initLocale, setLocale, getLocale, t, setPageTitleForMode } from "./i18n.js";
import {
  loadRecords,
  loadRecordsForUser,
  recordWin,
  recordAbandoned,
  formatDuration,
} from "./records.js";
import {
  listUsers,
  addUser,
  removeUser,
  setCurrentUserSlug,
  getCurrentUser,
  isAdminUser,
  ensureUserRemoteIds,
} from "./user-store.js";
import {
  isAdminSessionUnlocked,
  tryUnlockAdminSession,
  clearAdminSession,
} from "./admin-auth.js";
import {
  isCloudSyncEnabled,
  fetchAllPlayersForAdmin,
  syncAllLocalUsersToCloud,
  commitPlayerListToCloud,
  statsFromCloudRow,
} from "./cloud-sync.js";
import { armCelebrationAudio, celebrateWin } from "./celebrate.js";

const board = document.querySelector("#board");
const movesEl = document.querySelector("#moves");
const matchesEl = document.querySelector("#matches");
const elapsedEl = document.querySelector("#elapsed");
const winMessage = document.querySelector("#winMessage");
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
const openRecordsBtn = document.querySelector("#openRecords");
const recordsDialog = document.querySelector("#recordsDialog");
const closeRecordsBtn = document.querySelector("#closeRecords");
const emailRecordsBtn = document.querySelector("#emailRecords");
const gameTitle = document.querySelector("#gameTitle");
const gameTagline = document.querySelector("#gameTagline");
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
const userDialog = document.querySelector("#userDialog");
const userListMount = document.querySelector("#userListMount");
const newUserNameInput = document.querySelector("#newUserName");
const userAddError = document.querySelector("#userAddError");
const addUserBtn = document.querySelector("#addUserBtn");
const userDialogContinue = document.querySelector("#userDialogContinue");
const adminUnlockDialog = document.querySelector("#adminUnlockDialog");
const adminUnlockForm = document.querySelector("#adminUnlockForm");
const adminPasswordInput = document.querySelector("#adminPasswordInput");
const adminUnlockSubmit = document.querySelector("#adminUnlockSubmit");
const adminUnlockCancel = document.querySelector("#adminUnlockCancel");
const adminUnlockError = document.querySelector("#adminUnlockError");
const adminDialog = document.querySelector("#adminDialog");
const adminTableHead = document.querySelector("#adminTableHead");
const adminTableBody = document.querySelector("#adminTableBody");
const closeAdminBtn = document.querySelector("#closeAdmin");
const settingsMenuBtn = document.querySelector("#settingsMenuBtn");
const settingsMenu = document.querySelector("#settingsMenu");

/** @typedef {"math" | "sums" | "english" | "fractions"} GameMode */
/** @typedef {"easy" | "medium" | "hard"} EnglishLevel */
/** @typedef {"easy" | "medium" | "hard"} SumsLevel */
/** @typedef {"easy" | "medium" | "hard"} MathLevel */
/** @typedef {"easy" | "medium" | "hard"} FractionLevel */

/** @type {{ mode: GameMode; cards: any[]; flipped: string[]; matched: Set<string>; matchPairByCardId: Map<string, number>; moves: number; lock: boolean; clockStart: number | null; winHandled: boolean; englishSpeech?: "both" | "text" | "none" } | null} */
let state = null;

/** @type {string | null} */
let pendingUserSlug = null;

/** @type {Record<GameMode, string | null>} */
const lastSignature = { math: null, sums: null, english: null, fractions: null };

let booted = false;

/** @type {ReturnType<typeof setTimeout> | null} */
let winAutoRestartTimer = null;

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
  if (v === "english") return "english";
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
  const mode = getMode();
  setPageTitleForMode(mode);
  if (gameTitle) {
    if (mode === "english") gameTitle.textContent = t("titleEnglish");
    else if (mode === "fractions") gameTitle.textContent = t("titleFractions");
    else if (mode === "sums") gameTitle.textContent = t("titleSums");
    else gameTitle.textContent = t("titleMath");
  }
  if (gameTagline) {
    if (mode === "english") gameTagline.textContent = t("taglineEnglish");
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
  if (labelMoves) labelMoves.textContent = t("moves");
  if (labelMatches) labelMatches.textContent = t("matches");
  if (labelTime) labelTime.textContent = t("time");
  if (newGameBtn) newGameBtn.textContent = t("newGame");
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
  if (lnu) lnu.textContent = t("labelNewUser");
  if (addUserBtn) addUserBtn.textContent = t("addUser");
  if (userDialogContinue) userDialogContinue.textContent = t("userContinue");
  if (adt) adt.textContent = t("adminDialogTitle");
  if (adh) adh.textContent = t(isCloudSyncEnabled() ? "adminDialogHintCloud" : "adminDialogHint");
  if (closeAdminBtn) closeAdminBtn.textContent = t("closeAdmin");
  const aut = document.querySelector("#adminUnlockTitle");
  const auh = document.querySelector("#adminUnlockHint");
  const lap = document.querySelector("#labelAdminPassword");
  if (aut) aut.textContent = t("adminUnlockTitle");
  if (auh) auh.textContent = t("adminUnlockHint");
  if (lap) lap.textContent = t("labelAdminPassword");
  if (adminUnlockCancel) adminUnlockCancel.textContent = t("adminUnlockCancel");
  if (adminUnlockSubmit) adminUnlockSubmit.textContent = t("adminUnlockSubmit");

  if (gameModeSelect) {
    gameModeSelect.setAttribute("aria-label", t("ariaGameMode"));
    const opts = gameModeSelect.querySelectorAll("option");
    if (opts[0]) opts[0].textContent = t("modeEnglish");
    if (opts[1]) opts[1].textContent = t("modeSums");
    if (opts[2]) opts[2].textContent = t("modeMath");
    if (opts[3]) opts[3].textContent = t("modeFractions");
  }

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
      mode === "english" || mode === "sums" || mode === "math" || mode === "fractions",
    );
  }
  if (englishLevelField) englishLevelField.classList.toggle("is-hidden", mode !== "english");
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
      mode === "english" || mode === "sums" || mode === "math" || mode === "fractions",
    );
  }

  refreshRecordsLabels();
}

function refreshRecordsLabels() {
  const title = document.querySelector("#recordsTitle");
  const hMath = document.querySelector("#recordsHeadingMath");
  const hSums = document.querySelector("#recordsHeadingSums");
  const hEng = document.querySelector("#recordsHeadingEnglish");
  const hFrac = document.querySelector("#recordsHeadingFractions");
  const close = document.querySelector("#closeRecords");
  if (title) title.textContent = t("recordsTitle");
  if (hMath) hMath.textContent = t("recordsMath");
  if (hSums) hSums.textContent = t("recordsSums");
  if (hEng) hEng.textContent = t("recordsEnglish");
  if (hFrac) hFrac.textContent = t("recordsFractions");
  if (close) close.textContent = t("recordsClose");
  for (const [id, key] of [
    ["#recMathBestLabel", "recordsBestTime"],
    ["#recMathWonLabel", "recordsWon"],
    ["#recMathPlayedLabel", "recordsPlayed"],
    ["#recSumsBestLabel", "recordsBestTime"],
    ["#recSumsWonLabel", "recordsWon"],
    ["#recSumsPlayedLabel", "recordsPlayed"],
    ["#recEngBestLabel", "recordsBestTime"],
    ["#recEngWonLabel", "recordsWon"],
    ["#recEngPlayedLabel", "recordsPlayed"],
    ["#recFracBestLabel", "recordsBestTime"],
    ["#recFracWonLabel", "recordsWon"],
    ["#recFracPlayedLabel", "recordsPlayed"],
  ]) {
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
  const eBest = document.querySelector("#recEngBest");
  const eWon = document.querySelector("#recEngWon");
  const ePlayed = document.querySelector("#recEngPlayed");
  const fBest = document.querySelector("#recFracBest");
  const fWon = document.querySelector("#recFracWon");
  const fPlayed = document.querySelector("#recFracPlayed");
  if (mMath) mMath.textContent = formatDuration(data.math.bestTimeMs);
  if (mWon) mWon.textContent = String(data.math.gamesWon);
  if (mPlayed) mPlayed.textContent = String(data.math.gamesPlayed);
  if (sBest) sBest.textContent = formatDuration(data.sums.bestTimeMs);
  if (sWon) sWon.textContent = String(data.sums.gamesWon);
  if (sPlayed) sPlayed.textContent = String(data.sums.gamesPlayed);
  if (eBest) eBest.textContent = formatDuration(data.english.bestTimeMs);
  if (eWon) eWon.textContent = String(data.english.gamesWon);
  if (ePlayed) ePlayed.textContent = String(data.english.gamesPlayed);
  if (fBest) fBest.textContent = formatDuration(data.fractions.bestTimeMs);
  if (fWon) fWon.textContent = String(data.fractions.gamesWon);
  if (fPlayed) fPlayed.textContent = String(data.fractions.gamesPlayed);
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
  /** @param {"math" | "sums" | "english" | "fractions"} mode */
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
  const lines = [
    t("emailRecordsIntro", { name: getCurrentUser()?.name || t("userPlayingAs") }),
    "",
    ...block("recordsMath", "math"),
    ...block("recordsSums", "sums"),
    ...block("recordsEnglish", "english"),
    ...block("recordsFractions", "fractions"),
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
  if (mode === "english") {
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
 * @param {"init" | "restart" | "options" | "switch-user"} source
 */
function startGame(source) {
  cancelEnglishSpeech();
  clearWinAutoRestart();
  const prev = state;
  const mode = getMode();

  if (booted && prev && prev.matched.size < prev.cards.length) {
    const touched =
      prev.moves > 0 || prev.matched.size > 0 || prev.clockStart !== null;
    if (touched && source !== "init" && source !== "switch-user") {
      recordAbandoned(prev.mode);
    }
  }

  const rng = randomUnit;
  /** @type {any[]} */
  let cards = [];
  let signature = "";
  /** @type {"both" | "text" | "none" | undefined} */
  let englishSpeech;

  if (mode === "math") {
    const { pairCount, tableMax, mathLevel } = readOptions();
    const maxPairs = (tableMax * (tableMax + 1)) / 2;
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
    cards = shuffle(buildDeck(facts, rng), rng);
  } else if (mode === "sums") {
    const { pairCount, maxNumber, sumsLevel } = readOptions();
    const pool = buildSumPool(maxNumber);
    const maxPairs = pool.length;
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
    cards = shuffle(buildSumDeck(entries, rng), rng);
  } else if (mode === "english") {
    const { pairCount, englishLevel, englishSpeech: es } = readOptions();
    englishSpeech = es;
    const maxPairs = ENGLISH_LEXICON_KID.length;
    const count = Math.min(pairCount, maxPairs);
    let entries = pickEnglishEntries(ENGLISH_LEXICON_KID, count, rng);
    signature =
      `${englishLevel}\0` + [...entries].map((e) => e.key).sort().join("\0");
    let tries = 0;
    while (
      lastSignature.english !== null &&
      signature === lastSignature.english &&
      tries < 64 &&
      count < maxPairs
    ) {
      entries = pickEnglishEntries(ENGLISH_LEXICON_KID, count, rng);
      signature =
        `${englishLevel}\0` + [...entries].map((e) => e.key).sort().join("\0");
      tries += 1;
    }
    lastSignature.english = signature;
    cards = shuffle(buildEnglishDeck(entries), rng);
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
    cards = shuffle(buildFractionDeck(entries), rng);
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
  };

  if (winMessage) {
    if (mode === "english") winMessage.textContent = t("winEnglish");
    else if (mode === "fractions") winMessage.textContent = t("winFractions");
    else if (mode === "sums") winMessage.textContent = t("winSums");
    else winMessage.textContent = t("winMath");
    winMessage.hidden = true;
  }
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

function updateStats() {
  if (!state) return;
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

  if (matchedPairs === totalPairs && winMessage) {
    winMessage.hidden = false;
    if (!state.winHandled) {
      state.winHandled = true;
      celebrateWin();
      const elapsed =
        state.clockStart !== null ? Date.now() - state.clockStart : null;
      if (elapsed !== null && elapsed > 0) {
        recordWin(state.mode, elapsed);
      }
      clearWinAutoRestart();
      winAutoRestartTimer = window.setTimeout(() => {
        winAutoRestartTimer = null;
        if (!state) return;
        const tp = state.cards.length / 2;
        if (state.matched.size / 2 !== tp) return;
        startGame("restart");
      }, 1000);
    }
  }
}

function renderBoard() {
  if (!board || !state) return;
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
    back.textContent = "?";
    back.setAttribute("aria-hidden", "true");

    const front = document.createElement("span");
    front.className = "card-face card-face--front";
    const pieN = card.n ?? card.num;
    const pieD = card.d ?? card.den;
    if (card.side === "diagram" && pieN != null && pieD != null) {
      front.classList.add("card-face--diagram");
      front.append(createPieSvg(pieN, pieD));
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
    } else if (isUp && card.imageUrl && card.word) {
      btn.setAttribute("aria-label", t("ariaPictureCard", { word: card.word }));
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

  armCelebrationAudio();

  if (state.clockStart === null) {
    state.clockStart = Date.now();
  }

  state.flipped.push(id);
  syncCardDom(id);
  if (state.mode === "english") {
    const c = state.cards.find((x) => x.id === id);
    const sp = state.englishSpeech;
    if (c?.word?.trim()) {
      if (sp === "both") speakEnglishMemoryWord(c.word);
      else if (sp === "text" && c.side === "word") speakEnglishMemoryWord(c.word);
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
  const up = state.flipped.includes(id) || state.matched.has(id);
  btn.classList.toggle("is-flipped", up);
  const card = state.cards.find((c) => c.id === id);
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
  } else if (up && card?.imageUrl && card.word) {
    btn.setAttribute("aria-label", t("ariaPictureCard", { word: card.word }));
  } else if (up && card?.side === "diagram" && card.word) {
    btn.setAttribute("aria-label", t("ariaFractionPie", { word: card.word }));
  } else if (up && card?.side === "fraction" && card.label) {
    btn.setAttribute("aria-label", String(card.label));
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

function renderUserPickerList() {
  if (!userListMount) return;
  userListMount.replaceChildren();
  const users = listUsers();
  const curSlug = pendingUserSlug ?? getCurrentUser()?.slug ?? null;
  const canDelete = users.length > 1;
  for (const u of users) {
    const row = document.createElement("div");
    row.className = "user-pick-row";
    row.setAttribute("role", "listitem");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "user-pick";
    btn.textContent = u.name;
    btn.dataset.slug = u.slug;
    if (u.slug === curSlug) btn.classList.add("is-selected");
    btn.addEventListener("click", () => {
      pendingUserSlug = u.slug;
      if (newUserNameInput) newUserNameInput.value = "";
      hideUserAddError();
      renderUserPickerList();
      if (userDialogContinue) userDialogContinue.disabled = false;
    });
    row.append(btn);

    if (canDelete) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn user-pick-delete";
      del.setAttribute("aria-label", t("ariaDeletePlayer", { name: u.name }));
      del.textContent = "\u00d7";
      del.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        removeUserFromPicker(u.slug);
      });
      row.append(del);
    }

    userListMount.append(row);
  }
  if (userDialogContinue) {
    userDialogContinue.disabled = !pendingUserSlug;
  }
  syncUserDialogButtonEmphasis();
}

/** @param {string} slug */
async function removeUserFromPicker(slug) {
  const prevCurrent = getCurrentUser()?.slug ?? null;
  const res = removeUser(slug);
  if (!res.ok) {
    if (res.reason === "last") showUserAddError(t("userErrorLastPlayer"));
    return;
  }
  if (isCloudSyncEnabled()) {
    if (addUserBtn) addUserBtn.disabled = true;
    if (userDialogContinue) userDialogContinue.disabled = true;
    const cloud = await commitPlayerListToCloud({ cancelSlug: slug, removed: res.removed });
    if (addUserBtn) addUserBtn.disabled = false;
      if (!cloud.ok) {
      const detail = cloud.failures.length ? cloud.failures.join(" · ").slice(0, 220) : "—";
      showUserAddError(t("userErrorCloudSync", { detail }));
    } else {
      hideUserAddError();
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

function openUserPickerDialog() {
  closeSettingsMenu();
  refreshChrome();
  const users = listUsers();
  pendingUserSlug = getCurrentUser()?.slug ?? users[0]?.slug ?? null;
  hideUserAddError();
  renderUserPickerList();
  if (newUserNameInput) newUserNameInput.value = "";
  syncUserDialogButtonEmphasis();
  userDialog?.showModal();
}

function tryAddUser() {
  void tryAddUserAsync();
}

async function tryAddUserAsync() {
  hideUserAddError();
  const raw = newUserNameInput?.value ?? "";
  const result = addUser(raw);
  if (result.ok) {
    pendingUserSlug = result.user.slug;
    if (newUserNameInput) newUserNameInput.value = "";
    renderUserPickerList();
    if (userDialogContinue) userDialogContinue.disabled = false;
    if (isCloudSyncEnabled()) {
      if (addUserBtn) addUserBtn.disabled = true;
      const cloud = await commitPlayerListToCloud({});
      if (addUserBtn) addUserBtn.disabled = false;
      if (!cloud.ok) {
        const detail = cloud.failures.length ? cloud.failures.join(" · ").slice(0, 220) : "—";
        showUserAddError(t("userErrorCloudSync", { detail }));
      }
    }
    return;
  }
  if (result.reason === "duplicate") showUserAddError(t("userErrorDuplicateName"));
  else showUserAddError(t("userErrorLengthName"));
}

function confirmUserChoice() {
  void confirmUserChoiceAsync();
}

async function confirmUserChoiceAsync() {
  if (!pendingUserSlug) return;
  const cont = userDialogContinue;
  if (isCloudSyncEnabled()) {
    if (cont) {
      cont.disabled = true;
      cont.textContent = t("userCloudSaving");
    }
    const cloud = await commitPlayerListToCloud({});
    if (cont) {
      cont.textContent = t("userContinue");
      cont.disabled = !pendingUserSlug;
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
  setCurrentUserSlug(pendingUserSlug);
  userDialog?.close();
  appRoot?.classList.remove("is-hidden");
  if (!booted) {
    refreshChrome();
    startGame("init");
  } else {
    cancelEnglishSpeech();
    refreshChrome();
    startGame("switch-user");
  }
}

function resetAdminUnlockUI() {
  if (adminPasswordInput) adminPasswordInput.value = "";
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
  const pw = adminPasswordInput?.value ?? "";
  if (await tryUnlockAdminSession(pw)) {
    adminUnlockDialog?.close();
    await openAdminOverview();
  } else if (adminUnlockError) {
    adminUnlockError.textContent = t("adminBadPassword");
    adminUnlockError.classList.remove("is-hidden");
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
      st.english.gamesPlayed +
      st.fractions.gamesPlayed;
    const tr = document.createElement("tr");
    const cells = [
      u.name + (cur?.slug === u.slug ? " *" : ""),
      formatLastPlayed(u.lastPlayedAt ?? null),
      String(total),
      formatDuration(st.math.bestTimeMs),
      formatDuration(st.sums.bestTimeMs),
      formatDuration(st.english.bestTimeMs),
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

/**
 * @param {{ id: string; device_id: string; display_name: string; stats: unknown; last_played_at: unknown }} row
 * @param {null | { remoteId?: string }} cur
 */
function appendCloudPlayerRow(row, cur) {
  if (!adminTableBody) return;
  const st = statsFromCloudRow(row.stats);
  const total =
    st.math.gamesPlayed +
    st.sums.gamesPlayed +
    st.english.gamesPlayed +
    st.fractions.gamesPlayed;
  const rawLast = row.last_played_at;
  const lastNum =
    typeof rawLast === "number"
      ? rawLast
      : rawLast != null && String(rawLast).length
        ? Number(rawLast)
        : NaN;
  const name = row.display_name + (cur?.remoteId === row.id ? " *" : "");
  const did = row.device_id || "";
  const devShort = did.length > 8 ? `${did.slice(0, 8)}…` : did;
  const cells = [
    name,
    devShort,
    formatLastPlayed(Number.isFinite(lastNum) ? lastNum : null),
    String(total),
    formatDuration(st.math.bestTimeMs),
    formatDuration(st.sums.bestTimeMs),
    formatDuration(st.english.bestTimeMs),
    formatDuration(st.fractions.bestTimeMs),
  ];
  const tr = document.createElement("tr");
  for (const text of cells) {
    const td = document.createElement("td");
    td.textContent = text;
    tr.append(td);
  }
  adminTableBody.append(tr);
}

async function openAdminOverview() {
  closeSettingsMenu();
  refreshChrome();
  if (!adminTableHead || !adminTableBody || !adminDialog) return;

  const cloud = isCloudSyncEnabled();
  const keys = cloud
    ? [
        "adminColUser",
        "adminColDevice",
        "adminColLast",
        "adminColGames",
        "adminColMath",
        "adminColSums",
        "adminColEng",
        "adminColFrac",
      ]
    : [
        "adminColUser",
        "adminColLast",
        "adminColGames",
        "adminColMath",
        "adminColSums",
        "adminColEng",
        "adminColFrac",
      ];

  buildAdminTableHeader(keys);
  adminTableBody.replaceChildren();
  adminDialog.showModal();

  const cur = getCurrentUser();

  if (cloud) {
    const loadingTr = document.createElement("tr");
    const loadingTd = document.createElement("td");
    loadingTd.colSpan = keys.length;
    loadingTd.textContent = t("adminLoadingCloud");
    loadingTr.append(loadingTd);
    adminTableBody.append(loadingTr);

    try {
      ensureUserRemoteIds();
      const syncResult = await syncAllLocalUsersToCloud();
      if (!syncResult.ok) {
        console.warn("[cloud-sync] admin pre-fetch sync:", syncResult.failures.join(" | "));
      }
      const rows = await fetchAllPlayersForAdmin();
      adminTableBody.replaceChildren();
      if (!rows.length) {
        const er = document.createElement("tr");
        const ec = document.createElement("td");
        ec.colSpan = keys.length;
        ec.textContent = t("adminCloudEmpty");
        er.append(ec);
        adminTableBody.append(er);
      } else {
        for (const row of rows) {
          appendCloudPlayerRow(row, cur);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      buildAdminTableHeader([
        "adminColUser",
        "adminColLast",
        "adminColGames",
        "adminColMath",
        "adminColSums",
        "adminColEng",
        "adminColFrac",
      ]);
      adminTableBody.replaceChildren();
      const er = document.createElement("tr");
      const ec = document.createElement("td");
      ec.colSpan = 8;
      ec.textContent = t("adminCloudError", { message: msg });
      er.append(ec);
      adminTableBody.append(er);
      renderAdminTableLocal(cur);
    }
  } else {
    renderAdminTableLocal(cur);
  }
}

initLocale();
ensureUserRemoteIds();

if (getCurrentUser()) {
  refreshChrome();
  startGame("init");
  if (isCloudSyncEnabled()) {
    queueMicrotask(() => {
      void syncAllLocalUsersToCloud().then((r) => {
        if (!r.ok) console.warn("[cloud-sync] boot sync:", r.failures.join(" | "));
      });
    });
  }
} else {
  appRoot?.classList.add("is-hidden");
  refreshChrome();
  queueMicrotask(() => openUserPickerDialog());
}

userDialog?.addEventListener("cancel", (e) => {
  if (!getCurrentUser()) e.preventDefault();
});

openUserMenuBtn?.addEventListener("click", () => {
  openUserPickerDialog();
});

settingsMenuBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  setSettingsMenuOpen(!isSettingsMenuOpen());
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
pairCountSelect?.addEventListener("change", () => startGame("options"));
englishLevelSelect?.addEventListener("change", () => startGame("options"));
sumsLevelSelect?.addEventListener("change", () => startGame("options"));
mathLevelSelect?.addEventListener("change", () => startGame("options"));
fractionLevelSelect?.addEventListener("change", () => startGame("options"));
tableMaxSelect?.addEventListener("change", () => startGame("options"));
gameModeSelect?.addEventListener("change", () => startGame("options"));

/** @param {HTMLSelectElement | null} source */
function applyGameLocaleFromSelect(source) {
  const v = source?.value;
  if (v === "en" || v === "he") {
    setLocale(v);
    refreshChrome();
    if (booted) renderBoard();
  }
}

localeSelect?.addEventListener("change", () => applyGameLocaleFromSelect(localeSelect));
userDialogLocale?.addEventListener("change", () => applyGameLocaleFromSelect(userDialogLocale));

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
