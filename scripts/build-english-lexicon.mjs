/**
 * Builds src/english-lexicon.json from GitHub's emoji CDN (object / action style icons).
 * Run: node scripts/build-english-lexicon.mjs
 *
 * The app uses `isKidFriendlyEnglishEntry` in english-game.js to keep the English
 * memory pool short and age-appropriate (flags, long phrases, etc. are dropped there).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "..", "src", "english-lexicon.json");

const BLOCK = new Set(
  [
    "middle_finger",
    "fu",
    "gun",
    "knife",
    "bomb",
    "syringe",
    "cigarette",
    "smoking",
    "pirate_flag",
  ].map((s) => s.toLowerCase()),
);

function isBlocked(key) {
  const k = key.toLowerCase();
  if (BLOCK.has(k)) return true;
  if (/(porn|sex|nazi|hitler)/i.test(k)) return true;
  return false;
}

function isGoodKey(key) {
  if (typeof key !== "string") return false;
  if (key.length < 3 || key.length > 48) return false;
  if (/^[0-9]+$/.test(key)) return false;
  if (!/^[a-z0-9_+.-]+$/i.test(key)) return false;
  if (/^[0-9]/.test(key) && !key.includes("_")) return false;
  if (isBlocked(key)) return false;
  return true;
}

function toDisplayName(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\+/g, " ")
    .replace(/\./g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const res = await fetch("https://api.github.com/emojis", {
  headers: {
    "User-Agent": "multiplication-memory-game-lexicon-builder",
    Accept: "application/vnd.github+json",
  },
});

if (!res.ok) {
  console.error("Failed to fetch emojis:", res.status, await res.text());
  process.exit(1);
}

/** @type {Record<string, string>} */
const raw = await res.json();

/** @type {{ key: string; word: string; image: string }[]} */
const entries = [];
for (const [key, url] of Object.entries(raw)) {
  if (!isGoodKey(key) || typeof url !== "string" || !url.startsWith("http")) continue;
  entries.push({ key, word: toDisplayName(key), image: url });
}

if (entries.length < 1000) {
  console.error("Too few entries:", entries.length);
  process.exit(1);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(entries), "utf8");
console.log("Wrote", outPath, "entries:", entries.length);
