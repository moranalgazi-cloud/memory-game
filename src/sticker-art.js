import starArt from "../docs/images/stickers/sticker-star.png?url";
import rocketArt from "../docs/images/stickers/sticker-rocket.png?url";
import rainbowArt from "../docs/images/stickers/sticker-rainbow.png?url";
import trophyArt from "../docs/images/stickers/sticker-trophy.png?url";
import brainArt from "../docs/images/stickers/sticker-brain.png?url";
import lionArt from "../docs/images/stickers/sticker-lion.png?url";
import crownArt from "../docs/images/stickers/sticker-crown.png?url";
import gemArt from "../docs/images/stickers/sticker-gem.png?url";
import unicornArt from "../docs/images/stickers/sticker-unicorn.png?url";
import dragonArt from "../docs/images/stickers/sticker-dragon.png?url";
import cometArt from "../docs/images/stickers/sticker-comet.png?url";
import shieldArt from "../docs/images/stickers/sticker-shield.png?url";
import medalArt from "../docs/images/stickers/sticker-medal.png?url";
import flowerArt from "../docs/images/stickers/sticker-flower.png?url";
import robotArt from "../docs/images/stickers/sticker-robot.png?url";
import ghostArt from "../docs/images/stickers/sticker-ghost.png?url";
import pizzaArt from "../docs/images/stickers/sticker-pizza.png?url";
import cookieArt from "../docs/images/stickers/sticker-cookie.png?url";
import moonArt from "../docs/images/stickers/sticker-moon.png?url";
import sunArt from "../docs/images/stickers/sticker-sun.png?url";
import boltArt from "../docs/images/stickers/sticker-bolt.png?url";
import heartArt from "../docs/images/stickers/sticker-heart.png?url";
import diamondArt from "../docs/images/stickers/sticker-diamond.png?url";
import penguinArt from "../docs/images/stickers/sticker-penguin.png?url";

/** @type {Record<string, string>} */
export const STICKER_ART_URLS = {
  star: starArt,
  rocket: rocketArt,
  rainbow: rainbowArt,
  trophy: trophyArt,
  brain: brainArt,
  lion: lionArt,
  crown: crownArt,
  gem: gemArt,
  unicorn: unicornArt,
  dragon: dragonArt,
  comet: cometArt,
  shield: shieldArt,
  medal: medalArt,
  flower: flowerArt,
  robot: robotArt,
  ghost: ghostArt,
  pizza: pizzaArt,
  cookie: cookieArt,
  moon: moonArt,
  sun: sunArt,
  bolt: boltArt,
  heart: heartArt,
  diamond: diamondArt,
  penguin: penguinArt,
};

/** @param {string} stickerId */
export function getStickerArtUrl(stickerId) {
  return STICKER_ART_URLS[stickerId] ?? null;
}
