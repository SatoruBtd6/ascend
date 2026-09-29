# Phase 7n — bugs and balance

Owner: Brodan. Agent: Devin Local. `AGENTS.md` applies in full.

Working conventions are as in `docs/phase-7m-state.md` ("Standing rules" and
"Working notes"): stop at the end of every part, report every lettered item
separately including ones answered "no change" or "couldn't measure", diagnose
before fixing, propose before anything non-trivial, never push.

This phase is **not** cosmetic. Phase 7m closed with `v7m` tagged and the
remaining 44-aura rollout deferred. This phase fixes correctness bugs, rebalances
bodyweight scoring, and adds several features.

Order matters: **data integrity before balance before features.** Two of these
bugs are actively producing wrong numbers, and one of them feeds the leaderboard
users compete on.

---

## Findings this phase is built on

From the diagnosis report (no code changed; all figures verified by running the
actual functions):

- **Weighted lifts are fully personalised; bodyweight movements are not.**
  `strengthScale(p)` scales weighted thresholds by an allometric curve on
  bodyweight and height. Bodyweight movements use flat `REP_STEPS` rep counts —
  a 110 lb and a 260 lb user need identical reps. The only adjustment is a flat
  `FEMALE_REP_SCALE = 0.7`.
- **Air Squat A tier starts at 99 reps** (`REP_STEPS × reps:3` →
  `[30, 51, 72, 99, 126]`), and the app's own daily quests ask for 100 air
  squats. A routine daily quest is an A-tier "advanced, years of serious
  training" mark. Sit-ups are identical.
- **Back Extension is worse**: S at 50, SS at 68.
- **Custom AI-generated bodyweight exercises default to `reps: 1`** — raw
  `REP_STEPS`, A at 33 reps, the easiest curve in the app. Any user-invented
  movement ranks trivially.
- **`reconcileAchievements` does subtract refunded XP from `s.xp`, but leaves
  the ledgers.** `xpLog`, `xpDetail`, `xpDone` and `xpFloor.amount` keep the
  revoked XP, so weekly XP, season XP and the leaderboard month total still
  credit it. That is why revoked XP appears not to go away — **the number users
  compete on is the wrong one.**
- Deleting a workout **does** remove its PR bonus (`w.xp` includes
  `prs × 40`). Achievement XP is granted separately and survives.
- `workouts-*` achievements are hard-exempt from revocation.

---

## Part 1 — data integrity. Do this first.

These bugs corrupt stored numbers. Every day they run, more bad data accumulates.

**A. Orphaned XP in the ledgers.** `reconcileAchievements` corrects `s.xp` but
not `xpLog` / `xpDetail` / `xpDone` / `xpFloor.amount`. Weekly XP, season XP and
the leaderboard card all sum from `xpLog`. Diagnose the full set of consumers of
each ledger, then propose the fix: whether `reconcileAchievements` should call
`recountXp`, whether `recountXp` alone is sufficient, and what `xpFloor` does to
a corrected total. State plainly whether any currently-live user has inflated
season or leaderboard XP from this, and how many.

**B. The refund amount is wrong in principle.** `reconcileAchievements` subtracts
the *current* `TIER_STYLE` xp value, not what was granted at the time. If those
values have ever changed, the refund is wrong. Check whether they have, and say
whether the actual granted amount is recoverable from `xpDetail`.

**C. Deleting a workout leaves achievement XP.** Confirmed: achievement XP is a
separate `ach_<id>` event and is not part of `w.xp`. Propose the fix — deleting a
workout should re-run reconciliation so achievements earned only because of that
workout are revoked, with their XP and ledger entries removed. Note the
interaction with A: fixing one without the other leaves the numbers inconsistent
in a different way.

**D. Duplicate save on run/walk.** A cousin pressed save once and the run/walk
saved **six times**. Deleting one of the six deleted the entire run/walk.
Two separate faults. Diagnose both before proposing anything:
  - what allows repeated submission from one press — missing disable-on-submit,
    a re-render loop, an effect firing per state change, a retry;
  - what delete matches on, and why deleting one entry removed all of them. If
    entries share a non-unique key (timestamp, index) that is the bug, and it
    likely affects other record types — check workouts, meals and any other
    user-created list.
