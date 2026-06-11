import vocabulary from "./english-vocabulary.json";
import { getEnglish2SourceLang } from "./english2-source.js";
import { rngUnit } from "./game.js";

/**
 * @typedef {{ key: string; word: string; wordHe?: string; wordFr?: string; wordDe?: string; wordEs?: string; symbol: string; imageUrl?: string }} EnglishLexEntry
 * @typedef {{ id: string; entries: EnglishLexEntry[] }} EnglishTopic
 * @typedef {"en" | "he" | "fr" | "de" | "es"} EnglishDeckLang
 * @typedef {"english1" | "english2"} EnglishDeckKind
 * @typedef {{ id: string; factKey: string; side: string; label: string; symbol?: string; imageUrl?: string; word?: string; lang?: EnglishDeckLang }} EnglishCard
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

/** @param {EnglishLexEntry} e @param {EnglishDeckLang} lang */
function sourceFieldKey(lang) {
  if (lang === "he") return "wordHe";
  if (lang === "fr") return "wordFr";
  if (lang === "de") return "wordDe";
  if (lang === "es") return "wordEs";
  return null;
}

/**
 * @param {EnglishLexEntry} e
 * @param {EnglishDeckLang} lang
 */
export function entryLabel(e, lang) {
  if (lang === "en") return e.word;
  const field = sourceFieldKey(lang);
  if (!field) return "";
  const v = e[field];
  return typeof v === "string" ? v : "";
}

/**
 * @param {EnglishLexEntry} e
 * @param {EnglishDeckLang} [lang]
 */
export function isValidEnglishEntry(e, lang = "en") {
  if (!e || typeof e.key !== "string") return false;
  const hasPicture =
    (typeof e.symbol === "string" && e.symbol.trim()) ||
    (typeof e.imageUrl === "string" && e.imageUrl.trim());
  if (!hasPicture) return false;
  const label = entryLabel(
    /** @type {EnglishLexEntry} */ ({ ...e, word: e.word ?? "", wordHe: e.wordHe ?? "" }),
    lang,
  );
  if (typeof label !== "string" || !label.trim()) return false;
  if (lang === "en" && (typeof e.word !== "string" || !e.word.trim())) return false;
  if (lang !== "en" && !entryLabel(e, lang).trim()) return false;
  if (/\d/.test(label)) return false;
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length > 2) return false;
  if (label.length > 24) return false;
  for (const part of words) {
    if (part.length > 15) return false;
  }
  return true;
}

/**
 * @param {EnglishLexEntry} e
 * @param {import("./english2-source.js").English2SourceLang} [sourceLang]
 */
export function isValidBilingualEntry(e, sourceLang = getEnglish2SourceLang()) {
  return isValidEnglishEntry(e, "en") && isValidEnglishEntry(e, sourceLang);
}

/**
 * @param {EnglishLexEntry[]} pool
 * @param {number} count
 * @param {EnglishDeckKind} deckKind
 * @param {() => number} rng
 * @param {import("./english2-source.js").English2SourceLang} [sourceLang]
 * @returns {EnglishLexEntry[]}
 */
export function pickEnglishEntries(pool, count, deckKind = "english1", rng = Math.random, sourceLang = getEnglish2SourceLang()) {
  const bag = pool.filter((e) =>
    deckKind === "english2" ? isValidBilingualEntry(e, sourceLang) : isValidEnglishEntry(e, "en"),
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
 * @param {import("./english2-source.js").English2SourceLang} [sourceLang]
 * @returns {EnglishCard[]}
 */
export function buildEnglishDeck(entries, deckKind = "english1", sourceLang = getEnglish2SourceLang()) {
  /** @type {EnglishCard[]} */
  const cards = [];
  let n = 0;
  for (const e of entries) {
    if (deckKind === "english2") {
      if (!isValidBilingualEntry(e, sourceLang)) continue;
      const srcLabel = entryLabel(e, sourceLang);
      cards.push({
        id: `e${n++}`,
        factKey: e.key,
        side: sourceLang,
        label: srcLabel,
        word: srcLabel,
        lang: sourceLang,
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
      symbol: e.imageUrl ? undefined : e.symbol,
      imageUrl: e.imageUrl,
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
