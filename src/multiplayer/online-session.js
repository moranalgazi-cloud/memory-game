import { createSignalingChannel } from "./signaling.js";
import { createGameConnection } from "./connection.js";
import { resolveIceServers } from "./ice-servers.js";
import { generateRoomCode } from "./room-code.js";
import { buildOnlineDeckFromSeed, inferOnlineModeFromCards } from "./online-deck.js";
import {
  createInitialPlayState,
  tryFlipCard,
  resolveFlippedPair,
  exportSnapshot,
  adminForceWin,
  applyForfeit,
} from "./host-game.js";
import { buildOnlineHostConfig } from "./online-deck.js";
import { isPairMatch } from "../game.js";
import { isCloudSyncEnabled } from "../cloud-sync.js";

const MATCH_PAUSE_MS = 400;
const MISMATCH_PAUSE_MS = 1000;
const CONNECT_TIMEOUT_MS = 45_000;
const ICE_SEND_DEBOUNCE_MS = 50;

/** @typedef {'idle' | 'waiting' | 'connecting' | 'playing' | 'ended'} OnlinePhase */

/**
 * @typedef {Object} OnlineSessionCallbacks
 * @property {(status: string) => void} onStatus
 * @property {(snap: ReturnType<exportSnapshot>, cards: unknown[]) => void} onSync
 * @property {(info: { winner: 'host' | 'guest' | null; hostScore: number; guestScore: number }) => void} onGameEnd
 * @property {(status: { selfReady: boolean; peerReady: boolean; waitingForPeer: boolean; bothReady?: boolean; peerLeft?: boolean }) => void} [onRematchStatus]
 * @property {(message: string) => void} onError
 */

/** @type {OnlineSession | null} */
let activeSession = null;

/** @type {import('./online-deck.js').OnlineHostConfig | null} */
let activeGameConfig = null;

export class OnlineSession {
  /**
   * @param {'host' | 'guest'} role
   * @param {string} roomId
   * @param {OnlineSessionCallbacks} callbacks
   * @param {import('./online-deck.js').OnlineHostConfig} [hostOptions]
   */
  constructor(role, roomId, callbacks, hostOptions) {
    this.role = role;
    this.roomId = roomId;
    this.callbacks = callbacks;
    this.hostOptions = hostOptions ?? { mode: "math", level: "easy", pairCount: 4, tableMax: 5 };
    this.playerId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `p-${Date.now()}`;
    this.phase = "idle";
    /** @type {ReturnType<createSignalingChannel> | null} */
    this.signaling = null;
    /** @type {ReturnType<createGameConnection> | null} */
    this.conn = null;
    /** @type {import('./host-game.js').OnlinePlayState | null} */
    this.playState = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.resolveTimer = null;
    this.guestJoined = false;
    this.offerSent = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.connectTimeout = null;
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.iceFlushTimer = null;
    /** @type {RTCIceCandidateInit[]} */
    this.pendingIce = [];
    this.left = false;
    this.hostRematchReady = false;
    this.guestRematchReady = false;
    /** @type {number} */
    this.syncSeq = 0;
    /** @type {number} */
    this.lastSyncSeq = 0;
  }

  /** @param {string} text */
  setStatus(text) {
    this.callbacks.onStatus(text);
  }

  async start() {
    if (!isCloudSyncEnabled()) {
      throw new Error("online-requires-supabase");
    }
    const iceServers = await resolveIceServers();
    this.signaling = createSignalingChannel(this.roomId, this.playerId, {
      onSignal: (payload) => this.handleSignal(payload),
      onStatus: (status) => {
        if (status === "SUBSCRIBED" && this.role === "guest") {
          this.signaling?.send("join", { roomId: this.roomId });
        }
        if (status === "SUBSCRIBED" && this.role === "host") {
          this.phase = "waiting";
          this.setStatus("online-status-waiting");
          this.armConnectTimeout();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (!this.left && this.phase !== "ended") {
            this.callbacks.onError("online-error-connection");
            void this.leave();
          }
        }
      },
    });

    this.conn = createGameConnection(
      this.role === "host",
      {
        onOpen: () => this.onDataChannelOpen(),
        onClose: () => this.onDisconnected(),
        onMessage: (text) => this.onDataMessage(text),
        onError: () => this.callbacks.onError("online-error-connection"),
      },
      iceServers,
    );

    this.wireIce();

    if (this.role === "guest") {
      this.phase = "connecting";
      this.setStatus("online-status-connecting");
      this.armConnectTimeout();
    }
  }

