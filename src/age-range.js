/** @typedef {'5_6' | '7_8' | '9_10' | '10_11' | '12_plus'} AgeRange */

/** @type {readonly AgeRange[]} */
export const AGE_RANGE_VALUES = ["5_6", "7_8", "9_10", "10_11", "12_plus"];

/** @param {unknown} value */
export function isValidAgeRange(value) {
  return typeof value === "string" && /** @type {readonly string[]} */ (AGE_RANGE_VALUES).includes(value);
}

/** @param {AgeRange} range @param {(key: string) => string} t */
export function ageRangeLabel(range, t) {
  return t(`ageRange_${range}`);
}
