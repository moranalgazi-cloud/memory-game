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
import dolphinArt from "../docs/images/stickers/sticker-dolphin.png?url";
import whaleArt from "../docs/images/stickers/sticker-whale.png?url";
import octopusArt from "../docs/images/stickers/sticker-octopus.png?url";
import crabArt from "../docs/images/stickers/sticker-crab.png?url";
import shellArt from "../docs/images/stickers/sticker-shell.png?url";
import pearlArt from "../docs/images/stickers/sticker-pearl.png?url";
import anchorArt from "../docs/images/stickers/sticker-anchor.png?url";
import waveArt from "../docs/images/stickers/sticker-wave.png?url";
import fishArt from "../docs/images/stickers/sticker-fish.png?url";
import turtleArt from "../docs/images/stickers/sticker-turtle.png?url";
import blowfishArt from "../docs/images/stickers/sticker-blowfish.png?url";
import coralArt from "../docs/images/stickers/sticker-coral.png?url";
import soccerArt from "../docs/images/stickers/sticker-soccer.png?url";
import basketballArt from "../docs/images/stickers/sticker-basketball.png?url";
import tennisArt from "../docs/images/stickers/sticker-tennis.png?url";
import runnerArt from "../docs/images/stickers/sticker-runner.png?url";
import skateboardArt from "../docs/images/stickers/sticker-skateboard.png?url";
import bicycleArt from "../docs/images/stickers/sticker-bicycle.png?url";
import baseballArt from "../docs/images/stickers/sticker-baseball.png?url";
import volleyballArt from "../docs/images/stickers/sticker-volleyball.png?url";
import whistleArt from "../docs/images/stickers/sticker-whistle.png?url";
import podiumArt from "../docs/images/stickers/sticker-podium.png?url";
import guitarArt from "../docs/images/stickers/sticker-guitar.png?url";
import drumsArt from "../docs/images/stickers/sticker-drums.png?url";
import pianoArt from "../docs/images/stickers/sticker-piano.png?url";
import microphoneArt from "../docs/images/stickers/sticker-microphone.png?url";
import trumpetArt from "../docs/images/stickers/sticker-trumpet.png?url";
import saxophoneArt from "../docs/images/stickers/sticker-saxophone.png?url";
import violinArt from "../docs/images/stickers/sticker-violin.png?url";
import headphonesArt from "../docs/images/stickers/sticker-headphones.png?url";
import notesArt from "../docs/images/stickers/sticker-notes.png?url";
import discoArt from "../docs/images/stickers/sticker-disco.png?url";
import karaokeArt from "../docs/images/stickers/sticker-karaoke.png?url";
import tambourineArt from "../docs/images/stickers/sticker-tambourine.png?url";

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
  dolphin: dolphinArt,
  whale: whaleArt,
  octopus: octopusArt,
  crab: crabArt,
  shell: shellArt,
  pearl: pearlArt,
  anchor: anchorArt,
  wave: waveArt,
  fish: fishArt,
  turtle: turtleArt,
  blowfish: blowfishArt,
  coral: coralArt,
  soccer: soccerArt,
  basketball: basketballArt,
  tennis: tennisArt,
  runner: runnerArt,
  skateboard: skateboardArt,
  bicycle: bicycleArt,
  baseball: baseballArt,
  volleyball: volleyballArt,
  whistle: whistleArt,
  podium: podiumArt,
  guitar: guitarArt,
  drums: drumsArt,
  piano: pianoArt,
  microphone: microphoneArt,
  trumpet: trumpetArt,
  saxophone: saxophoneArt,
  violin: violinArt,
  headphones: headphonesArt,
  notes: notesArt,
  disco: discoArt,
  karaoke: karaokeArt,
  tambourine: tambourineArt,
};

/** @param {string} stickerId */
export function getStickerArtUrl(stickerId) {
  return STICKER_ART_URLS[stickerId] ?? null;
}
