export const ALBUM_SIZE = 12;
/** Sticker count for albums that are not full 12-sticker sets */
export const ALBUM_SHORT_SIZE = 8;
export const ALBUM_PERIOD_DAYS = 5;

/** UTC midnight on rollout launch day — period P0 starts here; new album every 5 days */
const ALBUM_EPOCH_MS = Date.UTC(2026, 5, 9);

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
  { id: "elephant", emoji: "", label: "Happy elephant", hue: 165, category: "animals" },
  { id: "fox", emoji: "", label: "Clever fox", hue: 22, category: "animals" },
  { id: "owl", emoji: "", label: "Wise owl", hue: 35, category: "animals" },
  { id: "koala", emoji: "", label: "Sleepy koala", hue: 145, category: "animals" },
  { id: "burger", emoji: "", label: "Mega burger", hue: 26, category: "food" },
  { id: "cupcake", emoji: "", label: "Sweet cupcake", hue: 330, category: "food" },
  { id: "icecream", emoji: "", label: "Ice cream cone", hue: 195, category: "food" },
  { id: "apple", emoji: "", label: "Shiny apple", hue: 8, category: "food" },
  { id: "donut", emoji: "", label: "Sprinkle donut", hue: 310, category: "food" },
  { id: "taco", emoji: "", label: "Tasty taco", hue: 88, category: "food" },
  { id: "planet", emoji: "", label: "Ringed planet", hue: 240, category: "cosmic" },
  { id: "satellite", emoji: "", label: "Space satellite", hue: 200, category: "cosmic" },
  { id: "alien", emoji: "", label: "Friendly alien", hue: 130, category: "cosmic" },
  { id: "wand", emoji: "", label: "Magic wand", hue: 275, category: "magic" },
  { id: "potion", emoji: "", label: "Spark potion", hue: 290, category: "magic" },
  { id: "tree", emoji: "", label: "Big oak tree", hue: 125, category: "nature" },
  { id: "butterfly", emoji: "", label: "Rainbow butterfly", hue: 300, category: "nature" },
  { id: "mushroom", emoji: "", label: "Forest mushroom", hue: 12, category: "nature" },
  { id: "raindrop", emoji: "", label: "Fresh raindrop", hue: 205, category: "nature" },
  { id: "leaf", emoji: "", label: "Green leaf", hue: 100, category: "nature" },
  { id: "bee", emoji: "", label: "Busy bee", hue: 48, category: "nature" },
  { id: "cape", emoji: "", label: "Hero cape", hue: 350, category: "hero" },
  { id: "mask", emoji: "", label: "Mystery mask", hue: 220, category: "hero" },
  { id: "sword", emoji: "", label: "Brave sword", hue: 210, category: "hero" },
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

/**
 * Exclusive sticker set per album theme. Each sticker id appears in exactly one album.
 * @type {Record<StickerCategory, string[]>}
 */