  armConnectTimeout() {
    this.clearConnectTimeout();
    this.connectTimeout = setTimeout(() => {
      this.connectTimeout = null;
      if (this.phase === "connecting" || this.phase === "waiting") {
        this.callbacks.onError("online-error-timeout");
        void this.leave();
      }
    }, CONNECT_TIMEOUT_MS);
  }

  clearConnectTimeout() {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  flushIceCandidates() {
    this.iceFlushTimer = null;
    if (!this.signaling || this.pendingIce.length === 0) return;
    const batch = this.pendingIce.splice(0);
    for (const candidate of batch) {
      this.signaling.send("ice", candidate);
    }
  }

  wireIce() {
    if (!this.conn || !this.signaling) return;
    this.conn.pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      this.pendingIce.push(ev.candidate.toJSON());
      if (!this.iceFlushTimer) {
        this.iceFlushTimer = setTimeout(() => this.flushIceCandidates(), ICE_SEND_DEBOUNCE_MS);
      }
    };
  }

  /**
   * @param {{ from: string; type: string; data?: unknown }} payload
   */
  async handleSignal(payload) {
    if (!this.conn) return;
    if (payload.type === "leave") {
      if (this.left) return;
      if (this.phase === "ended") {
        this.callbacks.onRematchStatus?.({ selfReady: false, peerReady: false, waitingForPeer: false, peerLeft: true });
        return;
      }
      this.callbacks.onError("online-error-peer-left");
      void this.leave();
      return;
    }
    if (payload.type === "join" && this.role === "host" && !this.guestJoined) {
      this.guestJoined = true;
      this.phase = "connecting";
      this.setStatus("online-status-connecting");
      this.armConnectTimeout();
      if (!this.offerSent) {
        this.offerSent = true;
        const offer = await this.conn.createOffer();
        this.signaling?.send("offer", offer);
      }
    }
    if (payload.type === "offer" && this.role === "guest") {
      const offer = /** @type {RTCSessionDescriptionInit} */ (payload.data);
      const answer = await this.conn.acceptOffer(offer);
      this.signaling?.send("answer", answer);
    }
    if (payload.type === "answer" && this.role === "host") {
      await this.conn.acceptAnswer(/** @type {RTCSessionDescriptionInit} */ (payload.data));
    }
    if (payload.type === "ice") {
      await this.conn.addIce(/** @type {RTCIceCandidateInit} */ (payload.data));
    }
  }

  onDataChannelOpen() {
    this.clearConnectTimeout();
    if (this.role === "host") {
      this.startHostGame();
    } else {
      this.phase = "connecting";
      this.setStatus("online-status-starting");
    }
  }

  startHostGame() {
    this.hostRematchReady = false;
    this.guestRematchReady = false;
    this.syncSeq = 0;
    this.lastSyncSeq = 0;
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const hostConfig = buildOnlineHostConfig(this.hostOptions.mode, this.hostOptions.level);
    const { cards, config } = buildOnlineDeckFromSeed(hostConfig, seed);
    activeGameConfig = { ...config, mode: inferOnlineModeFromCards(cards) };
    this.playState = createInitialPlayState(cards);
    this.phase = "playing";
    this.setStatus("online-status-playing");
    this.sendData({
      type: "game-start",
      config: activeGameConfig,
      cards,
    });
    this.broadcastSync();
  }

  /**
   * @param {string} text
   */
  onDataMessage(text) {
    let msg;
    try {
      msg = JSON.parse(text);
    } catch {
      return;
    }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "game-start" && this.role === "guest") {
      const cards = msg.cards;
      const config = msg.config;
      if (config && typeof config === "object") {
        const inferred = inferOnlineModeFromCards(cards);
        activeGameConfig = {
          .../** @type {import('./online-deck.js').OnlineHostConfig} */ (config),
          mode: inferred,
        };
      }
      this.playState = createInitialPlayState(cards);
      this.phase = "playing";
      this.setStatus("online-status-playing");
      this.broadcastSyncToLocal();
      return;
    }

