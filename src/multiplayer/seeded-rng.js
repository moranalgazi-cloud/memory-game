/**
 * Deterministic RNG in [0, 1) from a numeric seed (same deck on host and guest).
 * @param {number} seed
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