Say whether any user currently has duplicate or missing run/walk records.

**E. Profile comment and photo deletion is broken.** Brodan posted a photo on his
cousin's profile and it will not delete. **This has been "fixed" once before and
the fix did not work**, which usually means the previous attempt treated a
symptom. Root-cause it properly: is the delete call firing, is it failing at the
database, is it succeeding and the UI not reflecting it, is it a permissions rule
on the row, is the photo a separate record from the comment? Do not propose a fix
until the actual failure point is named. Low priority to ship, high priority to
understand.

**Then stop and report.** Fixes for A–E are proposed here, not built, unless a
fix is trivial and self-evidently safe — say which you consider trivial and why.

---

## Part 2 — bodyweight balance

Brodan's decisions, recorded:

- **100 air squats should be C tier**, not A.
- **B tier around 200–250 reps.**
- **Bodyweight movements are personalised by the individual** — bodyweight and
  height, as weighted lifts already are. A heavier person needs fewer reps for
  the same tier, because each rep is more work.
- **Moderate scaling strength**, matching the curve weighted lifts already use.
- **Strength-limited bodyweight movements scale harder than endurance ones.**

**F. Two movement classes — implemented.** `bw: "end" | "str"` on the exercise
def; absent defaults to `end`.
  - **Endurance** (bounded by conditioning): Air Squat, Sit-up, Russian Twist,
    Back Extension, Walking Lunge, Burpee.
  - **Strength-limited** (bounded by strength): Pull-up, Chin-up, Dip, Hanging
    Leg Raise, Push-up (moved out of endurance on Brodan's call — A stays 92).

**G. Personalisation curve.** Scale thresholds by the same mass blend
`strengthScale` uses (`0.65 × bw + 0.35 × BMI-24 height mass`), with:
  - **endurance: exponent 1.0** — inverse-linear in mass; the approved
    130/170/230 lb targets (118/100/82) fit exactly this, not 0.67
  - **strength-limited: exponent 0** — DECIDED: no mass scaling. For these
    movements bodyweight IS the resistance, so a heavier person already does
    more work per rep; a mass discount would double-count it. Matches gym and
    military standards for bodyweight strength movements.
  Reference point: a 171 lb / 72 in male (Brodan's stats) sits at the unscaled
  thresholds (`BW_REF_MASS`).
  Verify against these targets for Air Squat C tier and report the actual
  numbers your implementation produces: **130 lb ≈ 118 reps, 170 lb = 100,
  230 lb ≈ 82.** If your curve lands materially away from those, show the
  numbers rather than adjusting the target silently.

**H. Rebased thresholds — approved and implemented.** Endurance base steps
`BW_END_STEPS = [15, 33, 75, 125, 183]` (Air Squat A = 375 at the 171 lb / 72 in
reference); strength-limited keeps `REP_STEPS = [10, 17, 24, 33, 42]` flat at
every body weight. Burpee `reps` 2.0 → 1.2 (A = 150). Everything else keeps its
existing multiplier.

**I. Two specific scaling faults from the audit.** Back Extension (S at 50) and
custom AI-generated bodyweight exercises (`reps: 1`, the easiest curve in the
app) both need fixing in the same pass. For custom exercises, propose how a
user-invented movement gets a sane multiplier and a class rather than defaulting
to the easiest possible curve.

**J. The female scale — decided.** Split by class: endurance × 0.85,
strength-limited keeps × 0.7. The sex gap concentrates in upper-body strength
work, so a flat multiplier was the wrong shape. (Was: `FEMALE_REP_SCALE = 0.7`
flat on all bodyweight movements.)

**K. Quest targets.** The daily quests ask for 100 air squats, 100 sit-ups,
60 walking lunges. Under the new curve, report what tier each quest target now
represents. If any quest target still equals a high tier, flag it — quests and
ranks should not be telling the user two different stories.
**Decided:** pull-up quest drops 30 → 15 (a daily quest should not be an
A-tier ask — same fault as the 100 air squats, smaller).

**L. Mandatory achievement recheck for all accounts.** Use the existing
`achV` gate: bump the version constant and the `< 3` check so every account
runs a full reconciliation on next load. Note in your report that this is
client-side and runs per user on open — there is no server-side batch — so state
how long realistically until all accounts are corrected. Confirm the recheck
also fixes the ledgers per item A; if it does not, this item depends on A being
fixed first, and say so.

**M. One-time user notice.** Users will lose ranks, badges and XP when this
lands. If it happens silently they will think the app broke. Build a one-time
notice shown on first load after the patch, explaining in plain language that
bodyweight scoring was rebalanced, that it now accounts for body size, and that
some ranks and achievements have been recalculated. Shown once, dismissible,
never again. Brodan approves the wording before it ships.

**Then stop and report.**

---

## Part 3 — features

**N. Edit past recipes.** Recipes can currently be created but not edited.
Diagnose what a recipe record looks like and what edits need to cascade (does a
logged meal reference the recipe by id or copy its values? editing a recipe must
not retroactively rewrite past meals unless that is the intent — propose which).

**O. Update log.** A place in the app listing what changed in each patch. Propose
where it lives, how entries are added (hand-written per release, presumably), and
whether it shows a "new" indicator on first load after a version bump. Seed it
with 7m (the aura ladder rework) and 7n.

**P. Workout credit log.** A breakdown of every source of workout credit, mirroring
the existing XP log. Match its structure and UI conventions rather than inventing
a second pattern. Report what credit sources exist and whether they are all
currently recorded in enough detail to itemise — if some are computed rather than
logged, say so, as that changes the work.

**Q. Test accounts on the leaderboard.** Ghost/test accounts cannot appear on the
leaderboard even in testing mode, even to the tester. Diagnose why (a filter, a
flag, a query condition) and propose making them visible in testing mode only.
Brodan needs this to test the leaderboard at all.

**R. Tester audit view.** A view, available only in testing mode, that lets a
tester inspect another user's XP log, workout credit log and fuel log.
**Invisible to normal users**: no menu entry, no settings toggle, no mention in
the update log, no UI trace for anyone not in testing mode. Report exactly what
gates access and confirm there is no path by which a normal account can discover
or reach it.

**Then stop and report.**

---

## Part 4 — ship

**S.** Full `npm.cmd run check`: tests, lint (0 errors, 5 documented baseline
warnings), madge (0 cycles).

**T.** Regression pass on the aura work: `aura:diff` full set against the v7m
baseline must be zero for all 51 auras — this phase should not touch rendering at
all, and if anything differs, that is a finding.

**U.** `APP_VERSION` → `7n`; confirm the SW cache reads `ascend-v7n`. Check the
Settings diagnostic copy matches (it was two versions stale before 7m).

**V.** Update the update log with this patch's entries.

**W.** Write `docs/phase-7n-state.md` in the same shape as
`docs/phase-7m-state.md`: what was decided, what was fixed, what is still open,
what future work needs to know. Include the balance decisions and their rationale
so nobody re-litigates them later.

**Then stop.** Brodan pushes and tags `v7n`.

---

## Checklist

- [ ] Part 1: ledger orphans, refund amount, workout-delete XP, duplicate save,
      comment deletion — all diagnosed, fixes proposed
- [ ] Part 2: movement classes, personalisation curve, rebased table approved by
      Brodan, custom-exercise fix, female scale examined, quests reconciled,
      mandatory recheck, one-time notice
- [ ] Part 3: recipe editing, update log, credit log, test-account leaderboard,
      tester audit view
- [ ] Part 4: checks, aura regression, `APP_VERSION` → `7n`, state doc
- [ ] Brodan pushes and tags `v7n`

## Notes for Brodan

- Fresh Devin chat per part. A new chat cannot see previous chats — restate
  anything carried forward in full.
- The rebased threshold table in item H needs your eyes before it ships. Nobody
  else knows whether 375 air squats is a reasonable A tier.
- Your cousins will lose ranks and badges when this lands. The item M notice is
  what stops that reading as a broken app.