    if (msg.type === "sync") {
      if (this.role === "guest" && this.playState) {
        const seq = Number(msg.seq) || 0;
        if (seq <= this.lastSyncSeq) return;
        this.lastSyncSeq = seq;
        this.applyRemoteSnapshot(msg.snapshot);
      }
      return;
    }

    if (msg.type === "flip-request" && this.role === "host" && this.playState) {
      this.hostFlip(/** @type {string} */ (msg.cardId), "guest");
    }

    if (msg.type === "forfeit" && this.role === "host" && this.playState) {
      const player = msg.player === "guest" ? "guest" : "host";
      applyForfeit(this.playState, player);
      this.broadcastSync();
    }

    if (msg.type === "rematch-ready") {
      const player = msg.player === "host" ? "host" : "guest";
      if (player === "host") this.hostRematchReady = true;
      else this.guestRematchReady = true;
      this.emitRematchStatus();
      this.tryStartRematch();
    }
  }

  /**
   * @param {ReturnType<exportSnapshot>} snap
   */
  applyRemoteSnapshot(snap) {
    if (!this.playState) return;
    const st = this.playState;
    st.turn = snap.turn;
    st.lock = snap.lock;
    st.moves = snap.moves;
    st.flipped = [...snap.flipped];
    st.matched = new Set(snap.matched);
    st.matchPairByCardId = new Map(snap.matchPairs);
    st.hostScore = snap.hostScore;
    st.guestScore = snap.guestScore;
    st.clockStart = snap.clockStart;
    st.winHandled = snap.winHandled;
    st.winner = snap.winner;
    this.broadcastSyncToLocal();
    if (st.winHandled) {
      this.phase = "ended";
      this.callbacks.onGameEnd({
        winner: st.winner,
        hostScore: st.hostScore,
        guestScore: st.guestScore,
      });
    }
  }

  broadcastSyncToLocal() {
    if (!this.playState) return;
    this.callbacks.onSync(exportSnapshot(this.playState), this.playState.cards);
  }

  broadcastSync() {
    if (!this.playState || this.role !== "host") return;
    this.syncSeq += 1;
    this.sendData({ type: "sync", seq: this.syncSeq, snapshot: exportSnapshot(this.playState) });
    this.broadcastSyncToLocal();
    if (this.playState.winHandled) {
      this.phase = "ended";
      this.callbacks.onGameEnd({
        winner: this.playState.winner,
        hostScore: this.playState.hostScore,
        guestScore: this.playState.guestScore,
      });
    }
  }

  /**
   * @param {unknown} obj
   */
  sendData(obj) {
    this.conn?.send(JSON.stringify(obj));
  }

  /**
   * @param {string} cardId
   */
  guestRequestFlip(cardId) {
    if (this.role !== "guest" || this.phase !== "playing") return;
    this.sendData({ type: "flip-request", cardId, player: "guest" });
  }

  /**
   * @param {string} cardId
   * @param {'host' | 'guest'} player
   */
  hostFlip(cardId, player) {
    if (this.role !== "host" || !this.playState || this.phase !== "playing") return;
    const st = this.playState;
    const beforeLen = st.flipped.length;
    const result = tryFlipCard(st, cardId, player);
    if (!result.ok) return;

    this.broadcastSync();

    if (st.flipped.length === 2 && beforeLen < 2) {
      const [a, b] = st.flipped.map((id) => st.cards.find((c) => c.id === id));
      const match = isPairMatch(a ?? null, b ?? null);
      const delay = match ? MATCH_PAUSE_MS : MISMATCH_PAUSE_MS;
      if (this.resolveTimer) clearTimeout(this.resolveTimer);
      this.resolveTimer = setTimeout(() => {
        this.resolveTimer = null;
        if (!this.playState) return;
        resolveFlippedPair(this.playState, true);
        this.broadcastSync();
      }, delay);
    }
  }

  /** @param {string} cardId */
  localFlip(cardId) {
    if (this.role === "host") {
      this.hostFlip(cardId, "host");
    } else {
      this.guestRequestFlip(cardId);
    }
  }

  /**
   * Host-only: instantly finish the online game (admin testing).
   * @param {'host' | 'guest'} winnerRole
   */
  adminSpeedFinish(winnerRole) {
    if (this.role !== "host" || !this.playState || this.phase !== "playing") return;
    adminForceWin(this.playState, winnerRole);
    this.broadcastSync();
  }

  forfeit() {
    if (this.phase !== "playing" || !this.playState) return;
    if (this.role === "host") {
      applyForfeit(this.playState, "host");
      this.broadcastSync();
    } else {
      this.sendData({ type: "forfeit", player: "guest" });
    }
  }

  emitRematchStatus() {
    const selfReady = this.role === "host" ? this.hostRematchReady : this.guestRematchReady;
    const peerReady = this.role === "host" ? this.guestRematchReady : this.hostRematchReady;
    this.callbacks.onRematchStatus?.({
      selfReady,
      peerReady,
      waitingForPeer: selfReady && !peerReady,
      bothReady: selfReady && peerReady,
    });
  }

  tryStartRematch() {
    if (this.role !== "host" || !this.hostRematchReady || !this.guestRematchReady) return;
    if (this.resolveTimer) {
      clearTimeout(this.resolveTimer);
      this.resolveTimer = null;
    }
    this.startHostGame();
  }

  requestRematch() {
    if (this.phase !== "ended") return false;
    if (this.role === "host") this.hostRematchReady = true;
    else this.guestRematchReady = true;
    this.sendData({ type: "rematch-ready", player: this.role });
    this.emitRematchStatus();
    this.tryStartRematch();
    return true;
  }

  onDisconnected() {
    if (this.phase === "ended") return;
    this.callbacks.onError("online-error-disconnected");
    void this.leave();
  }

  async leave() {
    if (this.left) return;
    this.left = true;
    this.clearConnectTimeout();
    if (this.iceFlushTimer) {
      clearTimeout(this.iceFlushTimer);
      this.iceFlushTimer = null;
    }
    this.pendingIce = [];
    if (this.resolveTimer) {
      clearTimeout(this.resolveTimer);
      this.resolveTimer = null;
    }
    try {
      this.signaling?.send("leave", { roomId: this.roomId });
    } catch {
      /* ignore */
    }
    this.conn?.close();
    await this.signaling?.close();
    this.phase = "ended";
    if (activeSession === this) {
      activeSession = null;
      activeGameConfig = null;
    }
  }
}

