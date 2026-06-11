import { Jimp } from "jimp";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC_DIR = "C:/Users/moran/.cursor/projects/c-dev-test-project/assets";
const OUT_DIR = path.join(ROOT, "docs", "images", "stickers");
const SIZE = 128;

const STICKER_IDS = [
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
  "soccer",
  "basketball",
  "tennis",
  "runner",
  "skateboard",
  "bicycle",
  "baseball",
  "volleyball",
  "whistle",
  "podium",
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
];

for (const id of STICKER_IDS) {
  const src = path.join(SRC_DIR, `sticker-${id}.png`);
  const dest = path.join(OUT_DIR, `sticker-${id}.png`);
  if (!fs.existsSync(src)) {
    console.warn(`Missing source: ${src}`);
    continue;
  }
  const image = await Jimp.read(src);
  image.cover({ w: SIZE, h: SIZE });
  await image.write(dest);
  console.log(`Wrote ${dest}`);
}
