import en from "./i18n/messages/en.js";
import he from "./i18n/messages/he.js";
import fr from "./i18n/messages/fr.js";
import de from "./i18n/messages/de.js";
import es from "./i18n/messages/es.js";
import { english1LabelKey } from "./english2-source.js";

/** @typedef {'en' | 'he' | 'fr' | 'de' | 'es'} Locale */

const STORAGE_KEY = "multiplication-memory-locale";

/** @type {Locale} */
let currentLocale = "en";

/** @type {Record<Locale, Record<string, string>>} */
const messages = { en, he, fr, de, es };

/** @type {readonly Locale[]} */
const LOCALES = ["en", "he", "fr", "de", "es"];

/** @param {unknown} value @returns {value is Locale} */
function isLocale(value) {
  return typeof value === "string" && /** @type {readonly string[]} */ (LOCALES).includes(value);
}

/** Supported UI locales; anything else falls back to English. */
/** @param {string} nav */
function localeFromNavigator(nav) {
  const n = nav.toLowerCase();
  if (n.startsWith("he")) return "he";
  if (n.startsWith("fr")) return "fr";
  if (n.startsWith("de")) return "de";
  if (n.startsWith("es")) return "es";
  return "en";
}

function applyDocumentLocale() {
  document.documentElement.lang = currentLocale;
  document.documentElement.dir = currentLocale === "he" ? "rtl" : "ltr";
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function t(key, vars = {}) {
  const table = messages[currentLocale] ?? messages.en;
  let s = table[key] ?? messages.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(String(v));
  }
  return s;
}

/** @param {"math" | "sums" | "english1" | "english2" | "fractions"} mode */
export function setPageTitleForMode(mode) {
  if (mode === "english1") document.title = t(english1LabelKey(currentLocale, "pageTitle"));
  else if (mode === "english2") document.title = t("pageTitleEnglish2");
  else if (mode === "fractions") document.title = t("pageTitleFractions");
  else if (mode === "sums") document.title = t("pageTitleSums");
  else document.title = t("pageTitleMath");
}

export function getLocale() {
  return currentLocale;
}

/** @returns {Locale} */
export function initLocale() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (isLocale(stored)) {
    currentLocale = stored;
  } else if (typeof navigator !== "undefined") {
    currentLocale = localeFromNavigator(navigator.language ?? "en");
  } else {
    currentLocale = "en";
  }
  applyDocumentLocale();
  return currentLocale;
}

/** @param {Locale} locale */
export function setLocale(locale) {
  if (!isLocale(locale)) return;
  currentLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
  applyDocumentLocale();
}
