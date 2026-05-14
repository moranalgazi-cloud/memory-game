/**
 * @typedef {{ a: number; b: number; product: number; key: string }} MultiplicationFact
 * @typedef {{ id: string; factKey: string; side: 'expr' | 'answer'; label: string }} MemoryCard
 */

/**
 * @param {number} a
 * @param {number} b
 * @returns {string}
 */
export function factKey(a, b) {
  const x = Math.min(a, b);
  const y = Math.max(a, b);
  return `${x}×${y}`;
}

/**
 * @param {number} tableMax inclusive (e.g. 9 → factors 1..9)
 * @param {number} pairCount how many distinct facts
 * @param {() => number} [rng] returns 0 <= n < 1
 * @returns {MultiplicationFact[]}
 */
export function pickFacts(tableMax, pairCount, rng = Math.random) {
  const facts = [];
  for (let a = 1; a <= tableMax; a += 1) {
    for (let b = a; b <= tableMax; b += 1) {
      facts.push({
        a,
        b,
        product: a * b,
        key: factKey(a, b),
      });
    }
  }
  const bag = [...facts];
  const chosen = [];
  while (chosen.length < pairCount && bag.length) {
    const i = Math.floor(rng() * bag.length);
    chosen.push(bag.splice(i, 1)[0]);
  }
  return chosen;
}

/**
 * @param {MultiplicationFact[]} facts
 * @param {() => number} [rng] returns 0 <= n < 1; used to randomize operand order on the card
 * @returns {MemoryCard[]}
 */
export function buildDeck(facts, rng = Math.random) {
  /** @type {MemoryCard[]} */
  const cards = [];
  let n = 0;
  for (const f of facts) {
    let left = f.a;
    let right = f.b;
    if (f.a !== f.b && rng() >= 0.5) {
      left = f.b;
      right = f.a;
    }
    const expr = `${left} × ${right}`;
    cards.push({
      id: `c${n++}`,
      factKey: f.key,
      side: "expr",
      label: expr,
    });
    cards.push({
      id: `c${n++}`,
      factKey: f.key,
      side: "answer",
      label: String(f.product),
    });
  }
  return cards;
}

/**
 * Fisher–Yates shuffle in place.
 * @template T
 * @param {T[]} arr
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffle(arr, rng = Math.random) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {MemoryCard | null} a
 * @param {MemoryCard | null} b
 * @returns {boolean}
 */
export function isPairMatch(a, b) {
  if (!a || !b) return false;
  if (a.id === b.id) return false;
  return a.factKey === b.factKey && a.side !== b.side;
}
