-- Phase 2 (auth): add an owner column linking each player row to a Supabase
-- auth user (anonymous or Google). Run AFTER memory_players.sql.
--   Supabase: Dashboard -> SQL -> New query -> Run once.
--
-- This migration is intentionally non-destructive and keeps the existing open
-- RLS policies in place. Phase 3 replaces those policies to enforce ownership.

-- 1) Owner column (nullable for now so existing rows + the resilience fallback
--    in cloud-sync.js keep working until Phase 3 backfills/locks down).
alter table public.memory_players
  add column if not exists owner_id uuid;

create index if not exists memory_players_owner_id_idx
  on public.memory_players (owner_id);

-- 2) Best-effort backfill: nothing to do here yet (anonymous users get an
--    owner_id on their next sync). Phase 3 handles any remaining null rows.

-- NOTE: Dashboard setup still required for sign-in to work:
--   Authentication -> Sign In / Providers:
--     * Enable "Anonymous sign-ins"
--     * Enable the "Google" provider (paste Google OAuth client id/secret)
--     * (Optional) Enable "Manual linking" so anonymous accounts can be
--       upgraded to Google without losing data.
--   Authentication -> URL Configuration:
--     * Site URL + Redirect URLs must include your app origins
--       (e.g. http://localhost:5173/memory-game/ and your GitHub Pages URL).
