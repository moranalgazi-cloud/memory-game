/**
 * Read aloud memory words using the Web Speech API.
 */

export function cancelEnglishSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * @param {string} text
 * @param {"en" | "he"} [lang]
 */
export function speakMemoryWord(text, lang = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const phrase = String(text ?? "").trim();
  if (!phrase) return;
  const synth = window.speechSynthesis;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = lang === "he" ? "he-IL" : "en-US";
    u.rate = 0.9;
    synth.speak(u);
  } catch (e) {
    console.warn("[english-speech] speak failed:", e);
  }
}

/** @param {string} text */
export function speakEnglishMemoryWord(text) {
  speakMemoryWord(text, "en");
}
