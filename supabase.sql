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
