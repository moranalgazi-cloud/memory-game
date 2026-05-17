import { isCloudSyncEnabled } from "./cloud-sync.js";
import {
  startOnlineHost,
  joinOnlineGuest,
  leaveOnlineSession,
  getActiveOnlineSession,
  isOnlinePlaying,
} from "./multiplayer/online-session.js";
import {
  buildInviteUrl,
  normalizeRoomCode,
  roomCodeFromLocation,
} from "./multiplayer/room-code.js";
import { celebrateWin } from "./celebrate.js";

let onlineWinShown = false;

/**
 * @typedef {Object} OnlineUiDeps
 * @property {(snap: import('./multiplayer/protocol.js').OnlineStateSnapshot, cards: unknown[]) => void} applyOnlineSnapshot
 * @property {() => void} renderBoard
 * @property {() => void} updateStats
 * @property {() => import('./main.js').GameMode} getMode
 * @property {() => { tableMax: number; pairCount: number }} readMathOptions
 * @property {(key: string, vars?: Record<string, string>) => string} t
 * @property {() => void} hideWinActions
 * @property {(message: string) => void} showOnlineWin
 */

/** @type {OnlineUiDeps | null} */
let deps = null;

const onlineDialog = document.querySelector("#onlineDialog");
const onlineStatus = document.querySelector("#onlineStatus");
const onlineLobby = document.querySelector("#onlineLobby");
const onlineInvite = document.querySelector("#onlineInvite");
const onlineInviteUrl = document.querySelector("#onlineInviteUrl");
const onlineRoomCode = document.querySelector("#onlineRoomCode");
const onlineRoomInput = document.querySelector("#onlineRoomInput");
const onlineLeaveBtn = document.querySelector("#onlineLeaveBtn");
const openPlayOnlineBtn = document.querySelector("#openPlayOnline");

/**
 * @param {OnlineUiDeps} d
 */
export function initOnlinePlay(d) {
  deps = d;

  openPlayOnlineBtn?.addEventListener("click", () => openOnlineDialog());
  document.querySelector("#onlineHostBtn")?.addEventListener("click", () => void hostOnline());
  document.querySelector("#onlineJoinBtn")?.addEventListener("click", () => void joinOnline());
  document.querySelector("#onlineCopyLink")?.addEventListener("click", () => void copyInvite());
  document.querySelector("#dismissOnline")?.addEventListener("click", () => void closeOnlineDialog());
  document.querySelector("#onlineLeaveBtn")?.addEventListener("click", () => void leaveOnline());
  onlineDialog?.addEventListener("close", () => {
    if (!isOnlinePlaying()) return;
  });

  onlineRoomInput?.addEventListener("input", () => {
    if (onlineRoomInput instanceof HTMLInputElement) {
      onlineRoomInput.value = onlineRoomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    }
  });

  const fromUrl = roomCodeFromLocation();
  if (fromUrl && isCloudSyncEnabled()) {
    queueMicrotask(() => openOnlineDialog(fromUrl));
  }
}

export function refreshOnlineLabels() {
  if (!deps) return;
  const t = deps.t;
  const title = document.querySelector("#onlineDialogTitle");
  const lead = document.querySelector("#onlineDialogLead");
  const hostBtn = document.querySelector("#onlineHostBtn");
  const joinBtn = document.querySelector("#onlineJoinBtn");
  const labelRoom = document.querySelector("#labelOnlineRoom");
  const labelInvite = document.querySelector("#labelOnlineInvite");
  const labelCode = document.querySelector("#labelOnlineCode");
  const copyBtn = document.querySelector("#onlineCopyLink");
  const dismiss = document.querySelector("#dismissOnline");
  if (title) title.textContent = t("onlineTitle");
  if (lead) lead.textContent = t("onlineLead");
  if (hostBtn) hostBtn.textContent = t("onlineCreate");
  if (joinBtn) joinBtn.textContent = t("onlineJoin");
  if (labelRoom) labelRoom.textContent = t("onlineRoomCode");
  if (labelInvite) labelInvite.textContent = t("onlineInviteLink");
  if (labelCode) labelCode.textContent = t("onlineCodeLabel");
  if (copyBtn) copyBtn.textContent = t("onlineCopy");
  if (dismiss) dismiss.setAttribute("aria-label", t("ariaCloseOnline"));
  if (openPlayOnlineBtn) {
    openPlayOnlineBtn.textContent = t("onlinePlay");
    openPlayOnlineBtn.classList.toggle("is-hidden", !isCloudSyncEnabled());
  }
  if (onlineLeaveBtn) onlineLeaveBtn.textContent = t("onlineLeave");
}

