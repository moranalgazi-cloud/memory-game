import { describe, it, expect } from "vitest";
import {
  ENGLISH_TOPIC_IDS,
  ENGLISH_TOPICS,
  getEnglishPool,
  pickEnglishTopicId,
  pickEnglishEntries,
  buildEnglishDeck,
  isValidEnglishEntry,
  isValidBilingualEntry,
  entryLabel,
} from "./english-game.js";
import { isPairMatch } from "./game.js";

describe("ENGLISH_TOPICS", () => {
  it("has enough words per topic for hard level", () => {
    for (const topic of ENGLISH_TOPICS) {
      expect(topic.entries.length).toBeGreaterThanOrEqual(9);
    }
  });

  it("includes all category groups", () => {
    expect(ENGLISH_TOPIC_IDS.length).toBe(23);
  });

  it("requires Hebrew labels", () => {
    for (const topic of ENGLISH_TOPICS) {
      for (const e of topic.entries) {
        expect(isValidEnglishEntry(e, "he")).toBe(true);
        expect(e.wordHe.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("entryLabel", () => {
  it("returns English or Hebrew by lang", () => {
    const e = { key: "dog", word: "Dog", wordHe: "כלב", symbol: "🐕" };
    expect(entryLabel(e, "en")).toBe("Dog");
    expect(entryLabel(e, "he")).toBe("כלב");
  });
});

describe("buildEnglishDeck", () => {
  const entry = { key: "ball", word: "Ball", wordHe: "כדור", symbol: "⚽" };

  it("english1: pairs icon with English word", () => {
    const deck = buildEnglishDeck([entry], "english1");
    expect(deck).toHaveLength(2);
    const pic = deck.find((c) => c.side === "picture");
    const word = deck.find((c) => c.side === "word");
    expect(pic?.symbol).toBe("⚽");
    expect(word?.label).toBe("Ball");
    expect(isPairMatch(pic ?? null, word ?? null)).toBe(true);
  });

  it("english1: uses illustration image when provided", () => {
    const familyEntry = {
      key: "dad",
      word: "Dad",
      wordHe: "אבא",
      symbol: "👨",
      imageUrl: "/english/family/dad.svg",
    };
    const deck = buildEnglishDeck([familyEntry], "english1");
    const pic = deck.find((c) => c.side === "picture");
    expect(pic?.imageUrl).toBe("/english/family/dad.svg");
    expect(pic?.symbol).toBeUndefined();
  });

  it("english2: pairs Hebrew text with English text (no icon)", () => {
    const deck = buildEnglishDeck([entry], "english2");
    expect(deck).toHaveLength(2);
    const he = deck.find((c) => c.side === "he");
    const en = deck.find((c) => c.side === "en");
    expect(he?.symbol).toBeUndefined();
    expect(en?.symbol).toBeUndefined();
    expect(he?.label).toBe("כדור");
    expect(en?.label).toBe("Ball");
    expect(isPairMatch(he ?? null, en ?? null)).toBe(true);
    expect(isPairMatch(he ?? null, he ?? null)).toBe(false);
  });
});

describe("pickEnglishEntries", () => {
  it("filters bilingual entries for english2", () => {
    const pool = getEnglishPool("colors");
    const picked = pickEnglishEntries(pool, 6, "english2", seeded(42));
    expect(picked).toHaveLength(6);
    expect(picked.every(isValidBilingualEntry)).toBe(true);
  });
});

describe("pickEnglishTopicId", () => {
  it("returns a known topic id", () => {
    const id = pickEnglishTopicId(seeded(1));
    expect(ENGLISH_TOPIC_IDS).toContain(id);
  });
});

/** @param {number} seed */
function seeded(seed) {
  return function mulberry32() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
