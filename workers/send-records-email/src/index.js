/**
 * Sends memory-game records as HTML email (Gmail-friendly) via Resend.
 *
 * Secrets (wrangler secret put):
 *   RESEND_API_KEY
 *   EMAIL_API_SECRET — required Bearer token; endpoint stays disabled without it
 *
 * Vars (wrangler.toml):
 *   FROM_EMAIL — verified sender in Resend, e.g. "Memory Games <records@playmemorygames.win>"
 *   ALLOWED_ORIGINS — comma-separated CORS origins
 */

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
    allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

/** @param {unknown} value */
function isValidEmail(value) {
  if (typeof value !== "string") return false;
  const email = value.trim();
  return email.length >= 5 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** @param {unknown} value @param {number} max */
function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim().slice(0, max);
}

/** @type {Map<string, { count: number; resetAt: number }>} */
const rateByIp = new Map();

/** @param {string} ip */
function allowRequest(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const maxPerHour = 12;
  const entry = rateByIp.get(ip);
  if (!entry || now > entry.resetAt) {
    rateByIp.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxPerHour) return false;
  entry.count += 1;
  return true;
}

export default {
  /** @param {Request} request @param {Record<string, string>} env */
  async fetch(request, env) {
    const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);
    const cors = corsHeaders(request, allowed);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return json({ error: "method_not_allowed" }, 405, cors);
    }

    const apiKey = env.RESEND_API_KEY;
    const fromEmail = env.FROM_EMAIL;
    const sharedSecret = (env.EMAIL_API_SECRET || "").trim();
    if (!apiKey || !fromEmail || !sharedSecret) {
      return json({ error: "not_configured" }, 503, cors);
    }

    const auth = request.headers.get("Authorization") || "";
    const presented = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!presented || presented !== sharedSecret) {
      return json({ error: "unauthorized" }, 401, cors);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    if (!allowRequest(ip)) {
      return json({ error: "rate_limited" }, 429, cors);
    }

    /** @type {unknown} */
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400, cors);
    }

    const payload = body && typeof body === "object" ? body : {};
    const to = typeof payload.to === "string" ? payload.to.trim() : "";
    const subject = cleanText(payload.subject, 200);
    const html = typeof payload.html === "string" ? payload.html : "";
    const plainText = typeof payload.plainText === "string" ? payload.plainText : "";

    if (!isValidEmail(to)) {
      return json({ error: "invalid_email" }, 400, cors);
    }
    if (!subject || !html || html.length > 120_000 || plainText.length > 40_000) {
      return json({ error: "invalid_content" }, 400, cors);
    }

    try {
      const upstream = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text: plainText || undefined,
        }),
      });

      if (!upstream.ok) {
        const detail = await upstream.text().catch(() => "");
        console.error("[send-records-email] Resend error:", upstream.status, detail);
        return json({ error: "send_failed" }, 502, cors);
      }

      return json({ ok: true }, 200, cors);
    } catch (err) {
      console.error("[send-records-email] fetch error:", err);
      return json({ error: "send_error" }, 502, cors);
    }
  },
};

/**
 * @param {Record<string, unknown>} data
 * @param {number} status
 * @param {Record<string, string>} cors
 */
function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
