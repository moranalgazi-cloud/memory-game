import { createSeededRng } from "./multiplayer/seeded-rng.js";

export const ALBUM_SIZE = 12;
export const ALBUM_PERIOD_DAYS = 5;

/** UTC midnight 1 Jan 2026 — album periods count in 5-day blocks from here */
const ALBUM_EPOCH_MS = Date.UTC(2026, 0, 1);

/** @typedef {"animals" | "food" | "cosmic" | "magic" | "nature" | "hero" | "ocean" | "sports" | "music"} StickerCategory */

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
  // Ocean Treasures album
  { id: "dolphin", emoji: "", label: "Happy dolphin", hue: 198, category: "ocean" },
  { id: "whale", emoji: "", label: "Blue whale", hue: 210, category: "ocean" },
  { id: "octopus", emoji: "", label: "Clever octopus", hue: 285, category: "ocean" },
  { id: "crab", emoji: "", label: "Sideways crab", hue: 12, category: "ocean" },
  { id: "shell", emoji: "", label: "Pink shell", hue: 340, category: "ocean" },
  { id: "pearl", emoji: "", label: "Ocean pearl", hue: 185, category: "ocean" },
  { id: "anchor", emoji: "", label: "Strong anchor", hue: 220, category: "ocean" },
  { id: "wave", emoji: "", label: "Big wave", hue: 205, category: "ocean" },
  { id: "fish", emoji: "", label: "Tropical fish", hue: 175, category: "ocean" },
  { id: "turtle", emoji: "", label: "Sea turtle", hue: 135, category: "ocean" },
  { id: "blowfish", emoji: "", label: "Blowfish", hue: 38, category: "ocean" },
  { id: "coral", emoji: "", label: "Coral reef", hue: 15, category: "ocean" },
  // Sports Stars album
  { id: "soccer", emoji: "", label: "Soccer star", hue: 140, category: "sports" },
  { id: "basketball", emoji: "", label: "Basketball pro", hue: 24, category: "sports" },
  { id: "tennis", emoji: "", label: "Tennis ace", hue: 88, category: "sports" },
  { id: "runner", emoji: "", label: "Fast runner", hue: 32, category: "sports" },
  { id: "skateboard", emoji: "", label: "Skateboard trick", hue: 260, category: "sports" },
  { id: "bicycle", emoji: "", label: "Bike racer", hue: 210, category: "sports" },
  { id: "baseball", emoji: "", label: "Home run", hue: 12, category: "sports" },
  { id: "volleyball", emoji: "", label: "Volleyball spike", hue: 48, category: "sports" },
  { id: "whistle", emoji: "", label: "Coach whistle", hue: 355, category: "sports" },
  { id: "podium", emoji: "", label: "Champion podium", hue: 195, category: "sports" },
  // Music Makers album
  { id: "guitar", emoji: "", label: "Rock guitar", hue: 18, category: "music" },
  { id: "drums", emoji: "", label: "Drum beat", hue: 8, category: "music" },
  { id: "piano", emoji: "", label: "Piano keys", hue: 280, category: "music" },
  { id: "microphone", emoji: "", label: "Stage mic", hue: 340, category: "music" },
  { id: "trumpet", emoji: "", label: "Golden trumpet", hue: 42, category: "music" },
  { id: "saxophone", emoji: "", label: "Jazz sax", hue: 28, category: "music" },
  { id: "violin", emoji: "", label: "Sweet violin", hue: 12, category: "music" },
  { id: "headphones", emoji: "", label: "Studio headphones", hue: 260, category: "music" },
  { id: "notes", emoji: "", label: "Music notes", hue: 300, category: "music" },
  { id: "disco", emoji: "", label: "Disco ball", hue: 195, category: "music" },
  { id: "karaoke", emoji: "", label: "Karaoke night", hue: 320, category: "music" },
  { id: "tambourine", emoji: "", label: "Tambourine shake", hue: 55, category: "music" },
];

/** Dev-only preview albums (visible to moranalgazi@gmail.com). */
export const DEV_ALBUM_IDS = ["DEV_OCEAN", "DEV_SPORTS", "DEV_MUSIC"];

/** @type {Record<string, { category: StickerCategory; stickerIds: string[] }>} */
const DEV_ALBUM_DEFINITIONS = {
  DEV_OCEAN: {
    category: "ocean",
    stickerIds: [
      "dolphin",
      "whale",
      "octopus",
      "crab",
      "shell",
      "pearl",
      "anchor",
      "wave",
      "fish",
      "turtle",
      "blowfish",
      "coral",
    ],
  },
  DEV_SPORTS: {
    category: "sports",
    stickerIds: [
      "soccer",
      "basketball",
      "tennis",
      "medal",
      "runner",
      "skateboard",
      "bicycle",
      "baseball",
      "volleyball",
      "whistle",
      "podium",
      "trophy",
    ],
  },
  DEV_MUSIC: {
    category: "music",
    stickerIds: [
      "guitar",
      "drums",
      "piano",
      "microphone",
      "trumpet",
      "saxophone",
      "violin",
      "headphones",
      "notes",
      "disco",
      "karaoke",
      "tambourine",
    ],
  },
};

/** @type {Record<StickerCategory, string>} */
export const ALBUM_THEME_KEYS = {
  animals: "albumThemeAnimals",
  food: "albumThemeFood",
  cosmic: "albumThemeCosmic",
  magic: "albumThemeMagic",
  nature: "albumThemeNature",
  hero: "albumThemeHero",
  ocean: "albumThemeOcean",
  sports: "albumThemeSports",
  music: "albumThemeMusic",
};

/** @type {Record<StickerCategory, string>} */
export const ALBUM_THEME_EMOJI = {
  animals: "🐾",
  food: "🍽️",
  cosmic: "🌌",
  magic: "✨",
  nature: "🌿",
  hero: "🦸",
  ocean: "🌊",
  sports: "🏅",
  music: "🎵",
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
function isDevAlbumId(weekId) {
  return DEV_ALBUM_IDS.includes(weekId);
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
  const devAlbum = DEV_ALBUM_DEFINITIONS[weekId];
  if (devAlbum) {
    return {
      weekId,
      slots: devAlbum.stickerIds.map((stickerId, slot) => ({ slot, stickerId })),
    };
  }

  const rng = createSeededRng(weekSeed(weekId));
  const pool = [...STICKER_POOL].filter((s) => !["ocean", "sports", "music"].includes(s.category));
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
  const devAlbum = DEV_ALBUM_DEFINITIONS[weekId];
  if (devAlbum) return devAlbum.category;

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
 * @param {string} currentPeriodId
 * @param {() => number} [rng]
 * @returns {{ albumWeek: string; stickerId: string } | null}
 */
export function pickRewardSticker(placed, pending, currentPeriodId, rng = Math.random) {
  if (isDevAlbumId(currentPeriodId)) return null;

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
 * Regular players: current 5-day album only.
 * Dev tester: current album plus three preview albums.
 *
 * @param {PlacedSticker[]} _placed
 * @param {PendingSticker[]} _pending
 * @param {string} currentPeriodId
 * @param {{ devPreview?: boolean }} [options]
 * @returns {string[]}
 */
export function listSelectableAlbumWeeks(_placed, _pending, currentPeriodId, options = {}) {
  if (options.devPreview) {
    return [currentPeriodId, ...DEV_ALBUM_IDS];
  }
  return [currentPeriodId];
}
