import { createSignalingChannel } from "./signaling.js";
import { createGameConnection } from "./connection.js";
import { generateRoomCode } from "./room-code.js";
import { buildMathDeckFromSeed } from "./math-online.js";
import {
  createInitialPlayState,
  tryFlipCard,
  resolveFlippedPair,
  exportSnapshot,
} from "./host-game.js";
import { isCloudSyncEnabled } from "../cloud-sync.js";

const MATCH_PAUSE_MS = 400;
const MISMATCH_PAUSE_MS = 1000;

/** @typedef {'idle' | 'waiting' | 'connecting' | 'playing' | 'ended'} OnlinePhase */

/**
 * @typedef {Object} OnlineSessionCallbacks
 * @property {(status: string) => void} onStatus
 * @property {(snap: ReturnType<exportSnapshot>, cards: import('./math-online.js').MathOnlineCard[]) => void} onSync
 * @property {(info: { winner: 'host' | 'guest' | null; hostScore: number; guestScore: number }) => void} onGameEnd
 * @property {(message: string) => void} onError
 */

/** @type {OnlineSession | null} */
let activeSession = null;

export class OnlineSession {
  /**
   * @param {'host' | 'guest'} role
   * @param {string} roomId
   * @param {OnlineSessionCallbacks} callbacks
   * @param {{ tableMax: number; pairCount: number }} [hostOptions]
   */
  constructor(role, roomId, callbacks, hostOptions) {
    this.role = role;
    this.roomId = roomId;
    this.callbacks = callbacks;
    this.hostOptions = hostOptions ?? { tableMax: 9, pairCount: 6 };
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
  }

  /** @param {string} text */
  setStatus(text) {
    this.callbacks.onStatus(text);
  }

  async start() {
    if (!isCloudSyncEnabled()) {
      throw new Error("online-requires-supabase");
    }
    this.signaling = createSignalingChannel(this.roomId, this.playerId, {
      onSignal: (payload) => this.handleSignal(payload),
      onStatus: (status) => {
        if (status === "SUBSCRIBED" && this.role === "guest") {
          this.signaling?.send("join", { roomId: this.roomId });
        }
        if (status === "SUBSCRIBED" && this.role === "host") {
          this.phase = "waiting";
          this.setStatus("online-status-waiting");
        }
      },
    });

    this.conn = createGameConnection(this.role === "host", {
      onOpen: () => this.onDataChannelOpen(),
      onClose: () => this.onDisconnected(),
      onMessage: (text) => this.onDataMessage(text),
      onError: () => this.callbacks.onError("online-error-connection"),
    });

    this.wireIce();

    if (this.role === "guest") {
      this.phase = "connecting";
      this.setStatus("online-status-connecting");
    }
  }

  wireIce() {
    if (!this.conn || !this.signaling) return;
    this.conn.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.signaling?.send("ice", ev.candidate.toJSON());
      }
    };
  }

  /**
   * @param {{ from: string; type: string; data?: unknown }} payload
   */
  async handleSignal(payload) {
    if (!this.conn) return;
    if (payload.type === "join" && this.role === "host" && !this.guestJoined) {
      this.guestJoined = true;
      this.phase = "connecting";
      this.setStatus("online-status-connecting");
      const offer = await this.conn.createOffer();
      this.signaling?.send("offer", offer);
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
    if (this.role === "host") {
      this.startHostGame();
    } else {
      this.phase = "connecting";
      this.setStatus("online-status-starting");
    }
  }

  startHostGame() {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const { tableMax, pairCount } = this.hostOptions;
    const cards = buildMathDeckFromSeed(tableMax, pairCount, seed);
    this.playState = createInitialPlayState(cards);
    this.phase = "playing";
    this.setStatus("online-status-playing");
    this.sendData({
      type: "game-start",
      config: { mode: "math", tableMax, pairCount, seed },
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
      this.playState = createInitialPlayState(cards);
      this.phase = "playing";
      this.setStatus("online-status-playing");
      this.broadcastSyncToLocal();
      return;
    }

    if (msg.type === "sync") {
      if (this.role === "guest" && this.playState) {
        this.applyRemoteSnapshot(msg.snapshot);
      }
      return;
    }

    if (msg.type === "flip-request" && this.role === "host" && this.playState) {
      this.hostFlip(/** @type {string} */ (msg.cardId), "guest");
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
    this.sendData({ type: "sync", snapshot: exportSnapshot(this.playState) });
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
      const match = a && b && a.factKey === b.factKey && a.side !== b.side;
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

  onDisconnected() {
    if (this.phase === "ended") return;
    this.callbacks.onError("online-error-disconnected");
    void this.leave();
  }

  async leave() {
    if (this.resolveTimer) {
      clearTimeout(this.resolveTimer);
      this.resolveTimer = null;
    }
    this.conn?.close();
    await this.signaling?.close();
    this.phase = "ended";
    if (activeSession === this) activeSession = null;
  }
}

/**
 * @param {OnlineSessionCallbacks} callbacks
 * @param {{ tableMax: number; pairCount: number }} options
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
  }
}

/** @returns {OnlineSession | null} */
export function getActiveOnlineSession() {
  return activeSession;
}

export function isOnlinePlaying() {
  return activeSession?.phase === "playing";
}