/**
 * @param {string} keyOrText
 */
function setOnlineStatus(key) {
  if (!onlineStatus || !deps) return;
  onlineStatus.textContent = deps.t(key);
}

/**
 * @param {string} [prefillCode]
 */
export function openOnlineDialog(prefillCode) {
  if (!onlineDialog || !deps) return;
  if (!isCloudSyncEnabled()) {
    setOnlineStatus(deps.t("onlineNeedsSupabase"));
    onlineDialog.showModal();
    return;
  }
  refreshOnlineLabels();
  if (onlineLobby) onlineLobby.hidden = false;
  if (onlineInvite) onlineInvite.hidden = true;
  if (onlineLeaveBtn) onlineLeaveBtn.hidden = true;
  setOnlineStatus("");
  if (onlineRoomInput instanceof HTMLInputElement && prefillCode) {
    onlineRoomInput.value = prefillCode;
  }
  onlineDialog.showModal();
}

async function closeOnlineDialog() {
  if (isOnlinePlaying()) return;
  await leaveOnlineSession();
  onlineDialog?.close();
}

async function leaveOnline() {
  onlineWinShown = false;
  await leaveOnlineSession();
  deps?.hideWinActions();
  if (onlineLobby) onlineLobby.hidden = false;
  if (onlineInvite) onlineInvite.hidden = true;
  if (onlineLeaveBtn) onlineLeaveBtn.hidden = true;
  onlineDialog?.close();
  document.querySelector("#appRoot")?.classList.remove("is-online-active");
}

function copyInvite() {
  const url = onlineInviteUrl instanceof HTMLInputElement ? onlineInviteUrl.value : "";
  if (!url) return;
  void navigator.clipboard?.writeText(url);
  setOnlineStatus("online-copied");
}

/** @returns {import('./multiplayer/online-session.js').OnlineSessionCallbacks} */
function sessionCallbacks() {
  return {
    onStatus: setOnlineStatus,
    onSync: (snap, cards) => {
      deps?.applyOnlineSnapshot(snap, cards);
      if (onlineLobby) onlineLobby.hidden = true;
      if (onlineInvite) onlineInvite.hidden = true;
      if (onlineLeaveBtn) onlineLeaveBtn.hidden = false;
      onlineDialog?.close();
      document.querySelector("#appRoot")?.classList.add("is-online-active");
    },
    onGameEnd: ({ winner, hostScore, guestScore }) => {
      if (onlineWinShown) return;
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
      celebrateWin();
      deps?.showOnlineWin(message, hostScore, guestScore);
      if (onlineLeaveBtn) onlineLeaveBtn.hidden = false;
    },
    onError: (key) => {
      setOnlineStatus(key.startsWith("online-") ? key : "online-error-generic");
      if (key === "online-error-disconnected") {
        void leaveOnline();
      }
    },
  };
}

async function hostOnline() {
  if (!deps) return;
  if (deps.getMode() !== "math") {
    setOnlineStatus("online-math-only");
    return;
  }
  const options = deps.readMathOptions();
  try {
    setOnlineStatus("online-status-connecting");
    const { roomId } = await startOnlineHost(sessionCallbacks(), options);
    if (onlineInvite) onlineInvite.hidden = false;
    if (onlineInviteUrl instanceof HTMLInputElement) {
      onlineInviteUrl.value = buildInviteUrl(roomId);
    }
    if (onlineRoomCode) onlineRoomCode.textContent = roomId;
    if (onlineLobby) onlineLobby.hidden = true;
    if (onlineLeaveBtn) onlineLeaveBtn.hidden = false;
  } catch (e) {
    const msg = e instanceof Error && e.message === "online-requires-supabase"
      ? "onlineNeedsSupabase"
      : "online-error-generic";
    setOnlineStatus(msg);
  }
}

async function joinOnline() {
  if (!deps) return;
  const code = normalizeRoomCode(
    onlineRoomInput instanceof HTMLInputElement ? onlineRoomInput.value : "",
  );
  if (!code) {
    setOnlineStatus("online-invalid-code");
    return;
  }
  try {
    setOnlineStatus("online-status-connecting");
    await joinOnlineGuest(code, sessionCallbacks());
    if (onlineLobby) onlineLobby.hidden = true;
    if (onlineLeaveBtn) onlineLeaveBtn.hidden = false;
  } catch {
    setOnlineStatus("online-error-generic");
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
