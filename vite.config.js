import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/** Read `.env` from disk (no `process.env` override). Fixes empty VITE_* when Windows has the same name set globally. */
function parseEnvFile(envPath) {
  /** @type {Record<string, string>} */
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq <= 0) continue;
    const key = s.slice(0, eq).trim();
    let val = s.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** OneDrive / Windows sometimes resaves text as UTF-16; Vite then fails to parse. */
function runEnsureUtf8() {
  try {
    execFileSync(process.execPath, [path.join(root, "scripts", "ensure-utf8.mjs")], {
      stdio: "inherit",
      cwd: root,
    });
  } catch (err) {
    console.warn("[vite] UTF-8 normalization (scripts/ensure-utf8.mjs) failed:", err);
  }
}

/** OneDrive / Windows sometimes resaves text as UTF-16; normalize before Vite reads HTML/JS/CSS. */
runEnsureUtf8();

export default defineConfig(({ mode }) => {
  const envPath = path.join(root, ".env");
  const fromFile = parseEnvFile(envPath);
  const fromVite = loadEnv(mode, root, "VITE_");
  const supaUrl = (fromFile.VITE_SUPABASE_URL || fromVite.VITE_SUPABASE_URL || "").trim();
  const supaKey = (fromFile.VITE_SUPABASE_ANON_KEY || fromVite.VITE_SUPABASE_ANON_KEY || "").trim();
  return {
    define: {
      __APP_SUPABASE_URL__: JSON.stringify(supaUrl),
      __APP_SUPABASE_KEY__: JSON.stringify(supaKey),
    },
    plugins: [
      {
        name: "ensure-utf8-sources",
        enforce: "pre",
        /** Dev: runs after top-level fix; catches files changed while the server was running. */
        configureServer: {
          order: "pre",
          handler() {
            runEnsureUtf8();
          },
        },
        buildStart() {
          runEnsureUtf8();
        },
      },
    ],
    server: {
      // Lets phones on the same Wi‑Fi open http://<your-PC-IP>:5173 (see terminal “Network” URL).
      host: true,
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.js"],
    },
  };
});
