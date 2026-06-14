/**
 * Read aloud memory words using the Web Speech API.
 */

/** @typedef {"en" | "he" | "fr" | "de" | "es"} SpeechLang */

/**
 * @typedef {Object} EnglishCardSpeech
 * @property {string} text
 * @property {SpeechLang} lang
 */

/** @type {SpeechSynthesisVoice[]} */
let cachedVoices = [];

let voicesPrimed = false;

/**
 * @param {{ side?: string; lang?: string; word?: string; label?: string }} card
 * @param {"english1" | "english2"} gameMode
 * @param {"both" | "text" | "none" | undefined} speechMode
 * @returns {EnglishCardSpeech | null}
 */
export function resolveEnglishCardSpeech(card, gameMode, speechMode) {
  const text = String(card?.word ?? card?.label ?? "").trim();
  if (!text || speechMode === "none" || !speechMode) return null;

  if (gameMode === "english1") {
    if (speechMode === "both") return { text, lang: "en" };
    if (speechMode === "text" && card.side === "word") return { text, lang: "en" };
    return null;
  }

  const lang = resolveEnglish2SpeechLang(card);
  if (speechMode === "both") return { text, lang };
  if (speechMode === "text" && card.side === "en") return { text, lang: "en" };
  return null;
}

/**
 * @param {{ side?: string; lang?: string }} card
 * @returns {SpeechLang}
 */
function resolveEnglish2SpeechLang(card) {
  if (card.lang === "he" || card.lang === "fr" || card.lang === "de" || card.lang === "es") {
    return card.lang;
  }
  const side = card.side ?? card.lang;
  if (side === "he" || side === "fr" || side === "de" || side === "es") {
    return /** @type {SpeechLang} */ (side);
  }
  return "en";
}

function refreshVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

/** Load voice list during a user gesture (mobile browsers need this). */
export function warmupEnglishSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis || voicesPrimed) return;
  voicesPrimed = true;
  refreshVoices();
}

/**
 * @param {{ side?: string; lang?: string; word?: string; label?: string }} card
 * @param {"english1" | "english2"} gameMode
 * @param {"both" | "text" | "none" | undefined} speechMode
 */
export function speakEnglishCard(card, gameMode, speechMode) {
  const target = resolveEnglishCardSpeech(card, gameMode, speechMode);
  if (!target) return;
  warmupEnglishSpeech();
  speakMemoryWord(target.text, target.lang);
}

export function cancelEnglishSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/** @param {SpeechLang} lang */
function speechLocale(lang) {
  if (lang === "he") return "he-IL";
  if (lang === "fr") return "fr-FR";
  if (lang === "de") return "de-DE";
  if (lang === "es") return "es-ES";
  return "en-US";
}

/** @param {string} langTag */
function langPrefix(langTag) {
  return langTag.replace("_", "-").slice(0, 2).toLowerCase();
}

/** @param {SpeechSynthesisVoice[]} voices @param {SpeechLang} lang */
function pickVoice(voices, lang) {
  const locale = speechLocale(lang);
  const prefix = locale.slice(0, 2);
  const legacyPrefix = lang === "he" ? "iw" : prefix;
  return (
    voices.find((v) => v.lang === locale) ??
    voices.find((v) => langPrefix(v.lang) === prefix) ??
    voices.find((v) => langPrefix(v.lang) === legacyPrefix) ??
    (lang === "he"
      ? voices.find((v) => /hebrew|עברית|he-IL|iw-IL/i.test(`${v.name} ${v.lang}`))
      : null) ??
    (lang === "en"
      ? voices.find((v) => v.lang === "en-US") ?? voices.find((v) => langPrefix(v.lang) === "en")
      : null)
  );
}

function isMobileSpeechBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

/**
 * @param {string} phrase
 * @param {SpeechLang} lang
 */
function speakNow(phrase, lang) {
  const synth = window.speechSynthesis;
  if (!synth) return;

  if (synth.paused) synth.resume();
  if (cachedVoices.length === 0) refreshVoices();

  const u = new SpeechSynthesisUtterance(phrase);
  u.lang = speechLocale(lang);
  // Mobile browsers can go silent when a specific voice object is forced.
  // Prefer locale-only speech there and let the browser choose the active voice.
  if (!isMobileSpeechBrowser()) {
    const voice = pickVoice(cachedVoices, lang);
    if (voice) u.voice = voice;
  }
  u.rate = lang === "he" ? 0.85 : 0.9;

  // iOS Safari: speak must run synchronously in the tap handler — no async queue.
  if (synth.speaking) synth.cancel();
  synth.speak(u);
}

/**
 * @param {string} text
 * @param {SpeechLang} [lang]
 */
export function speakMemoryWord(text, lang = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const phrase = String(text ?? "").trim();
  if (!phrase) return;
  try {
    speakNow(phrase, lang);
  } catch (e) {
    console.warn("[english-speech] speak failed:", e);
  }
}

/** @param {string} text */
export function speakEnglishMemoryWord(text) {
  speakMemoryWord(text, "en");
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}
