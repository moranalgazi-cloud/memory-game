/** @typedef {'he' | 'fr' | 'de' | 'es'} English2SourceLang */

const STORAGE_KEY = "memory-english2-source-v1";

/** @type {readonly English2SourceLang[]} */
export const ENGLISH2_SOURCE_LANGS = ["he", "fr", "de", "es"];

/** @param {unknown} value */
export function isEnglish2SourceLang(value) {
  return typeof value === "string" && /** @type {readonly string[]} */ (ENGLISH2_SOURCE_LANGS).includes(value);
}

/** English 2 translates another language → English; redundant when UI is already English. */
/** @param {import("./i18n.js").Locale} uiLocale */
export function isEnglish2ModeAvailable(uiLocale) {
  return uiLocale !== "en";
}

/** @typedef {"mode" | "title" | "pageTitle" | "records"} English1LabelKind */

/** @type {Record<English1LabelKind, { short: string; full: string }>} */
const ENGLISH1_LABEL_KEYS = {
  mode: { short: "modeEnglish", full: "modeEnglish1" },
  title: { short: "titleEnglish", full: "titleEnglish1" },
  pageTitle: { short: "pageTitleEnglish", full: "pageTitleEnglish1" },
  records: { short: "recordsEnglish", full: "recordsEnglish1" },
};

/**
 * i18n key for English 1 labels — short "English" when English 2 is hidden (UI locale en).
 * @param {import("./i18n.js").Locale} uiLocale
 * @param {English1LabelKind} kind
 */
export function english1LabelKey(uiLocale, kind) {
  const pair = ENGLISH1_LABEL_KEYS[kind];
  return isEnglish2ModeAvailable(uiLocale) ? pair.full : pair.short;
}

/** @param {import("./i18n.js").Locale} uiLocale */
export function defaultEnglish2SourceForLocale(uiLocale) {
  if (uiLocale === "he") return "he";
  if (uiLocale === "fr") return "fr";
  if (uiLocale === "de") return "de";
  if (uiLocale === "es") return "es";
  return "he";
}

/** @returns {English2SourceLang} */
export function getEnglish2SourceLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isEnglish2SourceLang(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "he";
}

/** Set default source language from UI locale when the user has not chosen one yet. */
export function initEnglish2SourceFromLocale(uiLocale) {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch {
    /* ignore */
  }
  setEnglish2SourceLang(defaultEnglish2SourceForLocale(uiLocale));
}

/** @param {English2SourceLang} lang */
export function setEnglish2SourceLang(lang) {
  if (!isEnglish2SourceLang(lang)) return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
}

/** @param {English2SourceLang} lang @param {(key: string) => string} t */
export function english2SourceLangName(lang, t) {
  return t(`langName_${lang}`);
}

/** @param {English2SourceLang} lang */
export function english2SourceIsRtl(lang) {
  return lang === "he";
}
