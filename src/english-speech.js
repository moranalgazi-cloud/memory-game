/**
 * Read aloud the English memory word (picture or text card) using the Web Speech API.
 */

export function cancelEnglishSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * @param {string} text
 */
export function speakEnglishMemoryWord(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const phrase = String(text ?? "").trim();
  if (!phrase) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(phrase);
  u.lang = "en-US";
  u.rate = 0.9;
  synth.speak(u);
}
