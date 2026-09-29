# Phase 7n — running state

Read this at the start of every part of the next phase, alongside
`docs/phase-7n-bugs-balance.md` (the plan). **This doc is what actually
happened.** `docs/DECISIONS.md` remains authoritative.

Last updated: end of Part 4 — the phase is complete pending Brodan's push/tag
of `v7n`.

---

## SECURITY — read this first in any future phase

The most important thing a future phase needs to know: **`supabase.sql` had
drifted far enough from the live database that a full-table read leak sat
unnoticed.** The file documented a single blanket policy; live had eight
policies across two generations stacked by Postgres's OR semantics. The file
is now a reconciled reference of the real live set — keep it that way. Any
policy change goes in the live DB first (Brodan runs it), then the file.

What happened, in order:

1. **Read leak.** `kv` had `"kv read"` (own scope + shared) **and**
   `"Anyone can read shared data"` (`qual = true`). Postgres ORs permissive
   policies per command, so the `true` policy exposed every `user:<uid>`
   scope — private state blobs, photos, run GPS — to any authenticated
   caller. Dropped; verified in-app.
2. **Three legacy write policies** (`"Users can insert/update/delete their
   own data"`, keyed on `value::json->>'from' = auth.uid()`) were dropped.
   `from` holds **playerIds, not auth uids**, so they matched almost nothing
   legitimate — but the INSERT one allowed writing crafted rows into any
   foreign `user:` scope, and UPDATE/DELETE had no scope check.
3. **Owner backfill.** 17 shared rows had `owner IS NULL`; 15 were resolved
   through `value->>'from'` → `lb:<playerId>` → that card's `owner`, and
   backfilled (snapshot table `kv_owner_backfill_7n`, rollback = re-null the
   snapshotted keys then drop it). The 2 remaining NULLs are communal
   `food:` catalog rows — decided owner-locked to Brodan; the statement is
   in `supabase.sql` awaiting a run.
4. **The `kv_owner` trigger footgun — the biggest operational trap.** It runs
   `new.owner := coalesce(old.owner, auth.uid())`. In the Supabase SQL editor
   `auth.uid()` is **NULL**, so any maintenance UPDATE on `kv.owner` is
   silently rewritten back to the old value — the first backfill "matched
   zero rows" for exactly this reason, with no error. Fix: disable the
   trigger inside the transaction, update, re-enable. Also: any unowned
   legacy row is claimed by the first authenticated user to update it —
   that is how a diagnostic probe accidentally took ownership of a user's
   comment (later deleted with authorization).
5. **`kv_profile_owner` works via the lb: card, not a uid compare.** It
   resolves `lb:<seg2>` → `owner = auth.uid()`. playerIds are not auth uids —
   do not "fix" the function to a direct compare. The stuck-comment bug was
   missing `owner` data, not a broken function.
