import { describe, it, expect } from "vitest";
import { generateRoomCode, normalizeRoomCode } from "./room-code.js";

describe("room-code", () => {
  it("generates 6-char codes", () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(normalizeRoomCode(code)).toBe(code);
  });

  it("normalizes room query input", () => {
    expect(normalizeRoomCode(" ab-12cd ")).toBe("AB12CD");
    expect(normalizeRoomCode("x")).toBe(null);
  });
});
