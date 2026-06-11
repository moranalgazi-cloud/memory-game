import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AgeRange = "5_6" | "7_8" | "9_10" | "10_11" | "12_plus";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = Deno.env.get("ADMIN_STATS_SECRET")?.trim();
  if (!secret) {
    return json({ error: "not_configured" }, 503);
  }

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  // SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase.
  // You cannot create custom secrets starting with SUPABASE_ — if injection fails,
  // set STATS_SERVICE_ROLE_KEY manually in Edge Functions → Secrets.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ??
    Deno.env.get("STATS_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "missing_service_config" }, 503);
  }

  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await sb
    .from("memory_players")
    .select("created_at, age_range, roadmap, last_played_at");

  if (error) {
    console.error("[admin-stats] query failed");
    return json({ error: "query_failed" }, 500);
  }

  const players = Array.isArray(rows) ? rows : [];
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  /** @type {Record<string, number>} */
  const ageDistribution: Record<string, number> = {
    "5_6": 0,
    "7_8": 0,
    "9_10": 0,
    "10_11": 0,
    "12_plus": 0,
    unknown: 0,
  };

  /** @type {Record<string, number>} */
  const levelDistribution: Record<string, number> = {};

  /** @type {Record<string, number>} */
  const newPlayersByDay: Record<string, number> = {};

  let activePlayers7d = 0;

  for (const row of players) {
    const age = typeof row.age_range === "string" ? row.age_range : "unknown";
    if (age in ageDistribution) ageDistribution[age as AgeRange] += 1;
    else ageDistribution.unknown += 1;

    const roadmap =
      row.roadmap && typeof row.roadmap === "object" ? row.roadmap as Record<string, unknown> : {};
    const level =
      typeof roadmap.currentLevel === "number" && Number.isFinite(roadmap.currentLevel)
        ? Math.floor(roadmap.currentLevel)
        : 1;
    const levelKey = String(level);
    levelDistribution[levelKey] = (levelDistribution[levelKey] ?? 0) + 1;

    const createdAt = row.created_at ? Date.parse(String(row.created_at)) : NaN;
    if (Number.isFinite(createdAt)) {
      const day = new Date(createdAt).toISOString().slice(0, 10);
      newPlayersByDay[day] = (newPlayersByDay[day] ?? 0) + 1;
    }

    const lastPlayed =
      typeof row.last_played_at === "number"
        ? row.last_played_at
        : Number(row.last_played_at);
    if (Number.isFinite(lastPlayed) && lastPlayed >= sevenDaysAgo) {
      activePlayers7d += 1;
    }
  }

  const dayKeys = Object.keys(newPlayersByDay).sort();
  const last30 = dayKeys.slice(-30).map((day) => ({ day, count: newPlayersByDay[day] }));

  return json({
    totalPlayers: players.length,
    activePlayers7d,
    ageDistribution,
    levelDistribution,
    newPlayersByDay: last30,
    generatedAt: new Date().toISOString(),
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
