-- Phase 3 (security): lock down memory_players with owner-scoped RLS.
-- Run AFTER memory_players.sql and 02_auth_owner.sql.
--   Supabase: Dashboard → SQL → New query → Run once.
--
-- Replaces the open "using (true)" policies so each auth user (anonymous or
-- Google) can only read/write/delete their own rows (owner_id = auth.uid()).

-- 1) Default owner on insert (client should still send owner_id explicitly).
alter table public.memory_players
  alter column owner_id set default auth.uid();

-- 2) Drop the old wide-open policies from memory_players.sql.
drop policy if exists "memory_players_select" on public.memory_players;
drop policy if exists "memory_players_insert" on public.memory_players;
drop policy if exists "memory_players_update" on public.memory_players;
drop policy if exists "memory_players_delete" on public.memory_players;

-- 3) Owner-scoped policies (one row per auth user session / Google account).
create policy "memory_players_select_own"
  on public.memory_players for select
  using (owner_id = auth.uid());

create policy "memory_players_insert_own"
  on public.memory_players for insert
  with check (owner_id = auth.uid());

create policy "memory_players_update_own"
  on public.memory_players for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "memory_players_delete_own"
  on public.memory_players for delete
  using (owner_id = auth.uid());

-- NOTE: Rows with owner_id IS NULL (created before Phase 2/3) are no longer
-- visible after this migration. They will be recreated on the next sync from
-- a device that has an auth session and still holds the local player profile.
