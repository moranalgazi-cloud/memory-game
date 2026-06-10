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

export default {
  /** @param {Request} request @param {Record<string, string>} env */
  async fetch(request, env) {
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(request, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const turnKeyId = env.TURN_KEY_ID;
    const apiToken = env.TURN_KEY_API_TOKEN;
    if (!turnKeyId || !apiToken) {
      return new Response(JSON.stringify({ error: "not_configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
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
        return new Response(JSON.stringify({ error: "turn_upstream_failed" }), {
          status: 502,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const data = await upstream.json();
      const iceServers = stripBlockedTurnPorts(data.iceServers);
      return new Response(JSON.stringify({ iceServers }), {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return new Response(JSON.stringify({ error: "turn_fetch_error" }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  },
};
