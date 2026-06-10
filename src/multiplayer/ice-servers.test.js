import { afterEach, describe, expect, it, vi } from "vitest";
import { FALLBACK_ICE_SERVERS, resetIceServerCache, resolveIceServers } from "./ice-servers.js";

describe("resolveIceServers", () => {
  afterEach(() => {
    resetIceServerCache();
    vi.unstubAllGlobals();
    vi.stubEnv("VITE_TURN_CREDENTIALS_URL", "");
  });

  it("returns fallback STUN when no credentials URL is configured", async () => {
    const servers = await resolveIceServers();
    expect(servers).toEqual(FALLBACK_ICE_SERVERS);
  });

  it("fetches and caches ice servers from the credentials endpoint", async () => {
    vi.stubEnv("VITE_TURN_CREDENTIALS_URL", "https://example.com/api/turn-credentials");
    const payload = {
      iceServers: [
        { urls: ["stun:stun.cloudflare.com:3478"] },
        {
          urls: ["turn:turn.cloudflare.com:3478?transport=udp"],
          username: "u",
          credential: "c",
        },
      ],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => payload,
      })),
    );

    const first = await resolveIceServers();
    const second = await resolveIceServers();
    expect(first).toHaveLength(2);
    expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back when the credentials endpoint fails", async () => {
    vi.stubEnv("VITE_TURN_CREDENTIALS_URL", "https://example.com/api/turn-credentials");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
      })),
    );

    const servers = await resolveIceServers();
    expect(servers).toEqual(FALLBACK_ICE_SERVERS);
  });
});
