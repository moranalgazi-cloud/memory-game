import { pickFacts, buildDeck, shuffle, uniqueProductCount } from "../game.js";
import {
  ENGLISH_TOPIC_IDS,
  pickEnglishTopicId,
  getEnglishPool,
  pickEnglishEntries,
  buildEnglishDeck,
} from "../english-game.js";
import {
  buildSumPool,
  pickSumEntries,
  buildSumDeck,
  uniqueSumResultCount,
} from "../sums-game.js";
import {
  buildFractionPool,
  pickFractionEntries,
  buildFractionDeck,
} from "../fraction-game.js";
import { createSeededRng } from "./seeded-rng.js";

/** @typedef {'math' | 'sums' | 'english1' | 'english2' | 'fractions'} OnlineGameMode */
/** @typedef {'easy' | 'medium' | 'hard'} OnlineLevel */

/**
 * @typedef {Object} OnlineHostConfig
 * @property {OnlineGameMode} mode
 * @property {OnlineLevel} level
 * @property {number} pairCount
 * @property {number} [tableMax]
 * @property {number} [maxNumber]
 * @property {string} [englishTopicId]
 * @property {'both' | 'text' | 'none'} [englishSpeech]
 * @property {number} [seed]
 */

/** @typedef {import('../game.js').MemoryCard} OnlineCard */

/**
 * @param {unknown[]} cards
 * @returns {OnlineGameMode}
 */
export function inferOnlineModeFromCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return "math";
  const sides = new Set(
    cards.map((c) => /** @type {{ side?: string }} */ (c).side).filter(Boolean),
  );
  if (sides.has("he") || sides.has("fr") || sides.has("de") || sides.has("es") || sides.has("en")) {
    return "english2";
  }
  if (sides.has("picture")) return "english1";
  if (sides.has("fraction") || sides.has("diagram")) return "fractions";
  if (sides.has("expr")) {
    const expr = cards.find((c) => /** @type {{ side?: string }} */ (c).side === "expr");
    const label = typeof expr?.label === "string" ? expr.label : "";
    if (/[×x*]/.test(label)) return "math";
    return "sums";
  }
  return "math";
}

/**
 * @param {unknown[]} cards
 * @param {OnlineGameMode} mode
 */
export function deckMatchesOnlineMode(cards, mode) {
  return inferOnlineModeFromCards(cards) === mode;
}

/**
 * @param {OnlineLevel} level
 * @returns {{ pairCount: number; tableMax: number }}
 */
function mathLevelSettings(level) {
  if (level === "hard") return { pairCount: 9, tableMax: 10 };
  if (level === "medium") return { pairCount: 6, tableMax: 10 };
  return { pairCount: 4, tableMax: 5 };
}

/**
 * @param {OnlineLevel} level
 * @returns {{ pairCount: number; maxNumber: number }}
 */
function sumsLevelSettings(level) {
  if (level === "hard") return { pairCount: 9, maxNumber: 100 };
  if (level === "medium") return { pairCount: 6, maxNumber: 50 };
  return { pairCount: 6, maxNumber: 10 };
}

/**
 * @param {OnlineLevel} level
 * @returns {{ pairCount: number; englishSpeech: 'both' | 'text' | 'none' }}
 */
function englishLevelSettings(level) {
  if (level === "hard") return { pairCount: 9, englishSpeech: "none" };
  if (level === "medium") return { pairCount: 6, englishSpeech: "text" };
  return { pairCount: 6, englishSpeech: "both" };
}

/**
 * @param {OnlineLevel} level
 * @returns {{ pairCount: number; tableMax: number }}
 */
function fractionLevelSettings(level) {
  if (level === "hard") return { pairCount: 8, tableMax: 12 };
  if (level === "medium") return { pairCount: 6, tableMax: 9 };
  return { pairCount: 4, tableMax: 5 };
}

/**
 * @param {OnlineGameMode} mode
 * @param {OnlineLevel} level
 * @returns {OnlineHostConfig}
 */
export function buildOnlineHostConfig(mode, level) {
  const gameMode = /** @type {OnlineGameMode} */ (
    mode === "english2" ||
    mode === "english1" ||
    mode === "sums" ||
    mode === "fractions"
      ? mode
      : "math"
  );
  if (gameMode === "math") {
    const { pairCount, tableMax } = mathLevelSettings(level);
    return { mode: gameMode, level, pairCount, tableMax };
  }
  if (gameMode === "sums") {
    const { pairCount, maxNumber } = sumsLevelSettings(level);
    return { mode: gameMode, level, pairCount, maxNumber };
  }
  if (gameMode === "english1" || gameMode === "english2") {
    const { pairCount, englishSpeech } = englishLevelSettings(level);
    return { mode: gameMode, level, pairCount, englishSpeech };
  }
  const { pairCount, tableMax } = fractionLevelSettings(level);
  return { mode: "fractions", level, pairCount, tableMax };
}

/**
 * @param {OnlineCard[]} cards
 * @param {OnlineHostConfig} config
 */
function packOnlineDeck(cards, config) {
  if (!deckMatchesOnlineMode(cards, config.mode)) {
    throw new Error(`online-deck: built deck does not match mode "${config.mode}"`);
  }
  return { cards, config };
}

/**
 * @param {OnlineHostConfig} config
 * @param {number} seed
 * @returns {{ cards: OnlineCard[]; config: OnlineHostConfig }}
 */
export function buildOnlineDeckFromSeed(config, seed) {
  const rng = createSeededRng(seed);
  const { mode } = config;

  if (mode === "math") {
    const tableMax = config.tableMax ?? 9;
    const pairCount = config.pairCount;
    const maxPairs = uniqueProductCount(tableMax);
    const count = Math.min(pairCount, maxPairs);
    const facts = pickFacts(tableMax, count, rng);
    const cards = shuffle(buildDeck(facts, rng), rng);
    return packOnlineDeck(cards, { ...config, tableMax, pairCount: count, seed });
  }

  if (mode === "sums") {
    const maxNumber = config.maxNumber ?? 10;
    const pool = buildSumPool(maxNumber);
    const maxPairs = uniqueSumResultCount(pool);
    const count = Math.min(config.pairCount, maxPairs);
    const entries = pickSumEntries(pool, count, rng);
    const cards = shuffle(buildSumDeck(entries, rng), rng);
    return packOnlineDeck(cards, { ...config, maxNumber, pairCount: count, seed });
  }

  if (mode === "english1" || mode === "english2") {
    const englishTopicId = config.englishTopicId ?? pickEnglishTopicId(rng);
    const pool = getEnglishPool(englishTopicId);
    const maxPairs = pool.length;
    const count = Math.min(config.pairCount, maxPairs);
    const entries = pickEnglishEntries(pool, count, mode, rng);
    const cards = shuffle(buildEnglishDeck(entries, mode), rng);
    const englishSpeech = config.englishSpeech ?? "both";
    return packOnlineDeck(cards, {
      ...config,
      englishTopicId,
      englishSpeech,
      pairCount: count,
      seed,
    });
  }

  const tableMax = config.tableMax ?? 9;
  const pool = buildFractionPool(tableMax);
  const maxPairs = pool.length;
  const count = Math.min(config.pairCount, maxPairs);
  const entries = pickFractionEntries(pool, count, rng);
  const cards = shuffle(buildFractionDeck(entries), rng);
  return packOnlineDeck(cards, { ...config, tableMax, pairCount: count, seed });
}
