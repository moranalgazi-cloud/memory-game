import { describe, it, expect } from "vitest";
import { resolveEnglishCardSpeech } from "./english-speech.js";

describe("resolveEnglishCardSpeech", () => {
  it("english2 easy speaks Hebrew and English tiles", () => {
    const he = resolveEnglishCardSpeech(
      { side: "he", lang: "he", word: "כדור", label: "כדור" },
      "english2",
      "both",
    );
    const en = resolveEnglishCardSpeech(
      { side: "en", lang: "en", word: "Ball", label: "Ball" },
      "english2",
      "both",
    );
    expect(he).toEqual({ text: "כדור", lang: "he" });
    expect(en).toEqual({ text: "Ball", lang: "en" });
  });

  it("english2 medium speaks only English tiles", () => {
    expect(
      resolveEnglishCardSpeech({ side: "he", lang: "he", word: "כדור" }, "english2", "text"),
    ).toBeNull();
    expect(
      resolveEnglishCardSpeech({ side: "en", lang: "en", word: "Ball" }, "english2", "text"),
    ).toEqual({ text: "Ball", lang: "en" });
  });

  it("english2 easy uses card.lang for Hebrew tiles", () => {
    expect(
      resolveEnglishCardSpeech({ side: "he", lang: "he", word: "כדור" }, "english2", "both"),
    ).toEqual({ text: "כדור", lang: "he" });
  });

  it("english1 easy speaks every tile in English", () => {
    expect(
      resolveEnglishCardSpeech({ side: "picture", word: "Ball" }, "english1", "both"),
    ).toEqual({ text: "Ball", lang: "en" });
    expect(
      resolveEnglishCardSpeech({ side: "word", word: "Ball" }, "english1", "both"),
    ).toEqual({ text: "Ball", lang: "en" });
  });
});
