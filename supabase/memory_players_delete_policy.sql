-- Run once in Supabase SQL editor if you already created memory_players before DELETE policy existed.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'memory_players' and policyname = 'memory_players_delete'
  ) then
    create policy "memory_players_delete" on public.memory_players for delete using (true);
  end if;
end $$;