/**
 * @param {OnlineSessionCallbacks} callbacks
 * @param {import('./online-deck.js').OnlineHostConfig} options
 */
export async function startOnlineHost(callbacks, options) {
  await leaveOnlineSession();
  const roomId = generateRoomCode();
  const session = new OnlineSession("host", roomId, callbacks, options);
  activeSession = session;
  await session.start();
  return { session, roomId };
}

/**
 * @param {string} roomId
 * @param {OnlineSessionCallbacks} callbacks
 */
export async function joinOnlineGuest(roomId, callbacks) {
  await leaveOnlineSession();
  const session = new OnlineSession("guest", roomId, callbacks);
  activeSession = session;
  await session.start();
  return { session, roomId };
}

export async function leaveOnlineSession() {
  if (activeSession) {
    await activeSession.leave();
    activeSession = null;
    activeGameConfig = null;
  }
}

/** @returns {OnlineSession | null} */
export function getActiveOnlineSession() {
  return activeSession;
}

/** @returns {import('./online-deck.js').OnlineHostConfig | null} */
export function getOnlineGameConfig() {
  return activeGameConfig;
}

export function isOnlinePlaying() {
  return activeSession?.phase === "playing";
}

/**
 * @param {'host' | 'guest'} winnerRole
 */
export function adminFinishOnlineGame(winnerRole) {
  activeSession?.adminSpeedFinish(winnerRole);
}

export function forfeitOnlineGame() {
  activeSession?.forfeit();
}

export function requestRematchOnlineGame() {
  return activeSession?.requestRematch() ?? false;
}
