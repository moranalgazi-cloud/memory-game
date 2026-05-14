/**
 * Converts UTF-16 LE (with or without BOM) project text files to UTF-8.
 * Run: node scripts/ensure-utf8.mjs
 * Also: npm run fix:utf8 — use this if Vite fails before loading (e.g. vite.config.js itself is UTF-16).
 * Automatically: npm predev / prebuild, and when Vite loads vite.config.js (see vite.config.js).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);
const TEXT_EXT = new Set([
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".html",
  ".json",
  ".ts",
  ".tsx",
  ".jsx",
]);

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walkTextFiles(dir) {
  /** @type {string[]} */
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(ent.name)) continue;
      out.push(...walkTextFiles(fp));
    } else {
      const ext = path.extname(ent.name).toLowerCase();
      if (TEXT_EXT.has(ext)) out.push(fp);
    }
  }
  return out;
}

/** @type {string[]} */
const rootLevel = [
  "index.html",
  "package.json",
  "vite.config.js",
  "vitest.config.js",
  "vitest.config.ts",
  "postcss.config.js",
  "postcss.config.cjs",
  "eslint.config.js",
  "eslint.config.mjs",
];
const filesToCheck = new Set(
  [
    ...rootLevel.map((rel) => path.join(root, rel)).filter((fp) => fs.existsSync(fp)),
    ...(fs.existsSync(path.join(root, "public"))
      ? walkTextFiles(path.join(root, "public"))
      : []),
    ...walkTextFiles(path.join(root, "src")),
    ...walkTextFiles(path.join(root, "scripts")),
    ...walkTextFiles(path.join(root, ".vscode")),
  ],
);

/**
 * @param {Buffer} buf
 * @returns {"utf16le" | "utf8"}
 */
function detectEncoding(buf) {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return "utf16le";
  if (buf.length >= 4 && buf[0] !== 0 && buf[1] === 0 && buf[2] !== 0 && buf[3] === 0) {
    return "utf16le";
  }
  return "utf8";
}

/**
 * @param {Buffer} buf
 * @returns {string}
 */
function decodeBuffer(buf) {
  const enc = detectEncoding(buf);
  if (enc === "utf16le") {
    let b = buf;
    if (b[0] === 0xff && b[1] === 0xfe) b = b.subarray(2);
    return b.toString("utf16le");
  }
  return buf.toString("utf8");
}

let fixed = 0;
for (const fp of filesToCheck) {
  const buf = fs.readFileSync(fp);
  if (detectEncoding(buf) === "utf8" && buf[0] !== 0xff) {
    continue;
  }
  const text = decodeBuffer(buf);
  fs.writeFileSync(fp, text, { encoding: "utf8" });
  console.log("UTF-8:", path.relative(root, fp));
  fixed += 1;
}

if (fixed === 0) {
  console.log("No UTF-16 files found; nothing to convert.");
} else {
  console.log("Converted", fixed, "file(s) to UTF-8.");
}
