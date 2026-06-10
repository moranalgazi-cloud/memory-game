import { listUsers } from "./user-store.js";

const PREFIX = "memory-tutorial-v1-";
const LEGACY_KEY = "memory-tutorial-v1-complete";

let migrated = false;

function migrateLegacyTutorialFlag() {
  if (migrated) return;
  migrated = true;
  try {
    if (localStorage.getItem(LEGACY_KEY) !== "1") return;
    for (const user of listUsers()) {
      localStorage.setItem(PREFIX + user.slug, "1");
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string | null | undefined} slug
 * @returns {boolean}
 */
export function hasUserCompletedTutorial(slug) {
  migrateLegacyTutorialFlag();
  if (!slug) return true;
  try {
    return localStorage.getItem(PREFIX + slug) === "1";
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} slug
 * @returns {boolean}
 */
export function markUserTutorialCompleted(slug) {
  if (!slug) return false;
  try {
    localStorage.setItem(PREFIX + slug, "1");
    return true;
  } catch {
    return false;
  }
}
