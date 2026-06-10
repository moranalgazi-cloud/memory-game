/** @typedef {"sm" | "md" | "lg" | "xl"} StickerSize */

import { getStickerDef } from "./roadmap-albums.js";
import { getStickerArtUrl } from "./sticker-art.js";

/**
 * @param {string} stickerId
 * @param {{ size?: StickerSize; locked?: boolean; pop?: boolean; title?: string; tilt?: number }} [opts]
 * @returns {HTMLElement}
 */
export function createStickerElement(stickerId, opts = {}) {
  const { size = "md", locked = false, pop = false, title = "", tilt = 0 } = opts;
  const def = getStickerDef(stickerId);

  const el = document.createElement("div");
  el.className = `mm-sticker mm-sticker--${size}`;
  if (locked) el.classList.add("mm-sticker--locked");
  if (pop) el.classList.add("mm-sticker--pop");
  if (tilt) el.style.setProperty("--mm-tilt", `${tilt}deg`);

  const frame = document.createElement("div");
  frame.className = "mm-sticker__frame";

  const face = document.createElement("div");
  face.className = "mm-sticker__face";
  face.style.setProperty("--mm-hue", String(def.hue));

  const shine = document.createElement("span");
  shine.className = "mm-sticker__shine";
  shine.setAttribute("aria-hidden", "true");

  const artUrl = getStickerArtUrl(stickerId);
  if (artUrl) {
    el.classList.add("mm-sticker--art");
    const img = document.createElement("img");
    img.className = "mm-sticker__art";
    img.src = artUrl;
    img.alt = "";
    img.draggable = false;
    img.decoding = "async";
    face.append(img, shine);
  } else {
    const emoji = document.createElement("span");
    emoji.className = "mm-sticker__emoji";
    emoji.textContent = def.emoji;
    emoji.setAttribute("aria-hidden", "true");
    face.append(emoji, shine);
  }
  frame.append(face);
  el.append(frame);

  if (title && !locked) el.title = title;
  return el;
}

/**
 * @param {string} stickerId
 * @returns {string}
 */
export function getStickerLabel(stickerId) {
  return getStickerDef(stickerId).label;
}
