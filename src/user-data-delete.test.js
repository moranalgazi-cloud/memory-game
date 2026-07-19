import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_STATS_PREFIX, clearAllLocalGameData, addUser } from "./user-store.js";

vi.mock("./cloud-sync.js", () => ({
  cancelScheduledCloudSyncForSlug: vi.fn(),
  isCloudSyncEnabled: vi.fn(() => false),
  syncAllLocalUsersToCloud: vi.fn(),
}));

describe("clearAllLocalGameData", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("removes users, stats, and roadmap keys", () => {
    addUser("Alice", { ageRange: "7-8" });
    addUser("Bob", { ageRange: "9-10" });
    const users = JSON.parse(localStorage.getItem("memory-app-users-v1") ?? "[]");
    for (const u of users) {
      localStorage.setItem(USER_STATS_PREFIX + u.slug, '{"math":{}}');
      localStorage.setItem(`memory-roadmap-v2-${u.slug}`, '{"level":1}');
    }

    clearAllLocalGameData();

    expect(localStorage.getItem("memory-app-users-v1")).toBeNull();
    expect(localStorage.getItem("memory-app-current-slug-v1")).toBeNull();
    for (const u of users) {
      expect(localStorage.getItem(USER_STATS_PREFIX + u.slug)).toBeNull();
      expect(localStorage.getItem(`memory-roadmap-v2-${u.slug}`)).toBeNull();
    }
  });
});
