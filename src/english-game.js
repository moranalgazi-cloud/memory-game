import vocabulary from "./english-vocabulary.json";
import { rngUnit } from "./game.js";

/**
 * @typedef {{ key: string; word: string; wordHe: string; symbol: string }} EnglishLexEntry
 * @typedef {{ id: string; entries: EnglishLexEntry[] }} EnglishTopic
 * @typedef {"en" | "he"} EnglishDeckLang
 * @typedef {"english1" | "english2"} EnglishDeckKind
 * @typedef {{ id: string; factKey: string; side: "picture" | "word" | "he" | "en"; label: string; symbol?: string; word?: string; lang?: EnglishDeckLang }} EnglishCard
 */

/** @type {EnglishTopic[]} */
export const ENGLISH_TOPICS = /** @type {EnglishTopic[]} */ (vocabulary.topics);

/** @type {string[]} */
export const ENGLISH_TOPIC_IDS = ENGLISH_TOPICS.map((t) => t.id);

/**
 * @param {string} topicId
 * @returns {EnglishTopic | undefined}
 */
export function getEnglishTopic(topicId) {
  return ENGLISH_TOPICS.find((t) => t.id === topicId);
}

/**
 * @param {string} topicId
 * @returns {EnglishLexEntry[]}
 */
export function getEnglishPool(topicId) {
  const topic = getEnglishTopic(topicId);
  return topic ? [...topic.entries] : [];
}

/**
 * @param {() => number} [rng]
 * @returns {string}
 */
export function pickEnglishTopicId(rng = Math.random) {
  const i = Math.floor(rngUnit(rng) * ENGLISH_TOPIC_IDS.length);
  return ENGLISH_TOPIC_IDS[i] ?? ENGLISH_TOPIC_IDS[0];
}

/**
 * @param {EnglishLexEntry} e
 * @param {EnglishDeckLang} lang
 */
export function entryLabel(e, lang) {
  return lang === "he" ? e.wordHe : e.word;
}

/**
 * @param {EnglishLexEntry} e
 * @param {EnglishDeckLang} [lang]
 */
export function isValidEnglishEntry(e, lang = "en") {
  if (!e || typeof e.key !== "string") return false;
  if (typeof e.symbol !== "string" || !e.symbol.trim()) return false;
  const label = entryLabel(
    /** @type {EnglishLexEntry} */ ({ ...e, word: e.word ?? "", wordHe: e.wordHe ?? "" }),
    lang,
  );
  if (typeof label !== "string" || !label.trim()) return false;
  if (lang === "en" && (typeof e.word !== "string" || !e.word.trim())) return false;
  if (lang === "he" && (typeof e.wordHe !== "string" || !e.wordHe.trim())) return false;
  if (/\d/.test(label)) return false;
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length > 2) return false;
  if (label.length > 24) return false;
  for (const part of words) {
    if (part.length > 15) return false;
  }
  return true;
}

/** @param {EnglishLexEntry} e */
export function isValidBilingualEntry(e) {
  return isValidEnglishEntry(e, "en") && isValidEnglishEntry(e, "he");
}

/**
 * @param {EnglishLexEntry[]} pool
 * @param {number} count
 * @param {EnglishDeckKind} deckKind
 * @param {() => number} rng
 * @returns {EnglishLexEntry[]}
 */
export function pickEnglishEntries(pool, count, deckKind = "english1", rng = Math.random) {
  const bag = pool.filter((e) =>
    deckKind === "english2" ? isValidBilingualEntry(e) : isValidEnglishEntry(e, "en"),
  );
  const chosen = [];
  const n = Math.min(count, bag.length);
  while (chosen.length < n && bag.length) {
    const i = Math.floor(rngUnit(rng) * bag.length);
    chosen.push(bag.splice(i, 1)[0]);
  }
  return chosen;
}

/**
 * @param {EnglishLexEntry[]} entries
 * @param {EnglishDeckKind} [deckKind]
 * @returns {EnglishCard[]}
 */
export function buildEnglishDeck(entries, deckKind = "english1") {
  /** @type {EnglishCard[]} */
  const cards = [];
  let n = 0;
  for (const e of entries) {
    if (deckKind === "english2") {
      if (!isValidBilingualEntry(e)) continue;
      cards.push({
        id: `e${n++}`,
        factKey: e.key,
        side: "he",
        label: e.wordHe,
        word: e.wordHe,
        lang: "he",
      });
      cards.push({
        id: `e${n++}`,
        factKey: e.key,
        side: "en",
        label: e.word,
        word: e.word,
        lang: "en",
      });
      continue;
    }
    if (!isValidEnglishEntry(e, "en")) continue;
    cards.push({
      id: `e${n++}`,
      factKey: e.key,
      side: "picture",
      label: "",
      symbol: e.symbol,
      word: e.word,
      lang: "en",
    });
    cards.push({
      id: `e${n++}`,
      factKey: e.key,
      side: "word",
      label: e.word,
      word: e.word,
      lang: "en",
    });
  }
  return cards;
}

/** i18n message key for a topic id (e.g. englishTopic_days). */
export function englishTopicMessageKey(topicId) {
  return `englishTopic_${topicId}`;
}

export { shuffle, isPairMatch } from "./game.js";
