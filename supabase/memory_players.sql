-- Run in Supabase: Dashboard → SQL → New query → Run once.
-- Then Project Settings → API: copy URL and anon public key into .env (see .env.example).
-- (No DROP statements — avoids Supabase’s “destructive query” warning on first run.)

create table if not exists public.memory_players (
  id uuid primary key,
  device_id text not null,
  display_name text not null,
  stats jsonb not null default '{}'::jsonb,
  last_played_at bigint,
  updated_at timestamptz not null default now()
);

create index if not exists memory_players_display_name_idx on public.memory_players (display_name);
create index if not exists memory_players_updated_at_idx on public.memory_players (updated_at desc);

alter table public.memory_players enable row level security;

-- Family / demo: anon can read/write. Tighten for production (Edge Functions + service role).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memory_players' and policyname = 'memory_players_select'
  ) then
    create policy "memory_players_select" on public.memory_players for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memory_players' and policyname = 'memory_players_insert'
  ) then
    create policy "memory_players_insert" on public.memory_players for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memory_players' and policyname = 'memory_players_update'
  ) then
    create policy "memory_players_update" on public.memory_players for update using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memory_players' and policyname = 'memory_players_delete'
  ) then
    create policy "memory_players_delete" on public.memory_players for delete using (true);
  end if;
end $$;
