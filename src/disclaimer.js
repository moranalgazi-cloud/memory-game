/** Bump when disclaimer text changes materially and re-acceptance is required. */
export const DISCLAIMER_VERSION = "1";

const STORAGE_KEY = "memory-disclaimer-accepted";

/** @returns {boolean} */
export function hasAcceptedDisclaimer() {
  try {
    return localStorage.getItem(STORAGE_KEY) === DISCLAIMER_VERSION;
  } catch {
    return false;
  }
}

/** @returns {boolean} */
export function setDisclaimerAccepted() {
  try {
    localStorage.setItem(STORAGE_KEY, DISCLAIMER_VERSION);
    return true;
  } catch {
    return false;
  }
}
