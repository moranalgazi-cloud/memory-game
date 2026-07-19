import { describe, it, expect, beforeEach } from "vitest";
import {
  ROADMAP_STORAGE_PREFIX,
  CHALLENGE_WIN_COUNT,
  LEVEL_TEMPLATES,
  loadRoadmap,
  saveRoadmap,
  onSoloWin,
  onTestPass,
  getCurrentChallenge,
  getLevelChallenge,
  getVisibleLevelRange,
  ensureDevAlbumTrayStickers,
  grantAllMissingAlbumStickers,
  DEV_ALBUM_TRAY_SIZE,
  devCompleteCurrentLevel,
  grantStarterStickerIfNeeded,
  grantBonusSticker,
  canGrantBonusSticker,
  placePendingSticker,
} from "./roadmap.js";
import {
  getAlbumPeriodId,
  getAlbumPeriodIndex,
  getDaysUntilNextAlbumPeriod,
  getAlbumDominantCategory,
  isAlbumComplete,
  CURATED_ALBUM_ROLLOUT,
  ALBUM_STICKER_SETS,
  ALBUM_SHORT_SIZE,
  ALBUM_SIZE,
  getAlbumSlotCount,
  getWeeklyAlbum,
  listSelectableAlbumWeeks,
  listReleasedAlbumPeriodIds,
  listAllAlbumPeriodIds,
  getMaxReleasedAlbumIndex,
  getLatestReleasedAlbumPeriodId,
  DEV_ALBUM_IDS,
  findSlotForSticker,
  pickRewardSticker,
} from "./roadmap-albums.js";

const SLUG = "test-player";

beforeEach(() => {
  localStorage.removeItem(`${ROADMAP_STORAGE_PREFIX}${SLUG}`);
});

describe("LEVEL_TEMPLATES", () => {
  it("starts with easy challenges and includes speed-run goals", () => {
    expect(LEVEL_TEMPLATES.length).toBeGreaterThanOrEqual(18);

    expect(LEVEL_TEMPLATES[0].goal).toMatchObject({
      type: "wins",
      mode: "english1",
      level: "easy",
    });
    expect(LEVEL_TEMPLATES[1].goal).toMatchObject({
      type: "wins",
      mode: "math",
      level: "easy",
    });
    expect(LEVEL_TEMPLATES[2].goal).toMatchObject({
      type: "wins",
      mode: "sums",
      level: "easy",
    });

    const fastGoals = LEVEL_TEMPLATES.filter((tpl) => tpl.goal.type === "fastWin");
    expect(fastGoals.length).toBeGreaterThanOrEqual(3);
    for (const tpl of fastGoals) {
      expect(tpl.goal.maxSeconds).toBeGreaterThan(0);
      expect(tpl.goal.count).toBeGreaterThanOrEqual(1);
    }

    const winTemplates = LEVEL_TEMPLATES.filter((tpl) => tpl.goal.type === "wins");
    for (const tpl of winTemplates) {
      // Extended journey levels use CHALLENGE_WIN_COUNT + 1.
      expect(tpl.goal.count).toBeLessThanOrEqual(CHALLENGE_WIN_COUNT + 1);
      expect(tpl.goal.mode).toBeTruthy();
      expect(tpl.goal.level).toBeTruthy();
      expect(tpl.preset?.mode).toBe(tpl.goal.mode);
      expect(tpl.preset?.level).toBe(tpl.goal.level);
    }
  });
});

