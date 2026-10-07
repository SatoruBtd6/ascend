-- Ascend live database — reference document.
-- This file documents the REAL live schema and policy set, reconciled against
-- pg_policies during the phase-7n security audit (2026-10). The previous
-- version documented a single blanket policy that had drifted far from live;
-- that drift is how a full-table read leak went unnoticed.
--
-- To re-verify live state, run in the Supabase SQL editor:
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename;
--   select proname, pg_get_functiondef(p.oid) from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and proname like 'kv\_%';

-- ============================================================
-- public.kv — the only general-purpose table.
-- scope='shared'   → social data everyone reads (lb:, cm:, hf:, feed:, food:,
--                    cmeal:, mog:, duel:, ex:, preset:, crew:, song:, crewraid:)
-- scope='user:'||auth.uid() → the account blob (ascend-state, backups, photos,
--                    run routes). Only the owner can ever read or write it.
-- ============================================================
create table if not exists public.kv (
  scope text not null,
  key text not null,
  value text not null,
  owner uuid,                              -- stamped by trigger, see below
  updated_at timestamptz not null default now(),
  primary key (scope, key)
);
alter table public.kv enable row level security;

-- kv_owner trigger (BEFORE INSERT OR UPDATE):
--   new.owner := coalesce(old.owner, auth.uid())
-- Inserts stamp the writer; updates keep the existing owner — so a PATCH can
-- never reassign an owned row, but ANY update of an owner IS NULL row claims
-- it for the writer. That claim behaviour accidentally transferred ownership
-- of a legacy comment during the 7n diagnosis; unowned rows are attackable.
-- WARNING: in the SQL editor auth.uid() is NULL, so the trigger writes
-- coalesce(old.owner, NULL) back over anything a migration sets on owner —
-- maintenance UPDATEs to kv.owner silently no-op unless the trigger is
-- disabled for the transaction.

-- Helper functions (bodies live in the live DB; verify with pg_get_functiondef):
--   kv_profile_owner(k text) — true when the caller owns the lb: card whose
--     playerId is the SECOND ':'-separated segment of k. Resolves
--     playerId -> auth uid through the lb: row's owner. This is what lets a
--     profile owner delete comments left on their profile (cm:<pid>:<ts>_<poster>).
--     playerIds are NOT auth uids; do not "fix" this to a direct uid compare.
--   kv_party(k text, v jsonb) — true when the row is a shared multi-party object
--     (crew / raid / duel / mog) the caller belongs to. Grants write/delete to
--     participants who aren't the row owner.

-- Policies (live set after the 7n migration — permissive policies OR together,
-- so there is exactly one policy per command):

-- SELECT: own scope + shared. NOTHING ELSE. The pre-migration set had a second
-- SELECT policy with qual=true ("Anyone can read shared data") that OR'd over
-- this and exposed every user's full state blob — do not re-add broad policies.
create policy "kv read" on public.kv for select to authenticated
  using (scope = 'user:' || auth.uid()::text or scope = 'shared');

-- INSERT: own scope or shared. Owner is stamped by the trigger.
create policy "kv insert" on public.kv for insert to authenticated
  with check (scope = 'user:' || auth.uid()::text or scope = 'shared');

-- UPDATE: own scope, or shared rows the caller owns / unowned legacy rows /
-- shared party objects the caller belongs to.
create policy "kv update" on public.kv for update to authenticated
  using (scope = 'user:' || auth.uid()::text
         or (scope = 'shared' and (owner is null or owner = auth.uid() or kv_party(key, value))))
  with check (scope = 'user:' || auth.uid()::text or scope = 'shared');

-- DELETE: own scope, or shared rows where the caller owns the row, belongs to
-- the party object, owns the PROFILE a comment/high-five is on, or the row is
-- a feed post older than 14 days (stale-feed cleanup).
create policy "kv delete" on public.kv for delete to authenticated
  using (scope = 'user:' || auth.uid()::text
         or (scope = 'shared' and (owner = auth.uid() or kv_party(key, value)
             or kv_profile_owner(key)
             or (key like 'feed:%' and updated_at < now() - interval '14 days'))));

-- Dropped in the 7n migration (left here as a warning, not to be re-created):
--   "Anyone can read shared data"  — qual=true, defeated kv read by OR.
--   "Users can insert/update/delete their own data" — keyed on
--     value::json->>'from' = auth.uid(). `from` holds playerIds, not auth
--     uids, so they matched almost nothing legitimately, while the INSERT one
--     allowed writing into any foreign user: scope. All three dropped.

-- ============================================================
-- public.xp_logs — server XP ledger. Self-only, both directions.
-- ============================================================
-- columns: user_id uuid, event_id text, amount int, source text, day date,
--          at timestamptz, created_at timestamptz
-- policies (live):
--   xp_logs_select_own  SELECT  user_id = auth.uid()
--   xp_logs_insert_own  INSERT  user_id = auth.uid()
-- No UPDATE/DELETE policies — append-only from the client; server repair is a
-- full replace via the xp_replace RPC.

