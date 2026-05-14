import { describe, it, expect } from "vitest";
import {
  reduceFraction,
  buildFractionPool,
  pickFractionEntries,
  buildFractionDeck,
} from "./fraction-game.js";
import { isPairMatch } from "./game.js";

describe("reduceFraction", () => {
  it("reduces to lowest terms", () => {
    expect(reduceFraction(2, 4)).toEqual({ n: 1, d: 2 });
    expect(reduceFraction(6, 9)).toEqual({ n: 2, d: 3 });
  });
});

describe("buildFractionPool", () => {
  it("dedupes equivalent fractions", () => {
    const pool = buildFractionPool(4);
    const keys = new Set(pool.map((p) => p.key));
    expect(keys.has("1/2")).toBe(true);
    expect(keys.has("2/4")).toBe(false);
  });
});

describe("buildFractionDeck", () => {
  it("pairs fraction text with diagram", () => {
    const entries = [{ key: "1/2", n: 1, d: 2, label: "1/2" }];
    const deck = buildFractionDeck(entries);
    expect(deck).toHaveLength(2);
    const a = deck.find((c) => c.side === "fraction");
    const b = deck.find((c) => c.side === "diagram");
    expect(isPairMatch(a ?? null, b ?? null)).toBe(true);
  });
});

describe("pickFractionEntries", () => {
  it("respects pool size", () => {
    const pool = buildFractionPool(6);
    const picked = pickFractionEntries(pool, 4, () => 0.3);
    expect(picked.length).toBeLessThanOrEqual(4);
  });
});