describe("onSoloWin", () => {
  it("increments progress when mode and level match level 1", () => {
    const r1 = onSoloWin(SLUG, { mode: "english1", level: "easy" });
    expect(r1.progressed).toBe(true);
    expect(r1.completed).toBe(false);
    expect(r1.progress).toBe(1);
    expect(r1.target).toBe(CHALLENGE_WIN_COUNT);

    const state = loadRoadmap(SLUG);
    expect(state.progress).toBe(1);
    expect(state.currentLevel).toBe(1);
  });

  it("does not increment when level is wrong", () => {
    const r = onSoloWin(SLUG, { mode: "english1", level: "medium" });
    expect(r.progressed).toBe(false);
    expect(loadRoadmap(SLUG).progress).toBe(0);
  });

  it("completes level 1 after three wins and queues a pending sticker", () => {
    for (let i = 0; i < CHALLENGE_WIN_COUNT - 1; i += 1) {
      onSoloWin(SLUG, { mode: "english1", level: "easy" });
    }
    const done = onSoloWin(SLUG, { mode: "english1", level: "easy" });
    expect(done.completed).toBe(true);
    expect(done.level).toBe(1);
    expect(done.stickerId).toBeTruthy();
    expect(done.albumWeek).toBeTruthy();
    expect(done.pendingId).toBeTruthy();
    expect(done.nextLevel).toBe(2);

    const state = loadRoadmap(SLUG);
    expect(state.currentLevel).toBe(2);
    expect(state.progress).toBe(0);
    expect(state.completedLevels).toContain(1);
    expect(state.pendingStickers).toHaveLength(1);
    expect(state.placedStickers).toHaveLength(0);
    expect(getCurrentChallenge(SLUG)?.level).toBe(2);
  });

  it("progresses fast-win level only when under the time limit", () => {
    saveRoadmap(SLUG, {
      currentLevel: 4,
      progress: 0,
      completedLevels: [1, 2, 3],
      placedStickers: [],
      pendingStickers: [],
    });

    const tooSlow = onSoloWin(SLUG, {
      mode: "english1",
      level: "easy",
      elapsedMs: 60_000,
    });
    expect(tooSlow.progressed).toBe(false);

    const fast = onSoloWin(SLUG, {
      mode: "english1",
      level: "easy",
      elapsedMs: 20_000,
    });
    expect(fast.progressed).toBe(true);
    expect(fast.completed).toBe(true);
    expect(loadRoadmap(SLUG).currentLevel).toBe(5);
  });

  it("cycles after the full template set", () => {
    const cycleLength = LEVEL_TEMPLATES.length;
    saveRoadmap(SLUG, {
      currentLevel: cycleLength + 1,
      progress: 0,
      completedLevels: Array.from({ length: cycleLength }, (_, i) => i + 1),
      placedStickers: [],
      pendingStickers: [],
    });
    const challenge = getCurrentChallenge(SLUG);
    expect(challenge?.level).toBe(cycleLength + 1);
    expect(challenge?.goal).toEqual(getLevelChallenge(1).goal);
  });

  it("counts only matching mode and difficulty on level 7", () => {
    saveRoadmap(SLUG, {
      currentLevel: 7,
      progress: 0,
      completedLevels: [1, 2, 3, 4, 5, 6],
      placedStickers: [],
      pendingStickers: [],
    });

    expect(getLevelChallenge(7).goal).toMatchObject({
      type: "wins",
      mode: "english2",
      level: "easy",
      count: CHALLENGE_WIN_COUNT,
    });

    onSoloWin(SLUG, { mode: "english2", level: "easy" });
    onSoloWin(SLUG, { mode: "english2", level: "easy" });
    const wrongMode = onSoloWin(SLUG, { mode: "english1", level: "easy" });
    expect(wrongMode.progressed).toBe(false);

    const done = onSoloWin(SLUG, { mode: "english2", level: "easy" });
    expect(done.completed).toBe(true);
    expect(done.level).toBe(7);
    expect(loadRoadmap(SLUG).currentLevel).toBe(8);
  });
});

describe("onTestPass", () => {
  it("progresses level 9 on a perfect english quiz", () => {
    saveRoadmap(SLUG, {
      currentLevel: 9,
      progress: 0,
      completedLevels: [1, 2, 3, 4, 5, 6, 7, 8],
      placedStickers: [],
      pendingStickers: [],
    });

    const r = onTestPass(SLUG, { mode: "english2", perfect: true });
    expect(r.progressed).toBe(true);
    expect(r.completed).toBe(true);
    expect(r.stickerId).toBeTruthy();

    const state = loadRoadmap(SLUG);
    expect(state.currentLevel).toBe(10);
    expect(state.pendingStickers).toHaveLength(1);
    expect(state.placedStickers).toHaveLength(0);
  });
});

