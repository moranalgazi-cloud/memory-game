import { describe, it, expect } from "vitest";
import {
  factKey,
  pickFacts,
  buildDeck,
  shuffle,
  isPairMatch,
  rngUnit,
  uniqueProductCount,
} from "./game.js";

describe("rngUnit", () => {
  it("returns a finite value in [0, 1) for a normal RNG", () => {
    const u = rngUnit(() => 0.37);
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThan(1);
  });

  it("falls back when RNG returns non-finite values", () => {
    const u = rngUnit(() => NaN);
    expect(u).toBeGreaterThanOrEqual(0);
    expect(u).toBeLessThan(1);
  });
});

describe("factKey", () => {
  it("orders factors for a stable key", () => {
    expect(factKey(5, 5)).toBe("5×5");
    expect(factKey(3, 7)).toBe("3×7");
    expect(factKey(7, 3)).toBe("3×7");
  });
});

describe("pickFacts", () => {
  it("returns the requested count without duplicates", () => {
    const rng = seeded(12345);
    const facts = pickFacts(4, 6, rng);
    expect(facts).toHaveLength(6);
    const keys = new Set(facts.map((f) => f.key));
    expect(keys.size).toBe(6);
  });

  it("never exceeds available combinations", () => {
    const facts = pickFacts(2, 99, () => 0);
    expect(facts.length).toBeLessThanOrEqual(3);
  });

  it("never picks two facts with the same product", () => {
    const facts = pickFacts(10, 9, seeded(7));
    const products = facts.map((f) => f.product);
    expect(new Set(products).size).toBe(products.length);
  });
});

describe("uniqueProductCount", () => {
  it("counts distinct products, not factor pairs", () => {
    expect(uniqueProductCount(2)).toBe(3);
    expect(uniqueProductCount(10)).toBeGreaterThanOrEqual(9);
  });
});

describe("buildDeck", () => {
  it("creates expr and answer cards per fact", () => {
    const facts = [
      { a: 2, b: 3, product: 6, key: "2×3" },
      { a: 5, b: 5, product: 25, key: "5×5" },
    ];
    const deck = buildDeck(facts, () => 0);
    expect(deck).toHaveLength(4);
    const byKey = (k) => deck.filter((c) => c.factKey === k);
    expect(byKey("2×3").map((c) => c.side).sort()).toEqual(["answer", "expr"]);
    expect(byKey("2×3").find((c) => c.side === "expr")?.label).toBe("2 × 3");
    expect(byKey("2×3").find((c) => c.side === "answer")?.label).toBe("6");
  });

  it("can swap operand order when factors differ", () => {
    const facts = [{ a: 2, b: 3, product: 6, key: "2×3" }];
    const deck = buildDeck(facts, () => 0.75);
    expect(deck.find((c) => c.side === "expr")?.label).toBe("3 × 2");
  });
});

describe("shuffle", () => {
  it("preserves length and multiset of elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(copy, seeded(99));
    expect(copy.sort((a, b) => a - b)).toEqual(arr.sort((a, b) => a - b));
  });
});

describe("isPairMatch", () => {
  const expr = { id: "a", factKey: "5×5", side: "expr", label: "5 × 5" };
  const ans = { id: "b", factKey: "5×5", side: "answer", label: "25" };
  const other = { id: "c", factKey: "2×3", side: "answer", label: "6" };

  it("matches expr with answer for same fact", () => {
    expect(isPairMatch(expr, ans)).toBe(true);
    expect(isPairMatch(ans, expr)).toBe(true);
  });

  it("rejects same card, same side, or different facts", () => {
    expect(isPairMatch(expr, expr)).toBe(false);
    expect(isPairMatch(expr, other)).toBe(false);
    expect(isPairMatch(null, expr)).toBe(false);
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