-- public.step_tokens   — ALL  uid = auth.uid()  (with_check same)
-- public.step_sync_log — SELECT uid = auth.uid()
-- Both self-only; no shared reads.

-- ============================================================
-- Tester audit RPCs (phase 7n, item R) — live; confirmed present 2026-10-05.
-- security definer: bypasses RLS. The allowlist in kv_audit_allowed is the
-- ONLY gate — every other function returns {ok:false, reason:'denied'} and
-- nothing else for non-allowlisted callers (they cannot distinguish a real
-- account from a missing one). The Settings tester block (unlocked by 7 taps
-- on the version number, then Ghost mode on) calls these; without them the UI
-- exists but yields no data. Nothing client-side reads foreign state without
-- these functions. Add tester uids in kv_audit_allowed ONLY.
--
-- NOTE: every hand-edited statement in this file was first run against the
-- live DB — it is NOT tested anywhere else first. Expect a first-run error
-- rather than assuming a paste mistake. (kv_audit_roster's lateral alias
-- below was itself a live fix: "v-> " fails on a record type; the column
-- must be named — "(select k.value::jsonb as j) v" then v.j-> ... .)
-- ============================================================
create or replace function public.kv_audit_allowed()
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() in ('3502ef55-bea7-4bd6-8c54-feed26219ec2'::uuid);
$$;

-- Account picker for the audit view. Enumerates user scopes so an account
-- with a name but no lb: card still appears (has_card=false, "no card" tag).
create or replace function public.kv_audit_roster()
returns json language sql stable security definer set search_path = public as $$
  select case when public.kv_audit_allowed()
    then json_build_object('ok', true, 'accounts', (
      select coalesce(json_agg(row_to_json(t) order by lower(coalesce(t.name, '~')), t.uid), '[]'::json)
      from (
        select substring(k.scope from 6)::uuid as uid,
               nullif(btrim(v.j->'profile'->>'name'), '') as name,
               v.j->>'playerId' as player_id,
               coalesce((v.j->>'test')::boolean, false) as test,
               exists (select 1 from public.kv lb
                       where lb.scope = 'shared'
                         and lb.key = 'lb:' || (v.j->>'playerId')) as has_card
        from public.kv k
        cross join lateral (select k.value::jsonb as j) v
        where k.key = 'ascend-state' and k.scope like 'user:%' and k.value like '{%'
      ) t))
    else json_build_object('ok', false, 'reason', 'denied') end;
$$;

-- The audited blob, envelope-shaped so an allowlisted caller can tell
-- "denied" from "account exists but empty". Denied callers get 'denied'
-- whether or not the account exists.
create or replace function public.kv_audit_state(p_uid uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when public.kv_audit_allowed()
    then coalesce(
      (select json_build_object('ok', true, 'state', value::jsonb)
       from public.kv where scope = 'user:' || p_uid::text and key = 'ascend-state'),
      json_build_object('ok', false, 'reason', 'no_state'))
    else json_build_object('ok', false, 'reason', 'denied') end;
$$;

-- Owner-lock of the two communal food: rows left NULL by the backfill —
-- EXECUTED, confirmed live 2026-10-05 (no owner IS NULL food: rows remain).
-- Brodan owns the shared catalog rather than leaving it editable by all.
-- Kept for the record — it used the trigger-disabled-transaction pattern
-- (auth.uid() is NULL in the SQL editor, so the owner trigger rewrites
-- owner back to NULL unless it is disabled for the transaction):
--   alter table public.kv disable trigger <kv owner trigger name>;
--   update public.kv set owner = '3502ef55-bea7-4bd6-8c54-feed26219ec2'::uuid
--   where scope = 'shared' and owner is null and key like 'food:%';
--   alter table public.kv enable trigger <kv owner trigger name>;

-- ---------------------------------------------------------------------------
-- public.push_subscriptions — Web Push endpoints for the daily quest nudge
-- (api/questnudge.js). One row per device: a user may have several endpoints.
-- Clients write only their own rows (RLS); the Vercel function reads/writes
-- every row with the service-role key, which lives only in Vercel env vars.
create table if not exists public.push_subscriptions (
  uid        uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  keys       jsonb not null,        -- {"p256dh": "...", "auth": "..."}
  player_id  text,
  last_sent  date,                  -- America/Chicago day of last nudge (dedupe)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (uid, endpoint)
);
alter table public.push_subscriptions enable row level security;
create policy "push_sub read"   on public.push_subscriptions for select to authenticated using (uid = auth.uid());
create policy "push_sub insert" on public.push_subscriptions for insert to authenticated with check (uid = auth.uid());
create policy "push_sub update" on public.push_subscriptions for update to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create policy "push_sub delete" on public.push_subscriptions for delete to authenticated using (uid = auth.uid());
