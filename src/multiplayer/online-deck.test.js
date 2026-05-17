import { describe, it, expect } from "vitest";
import {
  buildOnlineHostConfig,
  buildOnlineDeckFromSeed,
  inferOnlineModeFromCards,
  deckMatchesOnlineMode,
} from "./online-deck.js";

describe("buildOnlineDeckFromSeed", () => {
  it("builds identical math decks for the same seed", () => {
    const config = buildOnlineHostConfig("math", "easy");
    const a = buildOnlineDeckFromSeed(config, 42);
    const b = buildOnlineDeckFromSeed(config, 42);
    expect(a.cards.map((c) => c.id)).toEqual(b.cards.map((c) => c.id));
    expect(a.config.tableMax).toBe(5);
    expect(a.config.mode).toBe("math");
  });

  it("applies easy math level limits", () => {
    const config = buildOnlineHostConfig("math", "easy");
    const { cards, config: out } = buildOnlineDeckFromSeed(config, 7);
    expect(out.tableMax).toBe(5);
    expect(out.pairCount).toBe(4);
    expect(out.mode).toBe("math");
    expect(cards.length).toBe(8);
    expect(deckMatchesOnlineMode(cards, "math")).toBe(true);
  });

  it("english1 uses picture + word cards", () => {
    const config = buildOnlineHostConfig("english1", "easy");
    const { cards, config: out } = buildOnlineDeckFromSeed(config, 99);
    expect(out.mode).toBe("english1");
    const sides = new Set(cards.map((c) => c.side));
    expect(sides.has("picture")).toBe(true);
    expect(sides.has("word")).toBe(true);
    expect(sides.has("he")).toBe(false);
    expect(sides.has("en")).toBe(false);
    expect(inferOnlineModeFromCards(cards)).toBe("english1");
  });

  it("english2 uses Hebrew + English text cards (not icons)", () => {
    const config = buildOnlineHostConfig("english2", "easy");
    const { cards, config: out } = buildOnlineDeckFromSeed(config, 99);
    expect(out.mode).toBe("english2");
    const sides = new Set(cards.map((c) => c.side));
    expect(sides.has("he")).toBe(true);
    expect(sides.has("en")).toBe(true);
    expect(sides.has("picture")).toBe(false);
    expect(inferOnlineModeFromCards(cards)).toBe("english2");
  });

  it("english1 and english2 produce different card shapes for the same seed", () => {
    const e1 = buildOnlineDeckFromSeed(buildOnlineHostConfig("english1", "easy"), 123);
    const e2 = buildOnlineDeckFromSeed(buildOnlineHostConfig("english2", "easy"), 123);
    expect(inferOnlineModeFromCards(e1.cards)).toBe("english1");
    expect(inferOnlineModeFromCards(e2.cards)).toBe("english2");
    const e1Sides = new Set(e1.cards.map((c) => c.side));
    const e2Sides = new Set(e2.cards.map((c) => c.side));
    expect(e1Sides.has("picture")).toBe(true);
    expect(e2Sides.has("he")).toBe(true);
  });

  it("builds sums decks", () => {
    const config = buildOnlineHostConfig("sums", "easy");
    const { cards, config: out } = buildOnlineDeckFromSeed(config, 11);
    expect(out.mode).toBe("sums");
    expect(inferOnlineModeFromCards(cards)).toBe("sums");
    expect(cards.some((c) => c.side === "expr")).toBe(true);
  });

  it("builds fraction decks", () => {
    const config = buildOnlineHostConfig("fractions", "easy");
    const { cards, config: out } = buildOnlineDeckFromSeed(config, 11);
    expect(out.mode).toBe("fractions");
    expect(inferOnlineModeFromCards(cards)).toBe("fractions");
    expect(cards.some((c) => c.side === "diagram")).toBe(true);
  });
});
