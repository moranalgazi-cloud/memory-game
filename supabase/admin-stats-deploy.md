# Admin stats Edge Function

## One-time setup

1. Run [`04_analytics_fields.sql`](04_analytics_fields.sql) in the Supabase SQL editor.
2. Deploy the function:
   ```bash
   supabase functions deploy admin-stats --no-verify-jwt
   ```
3. Set secrets in Supabase Dashboard → Edge Functions → Secrets:
   - `ADMIN_STATS_SECRET` — long random password (you enter this in `admin-stats.html`)
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are **auto-injected** — do not add them (names starting with `SUPABASE_` are blocked).
   - Only if the function returns `missing_service_config`, add `STATS_SERVICE_ROLE_KEY` with your `service_role` key from Project Settings → API → Legacy tab.

## Usage

Open `https://www.playmemorygames.win/admin-stats.html` (not linked from the kids' app).

Enter your Supabase project URL and `ADMIN_STATS_SECRET` to load aggregated metrics.
