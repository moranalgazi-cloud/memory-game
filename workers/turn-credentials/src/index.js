/**
 * Returns short-lived Cloudflare TURN credentials for the memory game WebRTC
 * data channel. Deploy with Wrangler; keep TURN_KEY_API_TOKEN as a secret.
 */

/** @param {RTCIceServer[]} iceServers */
function stripBlockedTurnPorts(iceServers) {
  if (!Array.isArray(iceServers)) return [];
  return iceServers.map((entry) => {
    const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls].filter(Boolean);
    const filtered = urls.filter((u) => typeof u === "string" && !/:53\b/.test(u));
    if (!filtered.length) return null;
    return { ...entry, urls: filtered.length === 1 ? filtered[0] : filtered };
  }).filter(Boolean);
}

/** @param {string | undefined} raw */
function parseAllowedOrigins(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** @param {Request} request @param {string[]} allowed */
function corsHeaders(request, allowed) {
  const origin = request.headers.get("Origin") || "";
  const allowOrigin =
    allowed.length === 0
      ? "*"
      : allowed.includes(origin)
        ? origin
        : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * When an allowlist is configured, reject browser/cross-site callers whose Origin
 * is present but not allowed. Missing Origin is still accepted (same-origin GET
 * often omits it) so the game keeps working; IP rate limits cover curl abuse.
 * @param {Request} request
 * @param {string[]} allowed
 */
function isOriginAllowed(request, allowed) {
  if (!allowed.length) return true;
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  return allowed.includes(origin);
}

/** @type {Map<string, { count: number; resetAt: number }>} */
const rateByIp = new Map();

/** @param {string} ip */
function allowRequest(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxPerHour = 60;
  const entry = rateByIp.get(ip);
  if (!entry || now > entry.resetAt) {
    rateByIp.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count += 1;
  return true;
}

/** @param {Record<string, unknown>} data @param {number} status @param {Record<string, string>} cors */
function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export default {
  /** @param {Request} request @param {Record<string, string>} env */
  async fetch(request, env) {
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(request, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    if (!isOriginAllowed(request, allowed)) {
      return json({ error: "origin_not_allowed" }, 403, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!allowRequest(ip)) {
      return json({ error: "rate_limited" }, 429, cors);
    }

    const turnKeyId = env.TURN_KEY_ID;
    const apiToken = env.TURN_KEY_API_TOKEN;
    if (!turnKeyId || !apiToken) {
      return json({ error: "not_configured" }, 503, cors);
    }

    const ttl = Math.min(Math.max(Number(env.TURN_TTL_SECONDS) || 3600, 300), 86400);

    try {
      const upstream = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl }),
        },
      );

      if (!upstream.ok) {
        return json({ error: "turn_upstream_failed" }, 502, cors);
      }

      const data = await upstream.json();
      const iceServers = stripBlockedTurnPorts(data.iceServers);
      return json({ iceServers }, 200, cors);
    } catch {
      return json({ error: "turn_fetch_error" }, 502, cors);
    }
  },
};
