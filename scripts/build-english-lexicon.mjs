/**
 * Validates src/english-vocabulary.json (curated topics for the English game).
 * Run: node scripts/build-english-lexicon.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vocabPath = path.join(__dirname, "..", "src", "english-vocabulary.json");

/** @type {{ topics: { id: string; entries: { key: string; word: string; symbol: string }[] }[] }} */
const data = JSON.parse(fs.readFileSync(vocabPath, "utf8"));

const ids = new Set();
let errors = 0;

for (const topic of data.topics) {
  if (!topic.id || ids.has(topic.id)) {
    console.error("Duplicate or missing topic id:", topic.id);
    errors += 1;
  }
  ids.add(topic.id);
  if (!Array.isArray(topic.entries) || topic.entries.length < 9) {
    console.error(`Topic ${topic.id}: need at least 9 entries, got ${topic.entries?.length ?? 0}`);
    errors += 1;
  }
  const keys = new Set();
  const symbols = new Set();
  for (const e of topic.entries ?? []) {
    const hasPicture =
      (typeof e.symbol === "string" && e.symbol.trim()) ||
      (typeof e.imageUrl === "string" && e.imageUrl.trim());
    if (!e.key || !e.word || !e.wordHe || !hasPicture) {
      console.error(`Topic ${topic.id}: invalid entry`, e);
      errors += 1;
    }
    if (keys.has(e.key)) {
      console.error(`Topic ${topic.id}: duplicate key ${e.key}`);
      errors += 1;
    }
    keys.add(e.key);
    if (e.symbol) {
      if (symbols.has(e.symbol)) {
        console.error(`Topic ${topic.id}: duplicate symbol ${e.symbol} (${e.key})`);
        errors += 1;
      }
      symbols.add(e.symbol);
    }
  }
}

if (errors) {
  console.error("Validation failed with", errors, "error(s)");
  process.exit(1);
}

console.log("OK:", data.topics.length, "topics,", data.topics.reduce((n, t) => n + t.entries.length, 0), "words");
