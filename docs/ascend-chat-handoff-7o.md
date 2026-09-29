# Ascend — chat handoff, start of phase 7o

For a fresh Claude chat picking up this work cold. Brodan pastes this in first.

---

## Who and what

Brodan builds **Ascend**, a levelling-style gym tracker he shares with his
cousins. Live on Vercel + Supabase, **auto-deploys from `main` on push** — so
pushing ships it to real users. Repo at `C:\Users\rms76\ascend`, Windows,
PowerShell.

Currently shipped: **v7n**. Phase 7o is in progress.

## The working setup

- **Brodan** — owns the product and every design decision. Runs git and SQL
  commands and moves files. Non-technical: explain plainly, never assume he'll
  read code. He is the only one who can approve how something looks or feels.
- **Devin Local** — a coding agent on Brodan's PC. Does all building and
  measuring. Never pushes, never touches the live database.
- **Claude (you)** — writes phase docs, reviews Devin's reports critically, and
  drafts the messages Brodan pastes to Devin.

**Your job is mostly the review.** Devin is capable and largely honest, and has
caught real bugs unprompted. The recurring failure mode is a claim that sounds
rigorous and isn't: a metric that can't see what it claims to measure, a gate
read in the permissive direction, an explanation restated instead of a requested
change implemented, "expected to differ" waving through an unexamined change.
Several of the most valuable findings in this project came from pushing on those.
Push, but fairly — he self-corrects well when pressed with specifics.

**Devin gets a fresh chat per part and cannot see previous chats.** Never write
"as in my previous message" — restate anything carried forward in full.

**Design direction must be specific enough that he doesn't invent the look.**
Composition, motion, palette, feel; beat-by-beat for animations. Vague briefs come
back as his guess and get rejected. When you don't know what Brodan wants, ask him
in plain terms and turn his answer into the spec.

**Any SQL handed to Brodan is labelled as unexecuted** — there is no staging
environment, so it runs first on production.

## Read these in the repo

- `docs/phase-7o-duplicates-raids-fuel.md` — the current phase plan.
- `docs/phase-7n-state.md` — what 7n established, security work leading.
- `docs/phase-7m-state.md` — the aura ladder, amendments, renderer traps.
- `docs/DECISIONS.md`, `docs/TESTING.md`, `docs/aura-style-guide.md`.

## What's happened recently

**Phase 7m (v7m)** — defined a five-rung rarity-ordered aura ladder and proved it
on seven auras. The remaining 44 are a deferred rollout; **Brodan is done with
cosmetics until the bug list is clear.** Key constraint if it resumes: fixed-set
stress p95 must stay under 16 ms, pause at 14.5, and the rung ceilings do not all
fit — R3's 19 auras must be built cheaply.

**Phase 7n (v7n)** — bug and balance:
- **Security.** The `kv` table had two generations of RLS policies stacked. One
  SELECT policy was literally `using (true)`, so every signed-in user could read
  every account's full state — weight logs, photos, run GPS. Dropped. Three legacy
  write policies allowed writing into other users' private scopes. Dropped. 15
  legacy rows backfilled with owners. `supabase.sql` had drifted far enough from
  the live database that none of this was visible; it has been rewritten.
- **A trigger footgun:** `kv_owner` stamps `owner := coalesce(old.owner,
  auth.uid())` on every update, and `auth.uid()` is NULL in the SQL editor — so
  maintenance UPDATEs silently do nothing unless the trigger is disabled
  in-transaction.
- **Bodyweight rebalance.** Weighted lifts were personalised by body size;
  bodyweight movements weren't. 100 air squats was A tier while the daily quest
  asked for 100. Now: endurance movements scale by mass (exponent 1.0, reference
  171 lb / 72 in male, Air Squat A = 375); strength-limited movements
  (pull-up, chin-up, dip, push-up, hanging leg raise) are flat across body
  weights, because bodyweight IS the load and discounting it double-counts.
  Female scale: endurance x0.85, strength x0.7.
- XP ledger orphans fixed (reconcile now folds into recount), duplicate-save
  guard, recipe editing, update log, workout credit log, ghost accounts on the
  leaderboard, and a tester audit view gated by a server-side allowlist
  (`kv_audit_allowed`) — the hidden 7-tap gesture is convenience, not security.

## Phase 7o — in progress

Part 1 is with Devin now. The items:

1. **Duplicate workout rows already in user data.** The 7n guard stops new ones;
   the existing ones were never cleaned. A cousin has the same walk credited 3x
   and the same run/walk 4x, inflating his weekly leaderboard credit by ~1.0.
   Destructive to fix — propose before building.
2. **Stale service workers** — a question, not a known problem.
3. **Gym check-in / raid readiness.** Party joiners can't stay checked in.
   Leading hypothesis: another silent foreign-owned write, same class as the
   comment-delete bug. That class has now appeared twice; the phase doc asks for
   a sweep of all such write paths.
4. Raid check-in moved onto the raid menu.

Then: run/walk route recording and walk-vs-run clarity, the iOS shake-to-undo
popup during runs, fuel section restructure (three sections to two), AI photo
foods not saving, duplicate food merge (exact auto, fuzzy prompts), dips
bodyweight, aura moment markers.

**Parked at Brodan's request:** a rarity restructure (gilded above secret,
eclipseheart reassigned, a new gilded aura designed, pull rates buffed). Three
open questions on it are in the chat history; don't raise it until he does.

## Things worth knowing that aren't in the docs

- **Brodan's eye is the gate that works.** Auras passed every automated check and
  then failed when he looked at them on his phone, twice, at small sizes.
- The **flash rule** (max 3/second page-wide, none under reduced motion, all
  through `noteStrikeFlash`) is seizure safety, not style. Red pulses are the
  highest-risk pattern — build them as continuous brightness swells.
- He **generates image assets himself** with Gemini on a flat magenta background;
  Devin keys them. Prompts need "one uniform flat magenta colour, no gradient, no
  checkerboard" or the model paints a transparency checkerboard as artwork.
- **Moving files into the repo goes wrong often** — Windows saves with spaces
  instead of underscores, multi-line pastes split into separate commands, File
  Explorer drags silently fail. `move -Force` from PowerShell, then verify with
  `dir` before telling him to commit.
- The dev gallery is `?auras=1`, not `?gallery=1`.
- His test account is `brodansmith7655@gmail.com`; his main account uid is
  `3502ef55-bea7-4bd6-8c54-feed26219ec2`. Both are on the audit allowlist.
- **Don't over-read a diagnostic log.** A version number in one meant "the
  version when this was reported", not a stale client — an assumption that cost a
  detour.
- **Ironbound took four passes** because three of them chased a cleverer fix than
  what he asked for. When a note isn't landing, re-read his words before
  proposing something else.
