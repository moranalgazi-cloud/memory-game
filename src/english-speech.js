/**
 * Read aloud memory words using the Web Speech API.
 */

/** @typedef {"en" | "he"} SpeechLang */

/**
 * @typedef {Object} EnglishCardSpeech
 * @property {string} text
 * @property {SpeechLang} lang
 */

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

  const lang = card.lang === "he" || card.side === "he" ? "he" : "en";
  if (speechMode === "both") return { text, lang };
  if (speechMode === "text" && card.side === "en") return { text, lang: "en" };
  return null;
}

/**
 * @param {{ side?: string; lang?: string; word?: string; label?: string }} card
 * @param {"english1" | "english2"} gameMode
 * @param {"both" | "text" | "none" | undefined} speechMode
 */
export function speakEnglishCard(card, gameMode, speechMode) {
  const target = resolveEnglishCardSpeech(card, gameMode, speechMode);
  if (!target) return;
  speakMemoryWord(target.text, target.lang);
}

export function cancelEnglishSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/** @param {SpeechSynthesisVoice[]} voices @param {SpeechLang} lang */
function pickVoice(voices, lang) {
  if (lang === "he") {
    return (
      voices.find((v) => v.lang === "he-IL") ??
      voices.find((v) => v.lang.startsWith("he")) ??
      null
    );
  }
  return (
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null
  );
}

/**
 * @param {(voices: SpeechSynthesisVoice[]) => void} run
 */
function withVoices(run) {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length > 0) {
    run(voices);
    return;
  }
  const onVoices = () => {
    const loaded = synth.getVoices();
    if (loaded.length === 0) return;
    synth.removeEventListener("voiceschanged", onVoices);
    run(loaded);
  };
  synth.addEventListener("voiceschanged", onVoices);
  synth.getVoices();
}

/**
 * @param {string} text
 * @param {SpeechLang} [lang]
 */
export function speakMemoryWord(text, lang = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const phrase = String(text ?? "").trim();
  if (!phrase) return;
  const synth = window.speechSynthesis;
  try {
    withVoices((voices) => {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = lang === "he" ? "he-IL" : "en-US";
      const voice = pickVoice(voices, lang);
      if (voice) u.voice = voice;
      u.rate = 0.9;
      synth.speak(u);
    });
  } catch (e) {
    console.warn("[english-speech] speak failed:", e);
  }
}

/** @param {string} text */
export function speakEnglishMemoryWord(text) {
  speakMemoryWord(text, "en");
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}
