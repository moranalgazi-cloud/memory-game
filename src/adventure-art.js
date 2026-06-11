import roadmapMapArt from "../docs/images/adventure/roadmap-map.png?url";
import albumAnimals from "../docs/images/adventure/album-animals.png?url";
import albumFood from "../docs/images/adventure/album-food.png?url";
import albumCosmic from "../docs/images/adventure/album-cosmic.png?url";
import albumMagic from "../docs/images/adventure/album-magic.png?url";
import albumNature from "../docs/images/adventure/album-nature.png?url";
import albumHero from "../docs/images/adventure/album-hero.png?url";

export { roadmapMapArt };

/** @type {Partial<Record<import("./roadmap-albums.js").StickerCategory, string>>} */
export const ALBUM_COVER_URLS = {
  animals: albumAnimals,
  food: albumFood,
  cosmic: albumCosmic,
  magic: albumMagic,
  nature: albumNature,
  hero: albumHero,
};

/** @param {import("./roadmap-albums.js").StickerCategory} category */
export function getAlbumCoverUrl(category) {
  return ALBUM_COVER_URLS[category] ?? null;
}
