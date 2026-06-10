import { createSeededRng } from "./multiplayer/seeded-rng.js";

export const ALBUM_SIZE = 12;
export const ALBUM_PERIOD_DAYS = 5;

/** UTC midnight 1 Jan 2026 — album periods count in 5-day blocks from here */
const ALBUM_EPOCH_MS = Date.UTC(2026, 0, 1);

/** @typedef {"animals" | "food" | "cosmic" | "magic" | "nature" | "hero"} StickerCategory */

/** @typedef {{ id: string; emoji: string; label: string; hue: number; category: StickerCategory }} StickerDef */

/** @type {StickerDef[]} */
export const STICKER_POOL = [
  { id: "star", emoji: "⭐", label: "Shining star", hue: 45, category: "cosmic" },
  { id: "rocket", emoji: "🚀", label: "Super rocket", hue: 220, category: "cosmic" },
  { id: "rainbow", emoji: "🌈", label: "Magic rainbow", hue: 280, category: "magic" },
  { id: "trophy", emoji: "🏆", label: "Gold trophy", hue: 38, category: "hero" },
  { id: "brain", emoji: "🧠", label: "Brain boost", hue: 320, category: "magic" },
  { id: "lion", emoji: "🦁", label: "Brave lion", hue: 28, category: "animals" },
  { id: "crown", emoji: "👑", label: "Royal crown", hue: 265, category: "hero" },
  { id: "gem", emoji: "💎", label: "Rare gem", hue: 195, category: "magic" },
  { id: "unicorn", emoji: "🦄", label: "Unicorn", hue: 300, category: "animals" },
  { id: "dragon", emoji: "🐉", label: "Mini dragon", hue: 140, category: "animals" },
  { id: "comet", emoji: "☄️", label: "Comet", hue: 210, category: "cosmic" },
  { id: "shield", emoji: "🛡️", label: "Hero shield", hue: 200, category: "hero" },
  { id: "medal", emoji: "🥇", label: "Winner medal", hue: 42, category: "hero" },
  { id: "flower", emoji: "🌸", label: "Cherry bloom", hue: 340, category: "nature" },
  { id: "robot", emoji: "🤖", label: "Buddy bot", hue: 185, category: "cosmic" },
  { id: "ghost", emoji: "👻", label: "Friendly ghost", hue: 250, category: "magic" },
  { id: "pizza", emoji: "🍕", label: "Pizza power", hue: 18, category: "food" },
  { id: "cookie", emoji: "🍪", label: "Cookie champ", hue: 30, category: "food" },
  { id: "moon", emoji: "🌙", label: "Moon glow", hue: 230, category: "cosmic" },
  { id: "sun", emoji: "☀️", label: "Sun burst", hue: 48, category: "nature" },
  { id: "bolt", emoji: "⚡", label: "Lightning", hue: 55, category: "hero" },
  { id: "heart", emoji: "💖", label: "Power heart", hue: 330, category: "magic" },
  { id: "diamond", emoji: "♦️", label: "Diamond", hue: 205, category: "magic" },
  { id: "penguin", emoji: "🐧", label: "Cool penguin", hue: 200, category: "animals" },
];

/** @type {Record<StickerCategory, string>} */
export const ALBUM_THEME_KEYS = {
  animals: "albumThemeAnimals",
  food: "albumThemeFood",
  cosmic: "albumThemeCosmic",
  magic: "albumThemeMagic",
  nature: "albumThemeNature",
  hero: "albumThemeHero",
};

/** @type {Record<StickerCategory, string>} */
export const ALBUM_THEME_EMOJI = {
  animals: "🐾",
  food: "🍽️",
  cosmic: "🌌",
  magic: "✨",
  nature: "🌿",
  hero: "🦸",
};

/**
 * @typedef {{ albumWeek: string; slot: number; stickerId: string }} PlacedSticker
 * @typedef {{ id: string; albumWeek: string; stickerId: string }} PendingSticker
 * @typedef {{ weekId: string; slots: { slot: number; stickerId: string }[] }} WeeklyAlbum
 */

/**
 * Current 5-day album period id (e.g. "P12"). A new album is generated each period.
 * @param {Date} [date]
 * @returns {string}
 */
