import { isCloudSyncEnabled } from "./cloud-sync.js";
import {
  startOnlineHost,
  joinOnlineGuest,
  leaveOnlineSession,
  getActiveOnlineSession,
  isOnlinePlaying,
  forfeitOnlineGame,
  requestRematchOnlineGame,
} from "./multiplayer/online-session.js";
import {
  buildInviteUrl,
  normalizeRoomCode,
  roomCodeFromLocation,
  clearRoomFromLocation,
} from "./multiplayer/room-code.js";
import { celebrateWin } from "./celebrate.js";

let onlineWinShown = false;

/** @typedef {'start' | 'join' | null} OnlineMode */

/**
 * @typedef {Object} OnlineUiDeps
 * @property {(snap: import('./multiplayer/protocol.js').OnlineStateSnapshot, cards: unknown[]) => void} applyOnlineSnapshot
 * @property {() => void} renderBoard
 * @property {() => void} updateStats
 * @property {() => import('./multiplayer/online-deck.js').OnlineHostConfig} readOnlineHostConfig
 * @property {(key: string, vars?: Record<string, string>) => string} t
 * @property {() => void} hideWinActions
 * @property {(message: string) => void} showOnlineWin
 * @property {() => void} onExitOnline
 */

/** @type {OnlineUiDeps | null} */
let deps = null;

const onlineDialog = document.querySelector("#onlineDialog");
const onlineStatus = document.querySelector("#onlineStatus");
const onlineModeStart = document.querySelector("#onlineModeStart");
const onlineModeJoin = document.querySelector("#onlineModeJoin");
const onlineHostArea = document.querySelector("#onlineHostArea");
const onlineHostSetup = document.querySelector("#onlineHostSetup");
const onlineHostReady = document.querySelector("#onlineHostReady");
const onlineJoinArea = document.querySelector("#onlineJoinArea");
const onlineRoomCode = document.querySelector("#onlineRoomCode");
const onlineRoomInput = document.querySelector("#onlineRoomInput");
const onlineShareCode = document.querySelector("#onlineShareCode");
const onlineJoinBtn = document.querySelector("#onlineJoinBtn");
const onlineCreateRoom = document.querySelector("#onlineCreateRoom");
const onlineChangeGame = document.querySelector("#onlineChangeGame");
const onlineGameMode = document.querySelector("#onlineGameMode");
const onlineLevel = document.querySelector("#onlineLevel");
const openPlayOnlineBtn = document.querySelector("#openPlayOnline");
const gameToolbar = document.querySelector(".toolbar--game");
const onlineRematchStatus = document.querySelector("#onlineRematchStatus");
const onlinePlayAgainBtn = document.querySelector("#onlinePlayAgain");

/** @type {OnlineMode} */
let onlineMode = null;

/** @type {string | null} */
let hostRoomId = null;

let onlineBusy = false;

let exitingOnline = false;

/**
 * @param {OnlineUiDeps} d
 */
export function initOnlinePlay(d) {
  deps = d;

  openPlayOnlineBtn?.addEventListener("click", () => openOnlineDialog());
  onlineModeStart?.addEventListener("click", () => void selectStartMode());
  onlineModeJoin?.addEventListener("click", () => void selectJoinMode());
  onlineCreateRoom?.addEventListener("click", () => void createHostRoom());
  onlineChangeGame?.addEventListener("click", () => void resetHostRoom());
  onlineShareCode?.addEventListener("click", () => void shareRoomCode());
  onlineJoinBtn?.addEventListener("click", () => void joinOnline());
  document.querySelector("#dismissOnline")?.addEventListener("click", () => void closeOnlineDialog());

  onlineRoomInput?.addEventListener("input", () => {
    if (onlineRoomInput instanceof HTMLInputElement) {
      onlineRoomInput.value = onlineRoomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
    syncOnlineControls();
  });

  onlineRoomInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && onlineJoinBtn && !onlineJoinBtn.disabled) {
      e.preventDefault();
      void joinOnline();
    }
  });

  const fromUrl = roomCodeFromLocation();
  if (fromUrl && isCloudSyncEnabled()) {
    clearRoomFromLocation();
    queueMicrotask(() => void autoJoinFromInvite(fromUrl));
  }
}

