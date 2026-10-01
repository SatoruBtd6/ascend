# Phase 7o — duplicates, raids, run/walk, fuel

Owner: Brodan. Agent: Devin Local. `AGENTS.md` applies in full.

Working conventions as in `docs/phase-7n-state.md` and `docs/phase-7m-state.md`:
stop at the end of every part, report every lettered item separately including
ones answered "no change" or "couldn't measure", diagnose before fixing, propose
before anything non-trivial, never push. **Any SQL handed to Brodan for the live
database is labelled as unexecuted** — there is no staging environment.

Phase 7n shipped as `v7n`: bodyweight rebalance, the RLS fixes, the duplicate-save
guard, recipe editing, both ledgers, the tester tools.

---

## Part 1 — data integrity and the urgent bugs

**A. Duplicate workout rows already in user data.** The 7n save guard stops new
duplicates; it never cleaned the existing ones. Confirmed live via the audit view:
one cousin has the same walk credited **three times** on Sep 24 (0.16 each) and the
same run/walk **four times** on Sep 21 (0.39 each). His weekly leaderboard credit
is inflated by roughly 1.0 as a result, which is the discrepancy Brodan noticed.

  - Diagnose how the duplicates present in the stored state: identical `id`,
    identical timestamps, or distinct ids with identical content. Your 7n note
    said Train's save path generates a fresh `uid()` per tap, so both shapes may
    exist — say which this data actually is.
  - Propose an id-dedupe in `normalizeState` (you flagged this in 7n as the
    residual gap), plus whatever handles same-content-different-id cases.
    **Merging user records is destructive — propose before building**, and say
    what happens to a genuine same-day repeat of the same activity, which is a
    real thing people do.
  - Report how many duplicate rows exist across all accounts you can read, per
    account, and what each account's credit and XP change to after the cleanup.
  - Lifetime stats, streaks, weekly and season credit all derive from these
    records — confirm they all recompute correctly afterwards.

**B. Stale service workers.** The diagnostic log Brodan received reads
`{"k":"header","v":"7c","sw":"ascend-v7c"}` — that user's app was running version
**7c** while current was 7m/7n. Five versions behind.

  - Diagnose the update path: `sw.js` cache naming, `cacheRank`, what triggers an
    update, and whether an old client ever hard-refreshes on its own.
  - Say plainly how long a user can stay on stale code and what forces them off it.
  - **This changes how every other bug in this phase is interpreted** — bugs
    "fixed" in earlier versions may simply never have reached these users. Report
    which version each readable account was last saved from.
  - Propose a fix: a version check on load that prompts or forces a reload when
    the served bundle is behind. Brodan approves the mechanism before you build.

**C. Gym check-in and raid readiness — urgent.** The party host can check in and
ready up. Anyone who **joins** checks in, goes to raids, and is told to check in
again; returning to Status shows the toggle reset to unchecked.

  - **Leading hypothesis, test it first:** this is the same failure class as the
    comment-delete bug — a write to a `shared`-scope row the user does not own.
    Under the live policies, a foreign-owned update returns HTTP 200 with zero rows
    affected and no error, so the UI shows success and the value reverts on reload.
    Check whether check-in state is written to a party/raid row owned by the host.
  - If that is the cause, propose the fix in the same shape as the comment fix:
    either a policy clause covering party members (`kv_party` already exists and
    covers `mog|duel|preset` keys — say whether raid/party keys should join it) or
    a per-member row each user owns. **Any SQL is handed to Brodan, labelled
    unexecuted.**
  - Report every other write path in the app that targets a foreign-owned shared
    row. This class of bug has now appeared twice; find the rest of it rather than
    fixing one more instance.

**D. Raid readiness UX.** Move check-in onto the raid menu itself: when readying
up for a raid, the check-in control appears there. No bouncing to Status. The
Status toggle stays as-is for anyone who prefers it, and both must reflect the
same state.

**Then stop and report.** A–C are diagnosis and proposal; build only what is
trivial and self-evidently safe, and say which.

