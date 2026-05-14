/**
 * Addition & subtraction memory facts.
 * @typedef {{ op: "+" | "-"; a: number; b: number; result: number; key: string }} SumFact
 * @typedef {{ id: string; factKey: string; side: "expr" | "answer"; label: string }} SumMemoryCard
 */

/**
 * Stable key per fact (addition is commutative in the key).
 * @param {"+" | "-"} op
 * @param {number} a
 * @param {number} b
 */
export function sumFactKey(op, a, b) {
  if (op === "+") {
    const x = Math.min(a, b);
    const y = Math.max(a, b);
    return `+:${x}:${y}`;
  }
  return `-:${a}:${b}`;
}

/**
 * All valid facts: addition with a,b ≥ 1 and a+b ≤ maxN; subtraction with 1 ≤ b < a ≤ maxN.
 * @param {number} maxN upper bound for operands and sums (10, 50, or 100)
 * @returns {SumFact[]}
 */
export function buildSumPool(maxN) {
  const cap = Math.min(500, Math.max(2, Math.floor(maxN)));
  /** @type {SumFact[]} */
  const pool = [];
  for (let a = 1; a <= cap; a += 1) {
    const bMax = cap - a;
    if (bMax < a) continue;
    for (let b = a; b <= bMax; b += 1) {
      pool.push({
        op: "+",
        a,
        b,
        result: a + b,
        key: sumFactKey("+", a, b),
      });
    }
  }
  for (let a = 2; a <= cap; a += 1) {
    for (let b = 1; b < a; b += 1) {
      pool.push({
        op: "-",
        a,
        b,
        result: a - b,
        key: sumFactKey("-", a, b),
      });
    }
  }
  return pool;
}

/**
 * @param {SumFact[]} pool
 * @param {number} count
 * @param {() => number} rng
 * @returns {SumFact[]}
 */
export function pickSumEntries(pool, count, rng = Math.random) {
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
 * @param {SumFact[]} entries
 * @param {() => number} rng
 * @returns {SumMemoryCard[]}
 */
export function buildSumDeck(entries, rng = Math.random) {
  /** @type {SumMemoryCard[]} */
  const cards = [];
  let n = 0;
  for (const f of entries) {
    let left = f.a;
    let right = f.b;
    if (f.op === "+" && f.a !== f.b && rng() >= 0.5) {
      left = f.b;
      right = f.a;
    }
    const expr =
      f.op === "+" ? `${left} + ${right}` : `${f.a} − ${f.b}`;
    cards.push({
      id: `s${n++}`,
      factKey: f.key,
      side: "expr",
      label: expr,
    });
    cards.push({
      id: `s${n++}`,
      factKey: f.key,
      side: "answer",
      label: String(f.result),
    });
  }
  return cards;
}