export function getAlbumPeriodId(date = new Date()) {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceEpoch = Math.floor((utcMidnight - ALBUM_EPOCH_MS) / 86400000);
  const period = Math.floor(daysSinceEpoch / ALBUM_PERIOD_DAYS);
  return `P${Math.max(0, period)}`;
}

/** @deprecated Use getAlbumPeriodId */
export function getIsoWeekId(date = new Date()) {
  return getAlbumPeriodId(date);
}

/** @param {string} weekId */
function weekSeed(weekId) {
  let h = 0;
  for (let i = 0; i < weekId.length; i += 1) {
    h = (Math.imul(31, h) + weekId.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

/**
 * @param {string} weekId
 * @returns {WeeklyAlbum}
 */
export function getWeeklyAlbum(weekId) {
  const rng = createSeededRng(weekSeed(weekId));
  const pool = [...STICKER_POOL];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, ALBUM_SIZE);
  return {
    weekId,
    slots: picked.map((s, slot) => ({ slot, stickerId: s.id })),
  };
}

/** @param {string} stickerId */
export function getStickerDef(stickerId) {
  return STICKER_POOL.find((s) => s.id === stickerId) ?? STICKER_POOL[0];
}

/**
 * @param {string} weekId
 * @returns {StickerCategory}
 */
export function getAlbumDominantCategory(weekId) {
  const album = getWeeklyAlbum(weekId);
  /** @type {Record<string, number>} */
  const counts = {};
  for (const s of album.slots) {
    const cat = getStickerDef(s.stickerId).category;
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  let best = "animals";
  let bestN = 0;
  for (const [cat, n] of Object.entries(counts)) {
    if (n > bestN) {
      best = cat;
      bestN = n;
    }
  }
  return /** @type {StickerCategory} */ (best);
}

/**
 * @param {string} weekId
 * @returns {string} i18n key
 */
export function getAlbumThemeKey(weekId) {
  return ALBUM_THEME_KEYS[getAlbumDominantCategory(weekId)];
}

/** @param {string} weekId */
export function getAlbumThemeEmoji(weekId) {
  return ALBUM_THEME_EMOJI[getAlbumDominantCategory(weekId)];
}

/**
 * @param {PlacedSticker[]} placed
 * @param {PendingSticker[]} pending
 * @param {string} albumWeek
 * @param {number} slot
 */
export function isSlotPlaced(placed, albumWeek, slot) {
  return placed.some((p) => p.albumWeek === albumWeek && p.slot === slot);
}

/**
 * @param {PlacedSticker[]} placed
 * @param {PendingSticker[]} pending
 * @param {string} stickerId
 */
export function ownsSticker(placed, pending, stickerId) {
  if (placed.some((p) => p.stickerId === stickerId)) return true;
  if (pending.some((p) => p.stickerId === stickerId)) return true;
  return false;
}

/**
 * @param {PlacedSticker[]} placed
 * @param {string} weekId
 */
export function countAlbumPlaced(placed, weekId) {
  return placed.filter((p) => p.albumWeek === weekId).length;
}

/**
 * @param {PlacedSticker[]} placed
 * @param {PendingSticker[]} pending
 * @param {string} currentWeekId
 * @param {() => number} [rng]
 * @returns {{ albumWeek: string; stickerId: string } | null}
 */
export function pickRewardSticker(placed, pending, currentPeriodId, rng = Math.random) {
  const album = getWeeklyAlbum(currentPeriodId);
  /** @type {{ albumWeek: string; stickerId: string }[]} */
  const candidates = [];
  for (const s of album.slots) {
    if (!ownsSticker(placed, pending, s.stickerId)) {
      candidates.push({ albumWeek: currentPeriodId, stickerId: s.stickerId });
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(rng() * candidates.length)];
}

/**
 * @param {string} weekId
 * @param {string} stickerId
 */
export function findSlotForSticker(weekId, stickerId) {
  const album = getWeeklyAlbum(weekId);
  return album.slots.find((s) => s.stickerId === stickerId) ?? null;
}

/**
 * @param {PlacedSticker[]} placed
 * @param {PendingSticker[]} pending
 * @param {string} currentWeekId
 * @returns {string[]}
 */
export function listSelectableAlbumWeeks(_placed, _pending, currentPeriodId) {
  return [currentPeriodId];
}