**E. Bodyweight rescore bug (added mid-phase, shipped).** Scoring used to read
`s.profile.weight` at evaluation time, so any weight change retroactively
rescored all history — gaining weight granted XP/rank/achievements, losing
weight stripped them. Fixed: every workout row stamps `bw` (bodyweight) at
completion, and historical scoring resolves the stamped weight — for pre-stamp
rows, the nearest `weightLog` entry by workout date, falling back to current
profile weight only when no log exists. `rank-*` achievements are now a
ratchet: once earned they are never revoked by reconcile. **Ship-order rule:
this fix and the dedupe cleanup both move XP — they must land in separate
pushes so each delta stays attributable.** Weight fix first (no mass recount;
each account's stored XP stands until its next recount); Brodan presses
"Recheck achievements" once after it ships; the dedupe cleanup ships later.

---

## Part 2 — run/walk

**E. Routes cutting out on the map.** Recorded routes display incompletely and
"get confused about which route I'm on". Diagnose before proposing: how segments
are recorded, what happens on a GPS stall (the diagnostic log shows
`{"k":"stall","gap":58}`), whether segments from separate runs can be attributed
to the wrong session, and whether the map draws all segments or drops some.

**F. Walking vs running, made explicit.** During a run/walk the app should show
clearly which mode it currently thinks you are in, and let you correct it.
Diagnose how the mode is currently decided (pace threshold, manual toggle,
inferred), report where that decision is visible to the user today — Brodan's
answer is that it is not visible enough — and propose the UI. Specifically: a
persistent mode indicator during tracking, plus a manual override, and the
recorded session should carry per-segment mode so the credit split is honest.

**G. The "Undo Typing" popup during runs.** This is almost certainly **iOS
shake-to-undo**: running shakes the phone, iOS reads it as a shake gesture and
offers the undo prompt. Confirm that diagnosis, then suppress it while a run is
active. On iOS Safari the usual approach is removing focus from any text input
and avoiding editable fields being focused during tracking — investigate what is
actually available to a PWA and propose. If it cannot be fully suppressed, say so
plainly rather than shipping a partial fix silently.

**Then stop and report.**

---

## Part 3 — fuel

**H. AI photo-generated foods not saving.** Foods generated from a meal photo do
not persist. Diagnose the full path from photo to saved record and name the exact
failure point. Given Part 1C, check whether this is another silent foreign-owned
write.

**I. Section restructure.** Today there are three overlapping sections — community
feed, saved, community. Collapse to **two**:
  1. **Your saves** — everything you save yourself.
  2. **Community** — things published for everyone.

  Rules Brodan has specified:
  - Publishing to community **also keeps it in your personal saves** — publish is
    a copy, not a move.
  - You can **edit** a published item afterwards.
  - You can **unpublish** it.
  - When scanning a barcode, photographing a meal, or logging a food, there is an
    explicit choice of where it saves: personal, community, or both.

  Report what each of the three current sections holds today and where its
  contents land in the new structure. Nothing should be orphaned by the migration.

**J. Duplicate food merge.** Mirror the existing exercise merge rather than
inventing a second pattern — report how that one works first.
  - **Exact name matches merge automatically.**
  - **Fuzzy matches prompt, never merge silently**: similar names, same words in
    a different order, similar calories, and same-name-different-calories all
    surface as a suggestion the user accepts or dismisses. Merging someone's food
    log without asking is hard to undo.
  - A **manual merge tool in Settings**, matching the exercise one.
  - Say what merging does to already-logged meals — per 7n's recipe decision,
    logged days carry baked-in copies and must not move retroactively.

**Then stop and report.**

---

## Part 4 — small items and ship

**K. Dips bodyweight.** Regular dips should treat the user's current bodyweight as
the load automatically, with an optional added-weight box for weighted dips. Check
how the bodyweight scoring handles this after 7n's rebalance — dips are in the
strength-limited class, which is now flat across body weights, so say plainly how
added weight interacts with that before building.

**L. Moment marker.** A small mark on auras that have moments, in the aura index,
so it is visible at a glance which ones do.

**M.** `npm.cmd run check`: tests, lint (0 errors, 5 documented baseline
warnings), madge (0 cycles).

**N.** Aura regression: `aura:diff` full set against the v7m baseline, all 51 zero.
This phase should not touch rendering.

**O.** `APP_VERSION` → `7o`; confirm the SW cache reads `ascend-v7o` and the
Settings diagnostic copy matches.

**P.** Update log entry for 7o.

**Q.** `docs/phase-7o-state.md` in the same shape as 7n's.

**Then stop.** Brodan pushes and tags `v7o`.

---

## Checklist

- [ ] Part 1: duplicate cleanup, stale-SW fix, check-in/raid bug, raid UX
- [ ] Part 2: route recording, walk/run mode, shake-to-undo
- [ ] Part 3: photo foods saving, two-section fuel, duplicate merge
- [ ] Part 4: dips, moment marker, checks, version, docs
- [ ] Brodan pushes and tags `v7o`

## Notes for Brodan

- Fresh Devin chat per part; a new chat cannot see previous chats.
- Item A changes your cousin's numbers — his weekly credit drops by roughly 1.0.
  Worth telling him, as with the 7n rebalance.
- Item B may mean some of these bugs are already fixed for you and simply never
  reached him.
