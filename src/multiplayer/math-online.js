import { pickFacts, buildDeck, shuffle } from "../game.js";
import { createSeededRng } from "./seeded-rng.js";

/** @typedef {import('../game.js').MemoryCard} MathOnlineCard */

/**
 * @param {number} tableMax
 * @param {number} pairCount
 * @param {number} seed
 * @returns {MathOnlineCard[]}
 */
export function buildMathDeckFromSeed(tableMax, pairCount, seed) {
  const rng = createSeededRng(seed);
  const facts = pickFacts(tableMax, pairCount, rng);
  return shuffle(buildDeck(facts, rng), rng);
}

/**
 * @param {number} tableMax
 * @param {number} pairCount
 */
export function readMathOptionsFromDom(tableMax, pairCount) {
  const tm = Math.max(2, Math.min(12, Number(tableMax) || 9));
  const pc = Math.max(2, Math.min(8, Number(pairCount) || 6));
  return { tableMax: tm, pairCount: pc };
}