6. **Tester gate is server-side only.** `kv_audit_allowed()` holds the uid
   allowlist (Brodan's main + test accounts). `kv_audit_state(p_uid)` and
   `kv_audit_roster()` are `security definer` RPCs that return
   `{ok:false, reason:'denied'}` to everyone else — a denied caller cannot
   distinguish a real account from a missing one. **The 7-tap gesture and the
   audit UI both ship in the client bundle and are discoverable by anyone who
   reads it. The hidden gesture is convenience, not protection — the RPC
   allowlist is the entire security boundary.** An unlocked non-allowlisted
   user sees a ghost toggle that works (cosmetic) and an audit picker that
   returns nothing.

The live policy set, trigger semantics, function notes, rollback statements,
and the "do not re-create" list are all in `supabase.sql`.

One more operational note: **SQL handed to Brodan for the live DB has never
been executed anywhere else first** — there is no staging environment, so the
first run happens on production. `kv_audit_roster` failed its first live run
(`v->` on a record-type lateral column; fixed by naming it
`(select k.value::jsonb as j) v` and using `v.j->`). Statements handed over
should be labeled untested so a first-run error reads as expected, not as a
paste mistake.

---

## What was decided (DECISIONS.md has the full text)

**Bodyweight rebalance (Part 2, F–J):**

- Two classes via `bw` on the exercise def: **endurance** (`"end"`, default —
  anti-sandbag for customs) and **strength-limited** (`"str"`: Pull-up,
  Chin-up, Dip, Hanging Leg Raise, Push-up — moved out of endurance on
  Brodan's call).
- **Endurance: exponent 1.0**, base steps `BW_END_STEPS = [15,33,75,125,183]`,
  reference mass = blend at 171 lb / 72 in (`BW_REF_MASS` ≈ 173 lb). Female
  endurance ×0.85. Air Squat / Sit-up A = 375, Russian Twist 313,
  Back Extension 150, Walking Lunge 250, Burpee 150 (multiplier 2.0→1.2).
- **Strength-limited: exponent 0 — no mass scaling.** Bodyweight IS the
  resistance; a heavier athlete already does more work per rep, so a mass
  discount double-counts it. Matches gym/military standards. A-tier for
  everyone: Push-up 92, Dip 43, Chin-up 31, Pull-up 28, HLR 26. Female ×0.7
  applies on the flat value (Pull-up A = 20, Push-up A = 64).
- Female sex scale applies to the **rounded** male tier (Push-up 64, not 65).
- Custom exercises: AI path emits `bw` (clamped `reps` 0.5–4); keyword
  fallback (pull|chin|dip|hang|push|leg raise|muscle-up|handstand → `str`),
  else `end`. Pull-up daily quest 30→15.
- `xpRecount` owns ledger correctness: `reconcileAchievements` only touches
  `ach`; the recount rebuilds `xp`/`xpLog`/`xpDetail`/`xpDone`. One-time
  rebalance notice ships (plain-sentence wording, approved).

**Part 3 (N–R):**

- Recipes editable in place; logged meals keep baked-in values (no retro
  cascade). Rename unpublishes the old `food:` slug.
- Update log: hand-written `src/data/changelog.js` → "What's new" in
  Settings; `seenVersion` dot; fresh installs start seen.
- Workout credit is **computed, not recorded** — `creditBreakdown` derives
  per-session math; `workoutCredit` folds onto it. CreditLedger page mirrors
  XpLedger conventions.
- Ghost accounts publish `lb:` cards; visibility is a viewer filter
  (`liveBoard(rows, {ghosts})`). Test viewers see them; `settleSeason` /
  `applyReigning` / duel matching / `readShared` never do.
- Tester tools: 7 taps on the version number unlocks (5 taps still toggles
  diagnostics; debounced so 7 doesn't fire 5). No password, no visible
  affordance. Audit block shows auth uid + copy, roster dropdown, and the
  blob view — only when `s.test` is on.

---

## Checks (Part 4 evidence)

- `npm.cmd run check`: **232 tests pass**, 0 lint errors (5 baseline warnings:
  unused `CREW_PER_PLAYER`, `CREW_XP`, `MuscleFigure`, `WaterTracker`,
  `steps`), 0 cycles / 192 files.
- `aura:diff` vs v7m baseline (`ascend-baseline` @ `f432d9f`): **51 pass, 0
  expected-diff, 0 fail** — evidence `evidence/aura-diff/2026-09-29-16-28-29`.
  No renderer touched this phase; confirmed byte-identical at all sizes.
- `APP_VERSION = "7n"`, SW cache `ascend-v7n`, Settings diagnostic copy
  updated (it was the stale spot before).

## Commits this phase

- `79bed0d` — Part 1: dedupe workout saves by ID
- `21ce518` — Part 2 L+M: reconcile folds into recount; rebalance notice
- `de45ffa` — pull-up quest 15, notice wording, doc corrections
- `c2f854e` — Part 2 F–J: two bodyweight classes, mass-scaled endurance
- `0d95656` — document live RLS set and `kv` owner trigger semantics
- `742a310` — Part 3 N–R: recipe edit, update log, credit log, tester
  ghosts + audit
- Part 4 commit — this doc + version bump + audit picker/envelope/uid display

**Not pushed, not tagged — Brodan does both.**

## Open items for the next phase

1. `kv_audit_allowed` / `kv_audit_roster` / `kv_audit_state` SQL in
   `supabase.sql` needs a run to enable the audit tool (allowlist = Brodan's
   main + test uids).
2. The two communal `food:` rows — owner-lock statement pending in
   `supabase.sql` (needs the trigger-disabled-transaction pattern).
3. Aura rollout (44 auras) resumes per `docs/phase-7m-state.md` — the v7m
   baseline, rung budgets, and stress gates all still apply. **This phase
   touched no renderer code; any aura diff is a finding, not expected.**
4. `kv update` still grants write on `owner IS NULL` shared rows — nearly
   harmless now (2 communal rows), revisit if the catalog grows.
5. The lint baseline warnings (unused imports) are untouched — cosmetic.

## Working notes carried forward

- Fresh Devin chat per part; restate context in full.
- Dev server `npm.cmd run dev` at http://localhost:5174; `?auras=1` gallery.
- Never push, never tag. Commit only. One commit per part unless told.
- Windows: `npm.cmd` for scripts, `node --test <file>` per file (directory
  glob does not work in the shell here).
