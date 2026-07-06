import roadmapMapArt from "../docs/images/adventure/roadmap-map.jpg?url";
import albumAnimals from "../docs/images/adventure/album-animals.png?url";
import albumFood from "../docs/images/adventure/album-food.png?url";
import albumCosmic from "../docs/images/adventure/album-cosmic.png?url";
import albumMagic from "../docs/images/adventure/album-magic.png?url";
import albumNature from "../docs/images/adventure/album-nature.png?url";
import albumHero from "../docs/images/adventure/album-hero.png?url";
import albumOcean from "../docs/images/adventure/album-ocean.png?url";
import albumSports from "../docs/images/adventure/album-sports.png?url";
import albumMusic from "../docs/images/adventure/album-music.png?url";

export { roadmapMapArt };

/** Warm browser cache so the adventure map appears quickly when opened. */
const roadmapMapPreloadImg =
  typeof Image !== "undefined" ? new Image() : null;
if (roadmapMapPreloadImg) {
  roadmapMapPreloadImg.decoding = "async";
  roadmapMapPreloadImg.src = roadmapMapArt;
}

/** @returns {Promise<void>} */
export function preloadRoadmapMapArt() {
  if (!roadmapMapPreloadImg) return Promise.resolve();
  if (roadmapMapPreloadImg.complete && roadmapMapPreloadImg.naturalWidth > 0) {
    return roadmapMapPreloadImg.decode?.() ?? Promise.resolve();
  }
  return new Promise((resolve) => {
    roadmapMapPreloadImg.addEventListener("load", () => resolve(), { once: true });
    roadmapMapPreloadImg.addEventListener("error", () => resolve(), { once: true });
  });
}

/** @type {Partial<Record<import("./roadmap-albums.js").StickerCategory, string>>} */
export const ALBUM_COVER_URLS = {
  animals: albumAnimals,
  food: albumFood,
  cosmic: albumCosmic,
  magic: albumMagic,
  nature: albumNature,
  hero: albumHero,
  ocean: albumOcean,
  sports: albumSports,
  music: albumMusic,
};

/** @param {import("./roadmap-albums.js").StickerCategory} category */
export function getAlbumCoverUrl(category) {
  return ALBUM_COVER_URLS[category] ?? null;
}