describe("placePendingSticker", () => {
  it("places a pending sticker on the matching album slot", () => {
    const week = getAlbumPeriodId();
    const album = getWeeklyAlbum(week);
    const stickerId = album.slots[0].stickerId;
    const slot = album.slots[0].slot;

    saveRoadmap(SLUG, {
      currentLevel: 2,
      progress: 0,
      completedLevels: [1],
      placedStickers: [],
      pendingStickers: [{ id: "p1", albumWeek: week, stickerId }],
    });

    const ok = placePendingSticker(SLUG, "p1", week, slot);
    expect(ok.ok).toBe(true);

    const state = loadRoadmap(SLUG);
    expect(state.pendingStickers).toHaveLength(0);
    expect(state.placedStickers).toHaveLength(1);
    expect(state.placedStickers[0]).toMatchObject({ albumWeek: week, slot, stickerId });
  });

  it("rejects placement on the wrong slot", () => {
    const week = getAlbumPeriodId();
    const album = getWeeklyAlbum(week);
    const stickerId = album.slots[0].stickerId;
    const wrongSlot = album.slots[1].slot;

    saveRoadmap(SLUG, {
      currentLevel: 2,
      progress: 0,
      completedLevels: [1],
      placedStickers: [],
      pendingStickers: [{ id: "p1", albumWeek: week, stickerId }],
    });

    const bad = placePendingSticker(SLUG, "p1", week, wrongSlot);
    expect(bad.ok).toBe(false);
    expect(loadRoadmap(SLUG).pendingStickers).toHaveLength(1);
  });
});

describe("devCompleteCurrentLevel", () => {
  it("completes the current level in one step", () => {
    const r = devCompleteCurrentLevel(SLUG);
    expect(r.completed).toBe(true);
    expect(r.level).toBe(1);
    expect(loadRoadmap(SLUG).currentLevel).toBe(2);
  });
});

