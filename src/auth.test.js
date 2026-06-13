import { describe, expect, it } from "vitest";
import { buildOAuthRedirectUrl } from "./auth.js";

describe("buildOAuthRedirectUrl", () => {
  it("normalizes the Vite base path to a trailing slash", () => {
    expect(buildOAuthRedirectUrl("https://www.playmemorygames.win", "/")).toBe(
      "https://www.playmemorygames.win/",
    );
    expect(buildOAuthRedirectUrl("https://www.playmemorygames.win", "./")).toBe(
      "https://www.playmemorygames.win/",
    );
    expect(buildOAuthRedirectUrl("https://www.playmemorygames.win", "/memory-game/")).toBe(
      "https://www.playmemorygames.win/memory-game/",
    );
  });

  it("does not depend on the current pathname or query string", () => {
    expect(buildOAuthRedirectUrl("https://www.playmemorygames.win", "/")).toBe(
      "https://www.playmemorygames.win/",
    );
  });
});
