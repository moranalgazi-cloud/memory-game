import { describe, it, expect } from "vitest";
import { extractQuizFacts, buildQuizFromGame, scorePercent } from "./quiz.js";

describe("extractQuizFacts", () => {
  it("builds math questions from cards", () => {
    const cards = [
      { factKey: "2×3", side: "expr", label: "2 × 3" },
      { factKey: "2×3", side: "answer", label: "6" },
      { factKey: "4×5", side: "expr", label: "4 × 5" },
      { factKey: "4×5", side: "answer", label: "20" },
    ];
    const facts = extractQuizFacts("math", cards);
    expect(facts).toHaveLength(2);
    expect(facts[0].prompt).toContain("=");
    expect(facts.some((f) => f.answer === "6")).toBe(true);
  });

  it("builds english2 bilingual facts", () => {
    const cards = [
      { factKey: "dog", side: "he", label: "כלב", word: "כלב" },
      { factKey: "dog", side: "en", label: "Dog", word: "Dog" },
    ];
    const facts = extractQuizFacts("english2", cards);
    expect(facts).toHaveLength(1);
    expect(facts[0].prompt).toBe("כלב");
    expect(facts[0].answer).toBe("Dog");
  });
});

describe("buildQuizFromGame", () => {
  it("returns one question per pair with four choices", () => {
    const cards = [
      { factKey: "2×3", side: "expr", label: "2 × 3" },
      { factKey: "2×3", side: "answer", label: "6" },
      { factKey: "4×5", side: "expr", label: "4 × 5" },
      { factKey: "4×5", side: "answer", label: "20" },
      { factKey: "1×2", side: "expr", label: "1 × 2" },
      { factKey: "1×2", side: "answer", label: "2" },
      { factKey: "3×3", side: "expr", label: "3 × 3" },
      { factKey: "3×3", side: "answer", label: "9" },
    ];
    const quiz = buildQuizFromGame("math", cards, () => 0.5);
    expect(quiz.length).toBe(4);
    for (const q of quiz) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices[q.correctIndex]).toBeTruthy();
    }
  });
});

describe("scorePercent", () => {
  it("rounds percentage", () => {
    expect(scorePercent(3, 4)).toBe(75);
    expect(scorePercent(4, 4)).toBe(100);
  });
});
