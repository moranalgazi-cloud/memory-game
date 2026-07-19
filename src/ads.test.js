import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("ads", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled on web even when VITE_ADS_ENABLED is true", async () => {
    vi.stubEnv("VITE_ADS_ENABLED", "true");
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => false,
        getPlatform: () => "web",
      },
    }));
    const { isAdsSupported } = await import("./ads.js");
    expect(isAdsSupported()).toBe(false);
  });

  it("is enabled on Android native when VITE_ADS_ENABLED is true", async () => {
    vi.stubEnv("VITE_ADS_ENABLED", "true");
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => "android",
      },
    }));
    const { isAdsSupported } = await import("./ads.js");
    expect(isAdsSupported()).toBe(true);
  });
});
