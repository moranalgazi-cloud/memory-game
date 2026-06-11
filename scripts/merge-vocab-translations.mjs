import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vocabPath = path.join(__dirname, "../src/english-vocabulary.json");
const transPath = path.join(__dirname, "vocab-translations.json");

const vocab = JSON.parse(fs.readFileSync(vocabPath, "utf8"));
const translations = JSON.parse(fs.readFileSync(transPath, "utf8"));

let merged = 0;
for (const topic of vocab.topics) {
  for (const entry of topic.entries) {
    const t = translations[entry.key];
    if (!t) continue;
    if (t.fr) entry.wordFr = t.fr;
    if (t.de) entry.wordDe = t.de;
    if (t.es) entry.wordEs = t.es;
    merged += 1;
  }
}

fs.writeFileSync(vocabPath, JSON.stringify(vocab, null, 2) + "\n");
console.log(`Merged translations into ${merged} entries.`);
