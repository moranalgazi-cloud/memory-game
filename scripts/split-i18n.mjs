import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, "../src/i18n.js"), "utf8");

function extractLocaleBlock(locale) {
  const marker = `${locale}: {`;
  const start = src.indexOf(marker);
  if (start < 0) throw new Error(`Missing ${locale} block`);
  let i = start + marker.length;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    i += 1;
  }
  const body = src.slice(start + marker.length, i - 1).trim();
  return body;
}

const outDir = path.join(__dirname, "../src/i18n/messages");
fs.mkdirSync(outDir, { recursive: true });

for (const locale of ["en", "he"]) {
  const body = extractLocaleBlock(locale);
  const file = `/** @type {Record<string, string>} */\nexport default {\n${body}\n};\n`;
  fs.writeFileSync(path.join(outDir, `${locale}.js`), file);
  console.log(`Wrote ${locale}.js`);
}
