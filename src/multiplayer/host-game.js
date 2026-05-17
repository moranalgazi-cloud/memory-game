import { isPairMatch } from "../game.js";

/** @typedef {'host' | 'guest'} OnlinePlayerRole */

/**
 * @typedef {Object} OnlinePlayState
 * @property {unknown[]} cards
 * @property {string[]} flipped
 * @property {Set<string>} matched
 * @property {Map<string, number>} matchPairByCardId
 * @property {number} moves
 * @property {boolean} lock
 * @property {number | null} clockStart
 * @property {boolean} winHandled
 * @property {OnlinePlayerRole} turn
 * @property {number} hostScore
 * @property {number} guestScore
 * @property {OnlinePlayerRole | null} winner
 */

/** @returns {OnlinePlayState} */
export function createInitialPlayState(cards) {
  return {
    cards,
    flipped: [],
    matched: new Set(),
    matchPairByCardId: new Map(),
    moves: 0,
    lock: false,
    clockStart: null,
    winHandled: false,
    turn: "host",
    hostScore: 0,
    guestScore: 0,
    winner: null,
  };
}

/**
 * @param {OnlinePlayState} st
 * @returns {boolean}
 */
export function isGameOver(st) {
  return st.matched.size >= st.cards.length && st.cards.length > 0;
}

/**
 * @param {OnlinePlayState} st
 * @param {OnlinePlayerRole} player
 */
export function canPlayerFlip(st, player) {
  if (st.winHandled || st.lock) return false;
  if (st.turn !== player) return false;
  return true;
}

/**
 * @param {OnlinePlayState} st
 * @param {string} cardId
 * @param {OnlinePlayerRole} player
 * @returns {{ ok: true } | { ok: false; reason: string }}
 */
export function tryFlipCard(st, cardId, player) {
  if (!canPlayerFlip(st, player)) return { ok: false, reason: "not-your-turn" };
  if (st.matched.has(cardId)) return { ok: false, reason: "already-matched" };
  if (st.flipped.includes(cardId)) return { ok: false, reason: "already-flipped" };

  if (st.clockStart === null) st.clockStart = Date.now();
  st.flipped.push(cardId);

  if (st.flipped.length < 2) {
    return { ok: true };
  }

  st.lock = true;
  st.moves += 1;
  return { ok: true };
}

/**
 * Resolve the two flipped cards (call after MATCH_PAUSE / MISMATCH_PAUSE).
 * @param {OnlinePlayState} st
 * @param {boolean} extraTurnOnMatch
 */
export function resolveFlippedPair(st, extraTurnOnMatch = true) {
  const [idA, idB] = st.flipped;
  const a = st.cards.find((c) => c.id === idA);
  const b = st.cards.find((c) => c.id === idB);
  const match = isPairMatch(a ?? null, b ?? null);

  if (match && a && b) {
    const pairIdx = st.matched.size / 2;
    st.matched.add(a.id);
    st.matched.add(b.id);
    st.matchPairByCardId.set(a.id, pairIdx);
    st.matchPairByCardId.set(b.id, pairIdx);
    if (st.turn === "host") st.hostScore += 1;
    else st.guestScore += 1;
    if (!extraTurnOnMatch) {
      st.turn = st.turn === "host" ? "guest" : "host";
    }
  } else {
    st.turn = st.turn === "host" ? "guest" : "host";
  }

  st.flipped = [];
  st.lock = false;

  if (isGameOver(st)) {
    st.winHandled = true;
    if (st.hostScore > st.guestScore) st.winner = "host";
    else if (st.guestScore > st.hostScore) st.winner = "guest";
    else st.winner = null;
  }
}

/**
 * @param {OnlinePlayState} st
 */
export function exportSnapshot(st) {
  return {
    turn: st.turn,
    lock: st.lock,
    moves: st.moves,
    flipped: [...st.flipped],
    matched: [...st.matched],
    matchPairs: [...st.matchPairByCardId.entries()],
    hostScore: st.hostScore,
    guestScore: st.guestScore,
    clockStart: st.clockStart,
    winHandled: st.winHandled,
    winner: st.winner,
  };
}

/**
 * Admin testing: end the game immediately with the given player as winner.
 * @param {OnlinePlayState} st
 * @param {OnlinePlayerRole} winnerRole
 */
export function adminForceWin(st, winnerRole) {
  st.flipped = [];
  st.lock = false;
  st.matched.clear();
  st.matchPairByCardId.clear();

  /** @type {Map<string, string[]>} */
  const byKey = new Map();
  for (const card of st.cards) {
    const c = /** @type {{ id: string; factKey?: string }} */ (card);
    const key =
      typeof c.factKey === "string" && c.factKey.length ? c.factKey : c.id;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(c.id);
  }
  let pairIdx = 0;
  for (const ids of byKey.values()) {
    for (const id of ids) {
      st.matched.add(id);
      st.matchPairByCardId.set(id, pairIdx);
    }
    pairIdx += 1;
  }

  const pairs = st.cards.length / 2;
  if (winnerRole === "host") {
    st.hostScore = pairs;
    st.guestScore = 0;
  } else {
    st.guestScore = pairs;
    st.hostScore = 0;
  }
  st.winHandled = true;
  st.winner = winnerRole;
}

/**
 * @param {OnlinePlayState} st
 * @param {OnlinePlayerRole} forfeitingRole
 */
export function applyForfeit(st, forfeitingRole) {
  st.flipped = [];
  st.lock = false;
  st.winHandled = true;
  st.winner = forfeitingRole === "host" ? "guest" : "host";
}
