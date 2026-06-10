/** @type {RTCIceServer[]} */
export const FALLBACK_ICE_SERVERS = [
  { urls: "stun:stun.cloudflare.com:3478" },
  { urls: "stun:stun.l.google.com:19302" },
];

/** @type {RTCIceServer[] | null} */
let cached = null;
/** @type {number} */
let cachedAt = 0;
const CACHE_MS = 30 * 60 * 1000;

/**
 * URL of the Cloudflare Worker (or other backend) that returns `{ iceServers }`.
 * Example: https://www.playmemorygames.win/api/turn-credentials
 */
function turnCredentialsUrl() {
  return String(import.meta.env.VITE_TURN_CREDENTIALS_URL || "").trim();
}

/** @param {unknown} raw @returns {RTCIceServer[]} */
function normalizeIceServers(raw) {
  if (!Array.isArray(raw)) return [];
  /** @type {RTCIceServer[]} */
  const out = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const urls = /** @type {{ urls?: unknown; username?: string; credential?: string }} */ (entry).urls;
    if (!urls) continue;
    /** @type {RTCIceServer} */
    const server = { urls };
    const username = entry.username;
    const credential = entry.credential;
    if (typeof username === "string" && typeof credential === "string") {
      server.username = username;
      server.credential = credential;
    }
    out.push(server);
  }
  return out;
}

/** @returns {Promise<RTCIceServer[]>} */
export async function resolveIceServers() {
  const url = turnCredentialsUrl();
  if (!url) return FALLBACK_ICE_SERVERS.slice();

  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached.slice();
  }

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const iceServers = normalizeIceServers(data?.iceServers);
    if (!iceServers.length) throw new Error("empty iceServers");
    cached = iceServers;
    cachedAt = Date.now();
    return iceServers.slice();
  } catch (e) {
    console.warn("[ice] TURN credentials unavailable; using STUN only:", e);
    return FALLBACK_ICE_SERVERS.slice();
  }
}

/** Clears cached TURN credentials (for tests). */
export function resetIceServerCache() {
  cached = null;
  cachedAt = 0;
}
