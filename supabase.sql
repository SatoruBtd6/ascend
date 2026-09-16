-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
create table if not exists public.kv (
  scope text not null,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (scope, key)
);
alter table public.kv enable row level security;

-- Each signed-in person can read/write their own data, and everyone can read/write the shared space
-- (leaderboard, profiles, community exercises and foods, mog-offs, comments).
drop policy if exists "ascend access" on public.kv;
create policy "ascend access" on public.kv
  for all to authenticated
  using (scope = 'user:' || auth.uid()::text or scope = 'shared')
  with check (scope = 'user:' || auth.uid()::text or scope = 'shared');