describe("album periods", () => {
  it("lists every released period up to the current one (newest first)", () => {
    const period = getAlbumPeriodId();
    const weeks = listSelectableAlbumWeeks(
      [{ albumWeek: "P0", slot: 0, stickerId: "star" }],
      [{ id: "x", albumWeek: "P0", stickerId: "rocket" }],
      period,
    );
    expect(weeks).toEqual(listReleasedAlbumPeriodIds(period));
    expect(weeks[0]).toBe(period);
    expect(weeks[weeks.length - 1]).toBe("P0");
  });

  it("shows all nine albums when devPreview is enabled", () => {
    const period = getAlbumPeriodId();
    const weeks = listSelectableAlbumWeeks([], [], period, { devPreview: true });
    expect(weeks).toEqual(listAllAlbumPeriodIds());
    expect(weeks).toHaveLength(CURATED_ALBUM_ROLLOUT.length);
    expect(weeks).toContain("P0");
    expect(weeks).toContain("P8");
  });

  it("uses curated rollout themes for early periods", () => {
    expect(getAlbumDominantCategory("P0")).toBe(CURATED_ALBUM_ROLLOUT[0].category);
    expect(getAlbumDominantCategory("P6")).toBe("ocean");
    expect(getWeeklyAlbum("P6").slots).toHaveLength(ALBUM_STICKER_SETS.ocean.length);
  });

  it("uses eight stickers for short albums and twelve for full albums", () => {
    expect(getWeeklyAlbum("P0").slots).toHaveLength(ALBUM_SHORT_SIZE);
    expect(getWeeklyAlbum("P6").slots).toHaveLength(ALBUM_SIZE);
    expect(getWeeklyAlbum("P7").slots).toHaveLength(ALBUM_SHORT_SIZE);
  });

  it("detects a full album", () => {
    const week = "P6";
    const placed = getWeeklyAlbum(week).slots.map(({ slot, stickerId }) => ({
      albumWeek: week,
      slot,
      stickerId,
    }));
    expect(isAlbumComplete(placed, week)).toBe(true);
    expect(isAlbumComplete(placed.slice(0, 3), week)).toBe(false);
  });

  it("counts days until the next album period", () => {
    const days = getDaysUntilNextAlbumPeriod();
    expect(days).toBeGreaterThanOrEqual(1);
    expect(days).toBeLessThanOrEqual(7);
  });

  it("assigns each sticker to exactly one album", () => {
    const seen = new Set();
    for (const ids of Object.values(ALBUM_STICKER_SETS)) {
      expect(ids.length === ALBUM_SHORT_SIZE || ids.length === ALBUM_SIZE).toBe(true);
      for (const id of ids) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  });

  it("picks rewards only from the current album period", () => {
    const current = getAlbumPeriodId();
    const latest = getLatestReleasedAlbumPeriodId(current);
    const reward = pickRewardSticker([], [], [latest], () => 0);
    expect(reward).toBeTruthy();
    expect(reward.albumWeek).toBe(latest);
    const album = getWeeklyAlbum(latest);
    expect(album.slots.some((s) => s.stickerId === reward.stickerId)).toBe(true);
  });

  it("regular users only see albums released up to the current period", () => {
    expect(listReleasedAlbumPeriodIds("P0")).toEqual(["P0"]);
    expect(listReleasedAlbumPeriodIds("P2")).toEqual(["P2", "P1", "P0"]);
    expect(listReleasedAlbumPeriodIds("P0", { devPreview: true })).toHaveLength(
      CURATED_ALBUM_ROLLOUT.length,
    );
  });

  it("caps released albums once the curated catalog is fully live", () => {
    const weeks = listReleasedAlbumPeriodIds("P31");
    expect(weeks).toHaveLength(CURATED_ALBUM_ROLLOUT.length);
    expect(weeks[0]).toBe("P8");
    expect(weeks[weeks.length - 1]).toBe("P0");
    expect(getMaxReleasedAlbumIndex("P31")).toBe(8);
    expect(getLatestReleasedAlbumPeriodId("P31")).toBe("P8");
  });

  it("does not mark empty albums as complete", () => {
    expect(isAlbumComplete([], "P99")).toBe(false);
  });

  it("advances period index every 7 days from the epoch", () => {
    const epoch = new Date(Date.UTC(2026, 6, 19));
    expect(getAlbumPeriodIndex(epoch)).toBe(0);
    const day7 = new Date(Date.UTC(2026, 6, 26));
    expect(getAlbumPeriodIndex(day7)).toBe(1);
  });
});

describe("grantAllMissingAlbumStickers", () => {
  it("adds every missing sticker for the album to pending", () => {
    const week = getAlbumPeriodId();
    const album = getWeeklyAlbum(week);
    const added = grantAllMissingAlbumStickers(SLUG, week);
    expect(added).toBe(album.slots.length);

    const state = loadRoadmap(SLUG);
    expect(state.pendingStickers.filter((p) => p.albumWeek === week)).toHaveLength(album.slots.length);

    expect(grantAllMissingAlbumStickers(SLUG, week)).toBe(0);
  });
});

describe("ensureDevAlbumTrayStickers", () => {
  it("adds five draggable stickers for a dev preview album", () => {
    const count = ensureDevAlbumTrayStickers(SLUG, DEV_ALBUM_IDS[0]);
    expect(count).toBe(DEV_ALBUM_TRAY_SIZE);

    const state = loadRoadmap(SLUG);
    const pending = state.pendingStickers.filter((p) => p.albumWeek === DEV_ALBUM_IDS[0]);
    expect(pending).toHaveLength(DEV_ALBUM_TRAY_SIZE);
    expect(new Set(pending.map((p) => p.stickerId)).size).toBe(DEV_ALBUM_TRAY_SIZE);
  });

  it("tops up the tray after a sticker is placed", () => {
    ensureDevAlbumTrayStickers(SLUG, DEV_ALBUM_IDS[1]);
    const before = loadRoadmap(SLUG).pendingStickers.find((p) => p.albumWeek === DEV_ALBUM_IDS[1]);
    expect(before).toBeTruthy();

    const slotDef = findSlotForSticker(DEV_ALBUM_IDS[1], before.stickerId);
    expect(slotDef).toBeTruthy();
    placePendingSticker(SLUG, before.id, DEV_ALBUM_IDS[1], slotDef.slot);

    const count = ensureDevAlbumTrayStickers(SLUG, DEV_ALBUM_IDS[1]);
    expect(count).toBe(DEV_ALBUM_TRAY_SIZE);
  });
});

describe("getVisibleLevelRange", () => {
  it("shows levels 1-10 while on level 10", () => {
    saveRoadmap(SLUG, {
      currentLevel: 10,
      progress: 0,
      completedLevels: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      placedStickers: [],
      pendingStickers: [],
      avatarId: "bunny",
    });
    expect(getVisibleLevelRange(SLUG)).toEqual({ start: 1, end: 10 });
  });

  it("slides to levels 11-20 when the player reaches level 11", () => {
    saveRoadmap(SLUG, {
      currentLevel: 11,
      progress: 0,
      completedLevels: Array.from({ length: 10 }, (_, i) => i + 1),
      placedStickers: [],
      pendingStickers: [],
      avatarId: "bunny",
    });
    expect(getVisibleLevelRange(SLUG)).toEqual({ start: 11, end: 20 });
  });
});

describe("grantStarterStickerIfNeeded", () => {
  it("gives one pending sticker to a brand-new player", () => {
    const gift = grantStarterStickerIfNeeded(SLUG);
    expect(gift).toBeTruthy();
    expect(gift?.stickerId).toBeTruthy();
    expect(gift?.pendingId).toBeTruthy();

    const state = loadRoadmap(SLUG);
    expect(state.pendingStickers).toHaveLength(1);
    expect(state.placedStickers).toHaveLength(0);

    expect(grantStarterStickerIfNeeded(SLUG)).toBeNull();
  });
});

describe("grantBonusSticker", () => {
  it("adds a sticker from the current album when one is available", () => {
    expect(canGrantBonusSticker(SLUG)).toBe(true);
    const gift = grantBonusSticker(SLUG);
    expect(gift).toBeTruthy();
    expect(loadRoadmap(SLUG).pendingStickers).toHaveLength(1);
    expect(canGrantBonusSticker(SLUG)).toBe(true);
    grantBonusSticker(SLUG);
    expect(loadRoadmap(SLUG).pendingStickers.length).toBeGreaterThanOrEqual(2);
  });
});

describe("weekly album", () => {
  it("never awards a sticker the player already owns", () => {
    const week = getAlbumPeriodId();
    const album = getWeeklyAlbum(week);
    const ownedId = album.slots[0].stickerId;

    saveRoadmap(SLUG, {
      currentLevel: 1,
      progress: 0,
      completedLevels: [],
      placedStickers: [],
      pendingStickers: [{ id: "p0", albumWeek: week, stickerId: ownedId }],
    });

    const earned = new Set([ownedId]);
    for (let i = 0; i < 8; i += 1) {
      const result = devCompleteCurrentLevel(SLUG);
      if (!result.stickerId) break;
      expect(earned.has(result.stickerId)).toBe(false);
      earned.add(result.stickerId);
    }
  });

  it("earns at most one copy of each sticker globally", () => {
    for (let i = 0; i < 20; i += 1) {
      devCompleteCurrentLevel(SLUG);
    }
    const state = loadRoadmap(SLUG);
    const earnedIds = [
      ...state.placedStickers.map((c) => c.stickerId),
      ...state.pendingStickers.map((c) => c.stickerId),
    ];
    const unique = new Set(earnedIds);
    expect(earnedIds.length).toBe(unique.size);
  });
});
