import lexicon from "./english-lexicon.json";

/**
 * @typedef {{ key: string; word: string; image: string }} EnglishLexEntry
 * @typedef {{ id: string; factKey: string; side: "picture" | "word"; label: string; imageUrl?: string; word?: string }} EnglishCard
 */

/** @type {EnglishLexEntry[]} */
export const ENGLISH_LEXICON = /** @type {EnglishLexEntry[]} */ (lexicon);

/** GitHub serves national / territory flags as two regional-indicator codepoints in the filename. */
function isRegionalFlagImageUrl(url) {
  return typeof url === "string" && /\/unicode\/1f1[a-f0-9]{2}-1f1[a-f0-9]{2}\.png/i.test(url);
}

/**
 * Keeps vocabulary easy for ~10-year-olds: short phrases (≤2 words), no flag tiles,
 * no skin-tone variant keys, no arrow UI clutter, no digits in the spoken label.
 * @param {EnglishLexEntry} e
 */
export function isKidFriendlyEnglishEntry(e) {
  if (!e || typeof e.key !== "string" || typeof e.word !== "string") return false;
  if (isRegionalFlagImageUrl(e.image)) return false;

  const w = e.word.trim();
  if (!w || /\d/.test(w)) return false;

  const words = w.split(/\s+/).filter(Boolean);
  if (words.length > 2) return false;
  if (w.length > 24) return false;
  for (const part of words) {
    if (part.length > 15) return false;
  }

  const k = e.key.toLowerCase();
  if (/(?:^|_)(?:flag|flags)(?:_|$)/i.test(k)) return false;
  if (/^arrow_/i.test(k)) return false;
  if (/_skin_tone|_tone[1-5]|_type-[1-6]/i.test(k)) return false;

  const keyParts = e.key.split(/[-_]/).filter(Boolean);
  if (keyParts.length > 2) return false;

  return true;
}

/** Filtered pool for the English memory game (still large for variety). */
export const ENGLISH_LEXICON_KID = ENGLISH_LEXICON.filter(isKidFriendlyEnglishEntry);

/**
 * @param {EnglishLexEntry[]} pool
 * @param {number} count
 * @param {() => number} rng
 * @returns {EnglishLexEntry[]}
 */
export function pickEnglishEntries(pool, count, rng = Math.random) {
  const bag = [...pool];
  const chosen = [];
  const n = Math.min(count, bag.length);
  while (chosen.length < n && bag.length) {
    const i = Math.floor(rng() * bag.length);
    chosen.push(bag.splice(i, 1)[0]);
  }
  return chosen;
}

/**
 * @param {EnglishLexEntry[]} entries
 * @param {() => number} [rng]
 * @returns {EnglishCard[]}
 */
export function buildEnglishDeck(entries) {
  /** @type {EnglishCard[]} */
  const cards = [];
  let n = 0;
  for (const e of entries) {
    cards.push({
      id: `e${n++}`,
      factKey: e.key,
      side: "picture",
      label: "",
      imageUrl: e.image,
      word: e.word,
    });
    cards.push({
      id: `e${n++}`,
      factKey: e.key,
      side: "word",
      label: e.word,
      imageUrl: "",
      word: e.word,
    });
  }
  return cards;
}

export { shuffle, isPairMatch } from "./game.js";