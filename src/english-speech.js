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
/** @type {HTMLAudioElement | null} */
let fallbackTtsAudio = null;

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
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  stopFallbackTtsAudio();
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

/** @param {SpeechLang} lang */
function fallbackLocale(lang) {
  if (lang === "he") return "iw";
  if (lang === "fr") return "fr";
  if (lang === "de") return "de";
  if (lang === "es") return "es";
  return "en";
}

function stopFallbackTtsAudio() {
  if (!fallbackTtsAudio) return;
  try {
    fallbackTtsAudio.pause();
    fallbackTtsAudio.src = "";
  } catch {
    // Ignore cleanup failures from browser media stack.
  }
  fallbackTtsAudio = null;
}

/**
 * Fallback for Android WebViews where speechSynthesis is missing or silent.
 * @param {string} phrase
 * @param {SpeechLang} lang
 */
function playFallbackTtsAudio(phrase, lang) {
  if (typeof Audio === "undefined") return;
  const text = String(phrase ?? "").trim();
  if (!text) return;
  const clipped = text.slice(0, 180);
  const tl = fallbackLocale(lang);
  const url =
    "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob" +
    `&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(clipped)}`;
  stopFallbackTtsAudio();
  const audio = new Audio(url);
  audio.preload = "auto";
  fallbackTtsAudio = audio;
  void audio.play().catch(() => {});
}

/**
 * @param {string} phrase
 * @param {SpeechLang} lang
 */
function speakNow(phrase, lang) {
  const synth = window.speechSynthesis;
  if (!synth) {
    playFallbackTtsAudio(phrase, lang);
    return;
  }

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
  const isMobile = isMobileSpeechBrowser();
  let started = false;
  u.onstart = () => {
    started = true;
  };

  // iOS Safari: speak must run synchronously in the tap handler.
  // On mobile browsers we avoid cancel() because some WebViews drop the next utterance.
  if (!isMobile && synth.speaking) synth.cancel();
  synth.speak(u);

  // Some installed mobile app shells silently drop the first utterance.
  // Retry once with browser defaults if speech never started.
  if (isMobile) {
    window.setTimeout(() => {
      if (started || synth.speaking || synth.pending) return;
      playFallbackTtsAudio(phrase, lang);
    }, 180);
  }
}

/**
 * @param {string} text
 * @param {SpeechLang} [lang]
 */
export function speakMemoryWord(text, lang = "en") {
  if (typeof window === "undefined") return;
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