function isJoinCodeReady() {
  const raw = onlineRoomInput instanceof HTMLInputElement ? onlineRoomInput.value : "";
  const code = normalizeRoomCode(raw);
  return code != null && code.length >= 4;
}

function setMainToolbarLocked(locked) {
  if (gameToolbar instanceof HTMLElement) {
    gameToolbar.classList.toggle("is-locked", locked);
    if (locked) gameToolbar.setAttribute("inert", "");
    else gameToolbar.removeAttribute("inert");
  }
}

function syncHostPanels() {
  const isStart = onlineMode === "start";
  const hasRoom = Boolean(hostRoomId);
  if (onlineHostSetup) onlineHostSetup.hidden = !isStart || hasRoom;
  if (onlineHostReady) onlineHostReady.hidden = !isStart || !hasRoom;
}

function syncOnlineControls() {
  const isStart = onlineMode === "start";
  const isJoin = onlineMode === "join";
  const busy = onlineBusy;

  if (onlineModeStart instanceof HTMLButtonElement) {
    onlineModeStart.disabled = busy;
    onlineModeStart.classList.toggle("btn--primary", isStart);
    onlineModeStart.classList.toggle("btn--ghost", !isStart);
    onlineModeStart.classList.toggle("is-active", isStart);
    onlineModeStart.setAttribute("aria-pressed", String(isStart));
  }

  if (onlineModeJoin instanceof HTMLButtonElement) {
    onlineModeJoin.disabled = busy;
    onlineModeJoin.classList.toggle("btn--primary", isJoin);
    onlineModeJoin.classList.toggle("btn--ghost", !isJoin);
    onlineModeJoin.classList.toggle("is-active", isJoin);
    onlineModeJoin.setAttribute("aria-pressed", String(isJoin));
  }

  if (onlineHostArea) onlineHostArea.hidden = !isStart;
  if (onlineJoinArea) onlineJoinArea.hidden = !isJoin;

  syncHostPanels();

  if (onlineGameMode instanceof HTMLSelectElement) {
    onlineGameMode.disabled = !isStart || busy || Boolean(hostRoomId);
  }
  if (onlineLevel instanceof HTMLSelectElement) {
    onlineLevel.disabled = !isStart || busy || Boolean(hostRoomId);
  }
  if (onlineCreateRoom instanceof HTMLButtonElement) {
    onlineCreateRoom.disabled = !isStart || busy || Boolean(hostRoomId);
  }
  if (onlineChangeGame instanceof HTMLButtonElement) {
    onlineChangeGame.disabled = !isStart || busy || !hostRoomId;
  }

  if (onlineRoomInput instanceof HTMLInputElement) {
    onlineRoomInput.disabled = !isJoin || busy;
  }

  if (onlineJoinBtn instanceof HTMLButtonElement) {
    onlineJoinBtn.disabled = !isJoin || busy || !isJoinCodeReady();
  }

  if (onlineShareCode instanceof HTMLButtonElement) {
    onlineShareCode.disabled = !isStart || busy || !hostRoomId;
  }
}

function resetOnlineDialog() {
  hostRoomId = null;
  onlineMode = null;
  onlineBusy = false;
  if (onlineRoomInput instanceof HTMLInputElement) onlineRoomInput.value = "";
  if (onlineRoomCode) onlineRoomCode.textContent = "";
  setOnlineStatus("");
  syncOnlineControls();
}

