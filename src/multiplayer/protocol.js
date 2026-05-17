/** @typedef {'host' | 'guest'} OnlinePlayerRole */

/** @typedef {import('./online-deck.js').OnlineGameMode} OnlineGameMode */

import { inferOnlineModeFromCards } from "./online-deck.js";

/**
 * @typedef {import('./online-deck.js').OnlineHostConfig} OnlineHostConfig
 */

/**
 * @typedef {Object} OnlineStateSnapshot
 * @property {OnlinePlayerRole} turn
 * @property {boolean} lock
 * @property {number} moves
 * @property {string[]} flipped
 * @property {string[]} matched
 * @property {[string, number][]} matchPairs
 * @property {number} hostScore
 * @property {number} guestScore
 * @property {number | null} clockStart
 * @property {boolean} winHandled
 * @property {OnlinePlayerRole | null} winner
 */

/** @param {Record<string, unknown>} state */
export function snapshotFromGameState(state) {
  return {
    turn: /** @type {OnlinePlayerRole} */ (state.turn ?? "host"),
    lock: Boolean(state.lock),
    moves: state.moves ?? 0,
    flipped: [...(state.flipped ?? [])],
    matched: [...(state.matched ?? [])],
    matchPairs: [...(state.matchPairByCardId?.entries?.() ?? [])],
    hostScore: state.hostScore ?? 0,
    guestScore: state.guestScore ?? 0,
    clockStart: state.clockStart ?? null,
    winHandled: Boolean(state.winHandled),
    winner: state.winner ?? null,
  };
}

/**
 * @param {OnlineStateSnapshot} snap
 * @param {unknown[]} cards
 * @param {OnlineHostConfig | null} config
 */
export function applySnapshotToState(snap, cards, config) {
  const inferred = inferOnlineModeFromCards(cards);
  const configMode = config?.mode;
  const mode =
    configMode === "english1" ||
    configMode === "english2" ||
    configMode === "sums" ||
    configMode === "fractions" ||
    configMode === "math"
      ? configMode
      : inferred;
  const resolvedMode = mode === inferred ? mode : inferred;
  return {
    mode: resolvedMode,
    cards,
    flipped: [...snap.flipped],
    matched: new Set(snap.matched),
    matchPairByCardId: new Map(snap.matchPairs),
    moves: snap.moves,
    lock: snap.lock,
    clockStart: snap.clockStart,
    winHandled: snap.winHandled,
    turn: snap.turn,
    hostScore: snap.hostScore,
    guestScore: snap.guestScore,
    winner: snap.winner,
    englishSpeech: config?.englishSpeech,
    englishTopicId: config?.englishTopicId,
    online: true,
  };
}
