-- Phase 4 (analytics): age range, signup time, roadmap summary for admin aggregates.
-- Run AFTER memory_players.sql, 02_auth_owner.sql, and 03_security_rls.sql.
--   Supabase: Dashboard → SQL → New query → Run once.
--
-- Does NOT widen RLS — owner-scoped policies stay unchanged.
-- Cross-user aggregates use the admin-stats Edge Function (service role server-side).

-- 1) Signup timestamp (backfill existing rows from updated_at).
alter table public.memory_players
  add column if not exists created_at timestamptz;

update public.memory_players
set created_at = coalesce(created_at, updated_at, now())
where created_at is null;

alter table public.memory_players
  alter column created_at set default now();

alter table public.memory_players
  alter column created_at set not null;

-- 2) Age range bucket (not exact birthdate).
alter table public.memory_players
  add column if not exists age_range text;

alter table public.memory_players
  drop constraint if exists memory_players_age_range_check;

alter table public.memory_players
  add constraint memory_players_age_range_check
  check (
    age_range is null
    or age_range in ('5_6', '7_8', '9_10', '10_11', '12_plus')
  );

-- 3) Roadmap summary for analytics (not full sticker state).
alter table public.memory_players
  add column if not exists roadmap jsonb not null default '{}'::jsonb;

alter table public.memory_players
  drop constraint if exists memory_players_roadmap_shape_check;

alter table public.memory_players
  add constraint memory_players_roadmap_shape_check
  check (
    roadmap = '{}'::jsonb
    or (
      (not (roadmap ? 'currentLevel') or jsonb_typeof(roadmap->'currentLevel') = 'number')
      and (not (roadmap ? 'completedCount') or jsonb_typeof(roadmap->'completedCount') = 'number')
      and (not (roadmap ? 'albumWeek') or jsonb_typeof(roadmap->'albumWeek') = 'string')
    )
  );

create index if not exists memory_players_created_at_idx
  on public.memory_players (created_at desc);

create index if not exists memory_players_age_range_idx
  on public.memory_players (age_range);
