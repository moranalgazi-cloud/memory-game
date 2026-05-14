import { describe, it, expect } from "vitest";
import {
  pickEnglishEntries,
  buildEnglishDeck,
  isKidFriendlyEnglishEntry,
} from "./english-game.js";
import { isPairMatch } from "./game.js";

describe("isKidFriendlyEnglishEntry", () => {
  it("rejects regional-flag image URLs", () => {
    expect(
      isKidFriendlyEnglishEntry({
        key: "somewhere",
        word: "Somewhere",
        image:
          "https://github.githubassets.com/images/icons/emoji/unicode/1f1e6-1f1e8.png?v8",
      }),
    ).toBe(false);
  });

  it("accepts short one- and two-word labels", () => {
    expect(
      isKidFriendlyEnglishEntry({
        key: "soccer",
        word: "Soccer",
        image: "https://example.com/26bd.png",
      }),
    ).toBe(true);
    expect(
      isKidFriendlyEnglishEntry({
        key: "t_rex",
        word: "T Rex",
        image: "https://example.com/trex.png",
      }),
    ).toBe(true);
  });

  it("rejects more than two words", () => {
    expect(
      isKidFriendlyEnglishEntry({
        key: "a_b_c",
        word: "A B C",
        image: "https://example.com/x.png",
      }),
    ).toBe(false);
  });

  it("rejects arrow_ keys", () => {
    expect(
      isKidFriendlyEnglishEntry({
        key: "arrow_up",
        word: "Arrow Up",
        image: "https://example.com/x.png",
      }),
    ).toBe(false);
  });
});

describe("pickEnglishEntries", () => {
  const pool = Array.from({ length: 20 }, (_, i) => ({
    key: `k${i}`,
    word: `W${i}`,
    image: `https://example.com/${i}.png`,
  }));

  it("returns unique entries up to count", () => {
    const rng = () => 0.25;
    const picked = pickEnglishEntries(pool, 8, rng);
    expect(picked).toHaveLength(8);
    const keys = new Set(picked.map((p) => p.key));
    expect(keys.size).toBe(8);
  });
});

describe("buildEnglishDeck", () => {
  it("pairs picture and word sides", () => {
    const entries = [
      { key: "ball", word: "Ball", image: "https://example.com/ball.png" },
    ];
    const deck = buildEnglishDeck(entries);
    expect(deck).toHaveLength(2);
    const pic = deck.find((c) => c.side === "picture");
    const word = deck.find((c) => c.side === "word");
    expect(pic?.imageUrl).toContain("ball.png");
    expect(word?.label).toBe("Ball");
    expect(isPairMatch(pic ?? null, word ?? null)).toBe(true);
    expect(isPairMatch(pic ?? null, pic ?? null)).toBe(false);
  });
});