export function refreshOnlineLabels() {
  if (!deps) return;
  const t = deps.t;
  const title = document.querySelector("#onlineDialogTitle");
  const lead = document.querySelector("#onlineDialogLead");
  const labelGame = document.querySelector("#labelOnlineGameMode");
  const labelLevel = document.querySelector("#labelOnlineLevel");
  const tellFriend = document.querySelector("#onlineTellFriend");
  const tellFriendOr = document.querySelector("#onlineTellFriendOr");
  const joinHint = document.querySelector("#onlineJoinHint");
  const dismiss = document.querySelector("#dismissOnline");
  if (title) title.textContent = t("onlineTitle");
  if (lead) lead.textContent = t("onlineLead");
  if (onlineModeStart) onlineModeStart.textContent = t("onlineStart");
  if (onlineModeJoin) onlineModeJoin.textContent = t("onlineJoinTab");
  if (labelGame) labelGame.textContent = t("gameType");
  if (labelLevel) labelLevel.textContent = t("onlineLevelLabel");
  if (onlineCreateRoom) onlineCreateRoom.textContent = t("onlineCreateRoom");
  if (tellFriend) tellFriend.textContent = t("onlineTellFriend");
  if (tellFriendOr) tellFriendOr.textContent = t("onlineTellFriendOr");
  if (onlineShareCode) onlineShareCode.textContent = t("onlineShareCode");
  if (onlineChangeGame) onlineChangeGame.textContent = t("onlineChangeGame");
  if (joinHint) joinHint.textContent = t("onlineJoinHint");
  if (onlineJoinBtn) onlineJoinBtn.textContent = t("onlineJoinGo");
  if (dismiss) dismiss.setAttribute("aria-label", t("ariaCloseOnline"));
  if (openPlayOnlineBtn) {
    openPlayOnlineBtn.textContent = t("onlinePlay");
    openPlayOnlineBtn.classList.toggle("is-hidden", !isCloudSyncEnabled());
  }

  if (onlineGameMode) {
    for (const opt of onlineGameMode.options) {
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

  refreshOnlineLevelOptions();
}

/**
 * @param {string} key
 */
function setOnlineStatus(key) {
  if (!onlineStatus || !deps) return;
  onlineStatus.textContent = key ? deps.t(key) : "";
}

function resetRematchUi() {
  if (onlineRematchStatus) {
    onlineRematchStatus.textContent = "";
    onlineRematchStatus.classList.add("is-hidden");
  }
  if (onlinePlayAgainBtn instanceof HTMLButtonElement) {
    onlinePlayAgainBtn.disabled = false;
    onlinePlayAgainBtn.textContent = deps?.t("onlinePlayAgain") ?? "Play again with friend";
  }
}

/**
 * @param {{ selfReady?: boolean; peerReady?: boolean; waitingForPeer?: boolean; bothReady?: boolean; peerLeft?: boolean }} status
 */
function refreshRematchUi(status) {
  if (!deps) return;
  const t = deps.t;
  if (status.peerLeft) {
    if (onlineRematchStatus) {
      onlineRematchStatus.textContent = t("onlineRematchPeerLeft");
      onlineRematchStatus.classList.remove("is-hidden");
    }
    if (onlinePlayAgainBtn instanceof HTMLButtonElement) {
      onlinePlayAgainBtn.disabled = false;
      onlinePlayAgainBtn.textContent = t("onlinePlayAgain");
    }
    return;
  }
  if (status.bothReady) {
    if (onlineRematchStatus) {
      onlineRematchStatus.textContent = t("onlineRematchStarting");
      onlineRematchStatus.classList.remove("is-hidden");
    }
    return;
  }
  if (status.waitingForPeer) {
    if (onlineRematchStatus) {
      onlineRematchStatus.textContent = t("onlineWaitingRematch");
      onlineRematchStatus.classList.remove("is-hidden");
    }
    if (onlinePlayAgainBtn instanceof HTMLButtonElement) {
      onlinePlayAgainBtn.disabled = true;
      onlinePlayAgainBtn.textContent = t("onlinePlayAgainWaiting");
    }
    return;
  }
  resetRematchUi();
}

function refreshOnlineLevelOptions() {
  if (!onlineLevel || !onlineGameMode || !deps) return;
  const t = deps.t;
  const mode = onlineGameMode.value;
  const lvl = onlineLevel.querySelectorAll("option");
  if (mode === "math") {
    if (lvl[0]) lvl[0].textContent = t("mathLevelEasy");
    if (lvl[1]) lvl[1].textContent = t("mathLevelMedium");
    if (lvl[2]) lvl[2].textContent = t("mathLevelHard");
  } else if (mode === "sums") {
    if (lvl[0]) lvl[0].textContent = t("sumsLevelEasy");
    if (lvl[1]) lvl[1].textContent = t("sumsLevelMedium");
    if (lvl[2]) lvl[2].textContent = t("sumsLevelHard");
  } else if (mode === "english1" || mode === "english2") {
    if (lvl[0]) lvl[0].textContent = t("englishLevelEasy");
    if (lvl[1]) lvl[1].textContent = t("englishLevelMedium");
    if (lvl[2]) lvl[2].textContent = t("englishLevelHard");
  } else {
    if (lvl[0]) lvl[0].textContent = t("fractionLevelEasy");
    if (lvl[1]) lvl[1].textContent = t("fractionLevelMedium");
    if (lvl[2]) lvl[2].textContent = t("fractionLevelHard");
  }
}

function setBusy(busy) {
  onlineBusy = busy;
  syncOnlineControls();
}

/**
 * @param {string} [prefillCode]
 */
export function openOnlineDialog(prefillCode) {
  if (!onlineDialog || !deps) return;
  refreshOnlineLabels();
  resetOnlineDialog();
  if (!isCloudSyncEnabled()) {
    setOnlineStatus("onlineNeedsSupabase");
    setMainToolbarLocked(true);
    onlineDialog.showModal();
    return;
  }
  if (prefillCode && onlineRoomInput instanceof HTMLInputElement) {
    onlineRoomInput.value = prefillCode;
  }
  setOnlineStatus("onlinePickMode");
  setMainToolbarLocked(true);
  onlineDialog.showModal();
}

onlineGameMode?.addEventListener("change", () => refreshOnlineLevelOptions());

async function closeOnlineDialog() {
  if (isOnlinePlaying()) return;
  await leaveOnlineSession();
  resetOnlineDialog();
  setMainToolbarLocked(false);
  onlineDialog?.close();
}

/**
 * @param {{ resetBoard?: boolean }} [options]
 */
async function leaveOnline(options = {}) {
  const { resetBoard = true } = options;
  onlineWinShown = false;
  await leaveOnlineSession();
  deps?.hideWinActions();
  resetOnlineDialog();
  setMainToolbarLocked(false);
  onlineDialog?.close();
  document.querySelector("#appRoot")?.classList.remove("is-online-active");
  if (resetBoard) deps?.onExitOnline();
}

async function resetHostRoom() {
  if (onlineBusy || onlineMode !== "start" || !hostRoomId) return;
  await leaveOnlineSession();
  hostRoomId = null;
  if (onlineRoomCode) onlineRoomCode.textContent = "";
  setOnlineStatus("onlineHostPickGame");
  syncOnlineControls();
}

async function selectStartMode() {
  if (onlineBusy || !deps) return;

  if (onlineMode === "join") {
    await leaveOnlineSession();
    hostRoomId = null;
    if (onlineRoomCode) onlineRoomCode.textContent = "";
  } else if (onlineMode === "start" && hostRoomId) {
    await resetHostRoom();
    return;
  }

  onlineMode = "start";
  setOnlineStatus("onlineHostPickGame");
  syncOnlineControls();
}

async function selectJoinMode() {
  if (onlineBusy || !deps) return;

  if (onlineMode === "start" && hostRoomId) {
    await leaveOnlineSession();
    hostRoomId = null;
    if (onlineRoomCode) onlineRoomCode.textContent = "";
  }

  onlineMode = "join";
  setOnlineStatus("");
  syncOnlineControls();
  if (onlineRoomInput instanceof HTMLInputElement) {
    queueMicrotask(() => onlineRoomInput.focus());
  }
}

async function createHostRoom() {
  if (!deps || onlineMode !== "start" || hostRoomId) return;
  await hostOnline();
}

async function shareRoomCode() {
  if (!hostRoomId || !deps || onlineMode !== "start") return;
  const code = hostRoomId;
  const url = buildInviteUrl(code);
  const shareTitle = deps.t("onlineShareTitle");
  const shareText = deps.t("onlineShareText", { code });

  try {
    if (navigator.share) {
      await navigator.share({ title: shareTitle, text: shareText, url });
      return;
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(code);
    setOnlineStatus("online-copied");
  }
}

async function autoJoinFromInvite(code) {
  if (!deps || !onlineDialog) return;
  refreshOnlineLabels();
  resetOnlineDialog();
  onlineMode = "join";
  if (onlineRoomInput instanceof HTMLInputElement) onlineRoomInput.value = code;
  syncOnlineControls();
  setMainToolbarLocked(true);
  onlineDialog.showModal();
  setBusy(true);
  setOnlineStatus("online-status-connecting");
  try {
    await joinOnlineGuest(code, sessionCallbacks());
  } catch {
    setOnlineStatus("online-error-generic");
    setBusy(false);
  }
}

/** @returns {import('./multiplayer/online-session.js').OnlineSessionCallbacks} */
function sessionCallbacks() {
  return {
    onStatus: setOnlineStatus,
    onSync: (snap, cards) => {
      setBusy(false);
      if (!snap.winHandled) {
        onlineWinShown = false;
        resetRematchUi();
      }
      deps?.applyOnlineSnapshot(snap, cards);
      setMainToolbarLocked(false);
      onlineDialog?.close();
      document.querySelector("#appRoot")?.classList.add("is-online-active");
    },
    onGameEnd: ({ winner, hostScore, guestScore }) => {
      if (onlineWinShown || exitingOnline) return;
      onlineWinShown = true;
      const session = getActiveOnlineSession();
      const role = session?.role;
      let message = deps?.t("onlineEndTie") ?? "Tie game!";
      if (winner === "host") {
        message =
          role === "host"
            ? (deps?.t("onlineEndWin") ?? "You win!")
            : (deps?.t("onlineEndLoss") ?? "Opponent wins!");
      } else if (winner === "guest") {
        message =
          role === "guest"
            ? (deps?.t("onlineEndWin") ?? "You win!")
            : (deps?.t("onlineEndLoss") ?? "Opponent wins!");
      }
      const won =
        (winner === "host" && role === "host") ||
        (winner === "guest" && role === "guest");
      if (won || winner === null) celebrateWin();
      resetRematchUi();
      deps?.showOnlineWin(message, hostScore, guestScore);
    },
    onRematchStatus: (status) => {
      refreshRematchUi(status);
    },
    onError: (key) => {
      setBusy(false);
      setOnlineStatus(key.startsWith("online-") ? key : "online-error-generic");
      if (key === "online-error-disconnected") {
        void leaveOnline();
      }
    },
  };
}

async function hostOnline() {
  if (!deps) return;
  const options = deps.readOnlineHostConfig();
  try {
    setBusy(true);
    setOnlineStatus("online-status-connecting");
    const { roomId } = await startOnlineHost(sessionCallbacks(), options);
    hostRoomId = roomId;
    if (onlineRoomCode) onlineRoomCode.textContent = roomId;
    setOnlineStatus("online-status-waiting");
    setBusy(false);
    syncOnlineControls();
  } catch (e) {
    const msg = e instanceof Error && e.message === "online-requires-supabase"
      ? "onlineNeedsSupabase"
      : "online-error-generic";
    setOnlineStatus(msg);
    setBusy(false);
    hostRoomId = null;
    syncOnlineControls();
  }
}

async function joinOnline() {
  if (!deps || onlineMode !== "join") return;
  const code = normalizeRoomCode(
    onlineRoomInput instanceof HTMLInputElement ? onlineRoomInput.value : "",
  );
  if (!code) {
    setOnlineStatus("online-invalid-code");
    return;
  }
  try {
    setBusy(true);
    setOnlineStatus("online-status-connecting");
    await joinOnlineGuest(code, sessionCallbacks());
  } catch {
    setOnlineStatus("online-error-generic");
    setBusy(false);
  }
}

/**
 * @param {string} cardId
 */
export function onlineLocalFlip(cardId) {
  getActiveOnlineSession()?.localFlip(cardId);
}

export function isOnlineGameActive() {
  return isOnlinePlaying();
}

export async function quitOnlineGame() {
  exitingOnline = true;
  try {
    const session = getActiveOnlineSession();
    if (session?.phase === "playing") {
      forfeitOnlineGame();
      if (session.role === "guest") {
        await new Promise((r) => setTimeout(r, 350));
      }
    }
    await leaveOnline();
  } finally {
    exitingOnline = false;
  }
}

export function playOnlineAgain() {
  const session = getActiveOnlineSession();
  if (!session || session.phase !== "ended") return;
  if (onlinePlayAgainBtn instanceof HTMLButtonElement && onlinePlayAgainBtn.disabled) return;
  requestRematchOnlineGame();
}
