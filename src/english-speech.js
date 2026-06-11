/**
 * Read aloud memory words using the Web Speech API.
 */

/** @typedef {"en" | "he" | "fr" | "de" | "es"} SpeechLang */

/**
 * @typedef {Object} EnglishCardSpeech
 * @property {string} text
 * @property {SpeechLang} lang
 */

/** @type {Promise<void>} */
let speakChain = Promise.resolve();

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

  const side = card.side ?? card.lang;
  const lang =
    side === "he" || side === "fr" || side === "de" || side === "es"
      ? /** @type {SpeechLang} */ (side)
      : "en";
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
  speakChain = Promise.resolve();
}

/** @param {SpeechLang} lang */
function speechLocale(lang) {
  if (lang === "he") return "he-IL";
  if (lang === "fr") return "fr-FR";
  if (lang === "de") return "de-DE";
  if (lang === "es") return "es-ES";
  return "en-US";
}

/** @param {SpeechSynthesisVoice[]} voices @param {SpeechLang} lang */
function pickVoice(voices, lang) {
  const locale = speechLocale(lang);
  return (
    voices.find((v) => v.lang === locale) ??
    voices.find((v) => v.lang.startsWith(locale.slice(0, 2))) ??
    (lang === "he" ? voices.find((v) => /hebrew|עברית/i.test(v.name)) : null) ??
    (lang === "en"
      ? voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en"))
      : null)
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
 * @param {string} phrase
 * @param {SpeechLang} lang
 * @returns {Promise<void>}
 */
function speakMemoryWordNow(phrase, lang) {
  return new Promise((resolve) => {
    withVoices((voices) => {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();

      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = lang === "he" ? "he-IL" : "en-US";
      const voice = pickVoice(voices, lang);
      if (voice) u.voice = voice;
      u.rate = lang === "he" ? 0.85 : 0.9;

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, Math.max(2500, phrase.length * 100));

      synth.speak(u);

      if (lang === "he" && !voice) {
        window.setTimeout(() => {
          const retryVoices = synth.getVoices();
          const retryVoice = pickVoice(retryVoices, "he");
          if (!retryVoice || done) return;
          const retry = new SpeechSynthesisUtterance(phrase);
          retry.lang = "he-IL";
          retry.voice = retryVoice;
          retry.rate = 0.85;
          retry.onend = finish;
          retry.onerror = finish;
          synth.speak(retry);
        }, 250);
      }
    });
  });
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
    speakChain = speakChain
      .then(() => speakMemoryWordNow(phrase, lang))
      .catch((e) => {
        console.warn("[english-speech] speak failed:", e);
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
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}
