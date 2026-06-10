/** @typedef {{ id: string; emoji: string; labelKey: string }} AdventureAvatar */

/** @type {AdventureAvatar[]} */
export const ADVENTURE_AVATARS = [
  { id: "bunny", emoji: "🐰", labelKey: "avatarBunny" },
  { id: "fox", emoji: "🦊", labelKey: "avatarFox" },
  { id: "bear", emoji: "🐻", labelKey: "avatarBear" },
  { id: "cat", emoji: "🐱", labelKey: "avatarCat" },
  { id: "dog", emoji: "🐶", labelKey: "avatarDog" },
  { id: "panda", emoji: "🐼", labelKey: "avatarPanda" },
  { id: "koala", emoji: "🐨", labelKey: "avatarKoala" },
  { id: "frog", emoji: "🐸", labelKey: "avatarFrog" },
  { id: "unicorn", emoji: "🦄", labelKey: "avatarUnicorn" },
  { id: "penguin", emoji: "🐧", labelKey: "avatarPenguin" },
];

export const DEFAULT_AVATAR_ID = "bunny";

/** @param {string | null | undefined} avatarId */
export function getAvatarById(avatarId) {
  return ADVENTURE_AVATARS.find((a) => a.id === avatarId) ?? ADVENTURE_AVATARS[0];
}

/** @param {string | null | undefined} avatarId */
export function getNextAvatarId(avatarId) {
  const idx = ADVENTURE_AVATARS.findIndex((a) => a.id === avatarId);
  const next = idx < 0 ? 0 : (idx + 1) % ADVENTURE_AVATARS.length;
  return ADVENTURE_AVATARS[next].id;
}

/**
 * @param {string} avatarId
 * @param {(key: string) => string} t
 */
export function createAvatarElement(avatarId, t) {
  const def = getAvatarById(avatarId);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "adventure-avatar";
  btn.dataset.avatarId = def.id;
  btn.title = t("roadmapChangeAvatar");
  btn.setAttribute("aria-label", t("roadmapChangeAvatar"));

  const face = document.createElement("span");
  face.className = "adventure-avatar__emoji";
  face.textContent = def.emoji;
  face.setAttribute("aria-hidden", "true");

  const ring = document.createElement("span");
  ring.className = "adventure-avatar__ring";
  ring.setAttribute("aria-hidden", "true");

  btn.append(ring, face);
  return btn;
}
