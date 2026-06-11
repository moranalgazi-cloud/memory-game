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
  DEV_ALBUM_TRAY_SIZE,
  devCompleteCurrentLevel,
  grantStarterStickerIfNeeded,
  placePendingSticker,
} from "./roadmap.js";
import {
  getAlbumPeriodId,
  ALBUM_SIZE,
  getWeeklyAlbum,
  listSelectableAlbumWeeks,
  DEV_ALBUM_IDS,
  findSlotForSticker,
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
      expect(tpl.goal.count).toBeLessThanOrEqual(3);
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
  it("shows only the current period album in the picker", () => {
    const period = getAlbumPeriodId();
    const weeks = listSelectableAlbumWeeks(
      [{ albumWeek: "P0", slot: 0, stickerId: "star" }],
      [{ id: "x", albumWeek: "P0", stickerId: "rocket" }],
      period,
    );
    expect(weeks).toEqual([period]);
  });

  it("shows dev preview albums when devPreview is enabled", () => {
    const period = getAlbumPeriodId();
    const weeks = listSelectableAlbumWeeks([], [], period, { devPreview: true });
    expect(weeks).toEqual([period, ...DEV_ALBUM_IDS]);
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

  it("earns at most one copy of each sticker per week", () => {
    const week = getAlbumPeriodId();
    for (let i = 0; i < ALBUM_SIZE + 2; i += 1) {
      devCompleteCurrentLevel(SLUG);
    }
    const state = loadRoadmap(SLUG);
    const earnedIds = [
      ...state.placedStickers.filter((c) => c.albumWeek === week).map((c) => c.stickerId),
      ...state.pendingStickers.filter((c) => c.albumWeek === week).map((c) => c.stickerId),
    ];
    const unique = new Set(earnedIds);
    expect(unique.size).toBeLessThanOrEqual(ALBUM_SIZE);
    expect(earnedIds.length).toBe(unique.size);
  });
});
