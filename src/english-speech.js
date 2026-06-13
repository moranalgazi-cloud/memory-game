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
  const prefix = locale.slice(0, 2);
  return (
    voices.find((v) => v.lang === locale) ??
    voices.find((v) => v.lang.replace("_", "-").startsWith(prefix)) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    (lang === "he" ? voices.find((v) => /hebrew|עברית|he-IL/i.test(`${v.name} ${v.lang}`)) : null) ??
    (lang === "en"
      ? voices.find((v) => v.lang === "en-US") ?? voices.find((v) => v.lang.startsWith("en"))
      : null)
  );
}

/**
 * Wait until voices are available; for Hebrew, prefer waiting until a Hebrew voice exists.
 *
 * @param {SpeechLang} lang
 * @param {(voices: SpeechSynthesisVoice[]) => void} run
 */
function withVoices(lang, run) {
  const synth = window.speechSynthesis;
  const started = Date.now();
  const maxWaitMs = lang === "he" ? 1200 : 0;

  const attempt = () => {
    const voices = synth.getVoices();
    if (voices.length === 0) return false;
    if (lang === "he" && !pickVoice(voices, "he") && Date.now() - started < maxWaitMs) {
      return false;
    }
    run(voices);
    return true;
  };

  if (attempt()) return;

  const onVoices = () => {
    if (attempt()) synth.removeEventListener("voiceschanged", onVoices);
  };
  synth.addEventListener("voiceschanged", onVoices);
  synth.getVoices();

  if (lang === "he") {
    window.setTimeout(() => {
      synth.removeEventListener("voiceschanged", onVoices);
      attempt();
    }, maxWaitMs);
  }
}

/**
 * @param {string} phrase
 * @param {SpeechLang} lang
 * @returns {Promise<void>}
 */
function speakMemoryWordNow(phrase, lang) {
  return new Promise((resolve) => {
    withVoices(lang, (voices) => {
      const synth = window.speechSynthesis;
      if (synth.paused) synth.resume();

      const u = new SpeechSynthesisUtterance(phrase);
      u.lang = speechLocale(lang);
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
      setTimeout(finish, Math.max(3000, phrase.length * 120));

      synth.speak(u);
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