export const ALBUM_STICKER_SETS = {
  animals: ["lion", "unicorn", "dragon", "penguin", "elephant", "fox", "owl", "koala"],
  food: ["pizza", "cookie", "burger", "cupcake", "icecream", "apple", "donut", "taco"],
  cosmic: ["star", "rocket", "comet", "robot", "moon", "planet", "satellite", "alien"],
  magic: ["rainbow", "brain", "gem", "ghost", "heart", "diamond", "wand", "potion"],
  nature: ["flower", "sun", "tree", "butterfly", "mushroom", "raindrop", "leaf", "bee"],
  hero: ["trophy", "crown", "shield", "medal", "bolt", "cape", "mask", "sword"],
  ocean: [
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
  sports: [
    "soccer",
    "basketball",
    "tennis",
    "runner",
    "skateboard",
    "bicycle",
    "baseball",
    "volleyball",
  ],
  music: [
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
};

/** Dev-only preview album ids (same sticker sets as rollout periods 6–8). */
export const DEV_ALBUM_IDS = ["DEV_OCEAN", "DEV_SPORTS", "DEV_MUSIC"];

/** @type {Record<string, { category: StickerCategory; stickerIds: string[] }>} */
const DEV_ALBUM_DEFINITIONS = {
  DEV_OCEAN: { category: "ocean", stickerIds: ALBUM_STICKER_SETS.ocean },
  DEV_SPORTS: { category: "sports", stickerIds: ALBUM_STICKER_SETS.sports },
  DEV_MUSIC: { category: "music", stickerIds: ALBUM_STICKER_SETS.music },
};

/**
 * Curated albums released in order — one new album every {@link ALBUM_PERIOD_DAYS} days.
 * Period P0 → index 0, P1 → index 1, and so on. No server scheduler needed: the client
 * derives the active period from UTC date vs {@link ALBUM_EPOCH_MS}.
 *
 * @type {{ category: StickerCategory }[]}
 */
export const CURATED_ALBUM_ROLLOUT = [
  { category: "animals" },
  { category: "food" },
  { category: "cosmic" },
  { category: "magic" },
  { category: "nature" },
  { category: "hero" },
  { category: "ocean" },
  { category: "sports" },
  { category: "music" },
];

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
  const period = getAlbumPeriodIndex(date);
  return `P${Math.max(0, period)}`;
}

/** @param {Date} [date] */
export function getAlbumPeriodIndex(date = new Date()) {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceEpoch = Math.floor((utcMidnight - ALBUM_EPOCH_MS) / 86400000);
  return Math.max(0, Math.floor(daysSinceEpoch / ALBUM_PERIOD_DAYS));
}

/**
 * Whole days until the next album period starts (1–5).
 * @param {Date} [date]
 */
export function getDaysUntilNextAlbumPeriod(date = new Date()) {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceEpoch = Math.floor((utcMidnight - ALBUM_EPOCH_MS) / 86400000);
  const dayInPeriod =
    ((daysSinceEpoch % ALBUM_PERIOD_DAYS) + ALBUM_PERIOD_DAYS) % ALBUM_PERIOD_DAYS;
  return ALBUM_PERIOD_DAYS - dayInPeriod;
}

/** @param {string} periodId e.g. "P12" */
export function parseAlbumPeriodIndex(periodId) {
  const match = /^P(\d+)$/.exec(periodId);
  if (!match) return -1;
  return Number(match[1]);
}

/** Last curated album period index (P0 … P8 for nine albums). */
export function getMaxCuratedAlbumIndex() {
  return CURATED_ALBUM_ROLLOUT.length - 1;
}

/**
 * Highest album period index released to players (capped to curated catalog).
 * @param {string} currentPeriodId
 */
export function getMaxReleasedAlbumIndex(currentPeriodId) {
  const currentIdx = parseAlbumPeriodIndex(currentPeriodId);
  if (currentIdx < 0) return 0;
  return Math.min(currentIdx, getMaxCuratedAlbumIndex());
}

/** Newest released period id, e.g. P8 once the full catalog is live. */
export function getLatestReleasedAlbumPeriodId(currentPeriodId = getAlbumPeriodId()) {
  return `P${getMaxReleasedAlbumIndex(currentPeriodId)}`;
}

/**
 * All curated album period ids (newest first), for admin / dev preview.
 * @returns {string[]}
 */
export function listAllAlbumPeriodIds() {
  /** @type {string[]} */
  const ids = [];
  for (let i = getMaxCuratedAlbumIndex(); i >= 0; i -= 1) {
    ids.push(`P${i}`);
  }
  return ids;
}

/**
 * Album period ids released so far (newest first), capped to {@link CURATED_ALBUM_ROLLOUT}.
 * @param {string} currentPeriodId
 * @param {{ devPreview?: boolean }} [options]
 */
export function listReleasedAlbumPeriodIds(currentPeriodId, options = {}) {
  if (options.devPreview) {
    return listAllAlbumPeriodIds();
  }

  const maxIdx = getMaxReleasedAlbumIndex(currentPeriodId);
  /** @type {string[]} */
  const ids = [];
  for (let i = maxIdx; i >= 0; i -= 1) ids.push(`P${i}`);
  return ids;
}

/** @deprecated Use getAlbumPeriodId */
export function getIsoWeekId(date = new Date()) {
  return getAlbumPeriodId(date);
}

/** @param {string} weekId */
function isDevAlbumId(weekId) {
  return DEV_ALBUM_IDS.includes(weekId);
}

/**
 * @param {StickerCategory} category
 * @returns {WeeklyAlbum["slots"]}
 */
function slotsForCategory(category) {
  const stickerIds = ALBUM_STICKER_SETS[category] ?? [];
  return stickerIds.map((stickerId, slot) => ({ slot, stickerId }));
}

/**
 * @param {string} weekId
 * @returns {WeeklyAlbum}
 */
export function getWeeklyAlbum(weekId) {
  const devAlbum = DEV_ALBUM_DEFINITIONS[weekId];
  if (devAlbum) {
    return { weekId, slots: slotsForCategory(devAlbum.category) };
  }

  const periodIdx = parseAlbumPeriodIndex(weekId);
  if (periodIdx >= 0 && periodIdx <= getMaxCuratedAlbumIndex()) {
    const theme = CURATED_ALBUM_ROLLOUT[periodIdx];
    if (theme) return { weekId, slots: slotsForCategory(theme.category) };
  }

  return { weekId, slots: [] };
}

/** @param {string} weekId */
export function getAlbumSlotCount(weekId) {
  return getWeeklyAlbum(weekId).slots.length;
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

  const periodIdx = parseAlbumPeriodIndex(weekId);
  if (periodIdx >= 0 && periodIdx <= getMaxCuratedAlbumIndex()) {
    const theme = CURATED_ALBUM_ROLLOUT[periodIdx];
    if (theme) return theme.category;
  }

  return "animals";
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

/** @param {PlacedSticker[]} placed @param {string} weekId */
export function isAlbumComplete(placed, weekId) {
  const target = getAlbumSlotCount(weekId);
  if (target <= 0) return false;
  return countAlbumPlaced(placed, weekId) >= target;
}

/**
 * Pick a random unowned sticker from any released album the player has access to.
 *
 * @param {PlacedSticker[]} placed
 * @param {PendingSticker[]} pending
 * @param {string[]} openAlbumWeekIds Released period ids (e.g. P0…Pcurrent), newest-first ok
 * @param {() => number} [rng]
 * @returns {{ albumWeek: string; stickerId: string } | null}
 */
export function pickRewardSticker(placed, pending, openAlbumWeekIds, rng = Math.random) {
  /** @type {{ albumWeek: string; stickerId: string }[]} */
  const candidates = [];
  for (const albumWeek of openAlbumWeekIds) {
    if (isDevAlbumId(albumWeek)) continue;
    const album = getWeeklyAlbum(albumWeek);
    for (const s of album.slots) {
      if (!ownsSticker(placed, pending, s.stickerId)) {
        candidates.push({ albumWeek, stickerId: s.stickerId });
      }
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
 * All album periods released so far (newest first). A new period unlocks every
 * {@link ALBUM_PERIOD_DAYS} days automatically — no server scheduler required.
 *
 * @param {PlacedSticker[]} _placed
 * @param {PendingSticker[]} _pending
 * @param {string} currentPeriodId
 * @param {{ devPreview?: boolean }} [options]
 * @returns {string[]}
 */
export function listSelectableAlbumWeeks(_placed, _pending, currentPeriodId, options = {}) {
  return listReleasedAlbumPeriodIds(currentPeriodId, options);
}
