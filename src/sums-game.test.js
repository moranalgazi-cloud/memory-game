import { describe, it, expect } from "vitest";
import {
  sumFactKey,
  buildSumPool,
  pickSumEntries,
  buildSumDeck,
} from "./sums-game.js";
import { isPairMatch } from "./game.js";

describe("sumFactKey", () => {
  it("normalizes addition order", () => {
    expect(sumFactKey("+", 2, 7)).toBe(sumFactKey("+", 7, 2));
    expect(sumFactKey("+", 3, 3)).toBe("+:3:3");
  });

  it("keeps subtraction order", () => {
    expect(sumFactKey("-", 9, 4)).toBe("-:9:4");
    expect(sumFactKey("-", 4, 9)).not.toBe(sumFactKey("-", 9, 4));
  });
});

describe("buildSumPool", () => {
  it("includes addition and subtraction within bounds", () => {
    const pool = buildSumPool(10);
    expect(pool.some((f) => f.op === "+" && f.a === 1 && f.b === 9 && f.result === 10)).toBe(
      true,
    );
    expect(pool.some((f) => f.op === "-" && f.a === 10 && f.b === 1 && f.result === 9)).toBe(
      true,
    );
    for (const f of pool) {
      if (f.op === "+") {
        expect(f.a + f.b).toBeLessThanOrEqual(10);
        expect(f.a).toBeGreaterThanOrEqual(1);
        expect(f.b).toBeGreaterThanOrEqual(1);
      } else {
        expect(f.a).toBeLessThanOrEqual(10);
        expect(f.b).toBeGreaterThanOrEqual(1);
        expect(f.b).toBeLessThan(f.a);
        expect(f.result).toBe(f.a - f.b);
      }
    }
  });
});

describe("pickSumEntries", () => {
  it("returns unique keys up to pool size", () => {
    const pool = buildSumPool(10);
    const picked = pickSumEntries(pool, 6, seeded(42));
    expect(picked).toHaveLength(6);
    expect(new Set(picked.map((p) => p.key)).size).toBe(6);
  });
});

describe("buildSumDeck", () => {
  it("pairs expr with answer for isPairMatch", () => {
    const facts = [
      { op: "+", a: 2, b: 3, result: 5, key: "+:2:3" },
      { op: "-", a: 9, b: 4, result: 5, key: "-:9:4" },
    ];
    const deck = buildSumDeck(facts, () => 0);
    expect(deck).toHaveLength(4);
    const exprA = deck.find((c) => c.factKey === "+:2:3" && c.side === "expr");
    const ansA = deck.find((c) => c.factKey === "+:2:3" && c.side === "answer");
    expect(isPairMatch(exprA ?? null, ansA ?? null)).toBe(true);
    const exprS = deck.find((c) => c.factKey === "-:9:4" && c.side === "expr");
    const ansS = deck.find((c) => c.factKey === "-:9:4" && c.side === "answer");
    expect(exprS?.label).toContain("9");
    expect(ansS?.label).toBe("5");
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
