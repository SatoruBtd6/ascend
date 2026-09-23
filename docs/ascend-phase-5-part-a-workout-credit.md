# Ascend — Phase 5 Part A: Workout credit (`7d`)

Replaces Part A of `ascend-phase-5.md`, refreshed for the 7c.2 codebase (modules + code splitting).
Part B (Phase C auras, `7e`) is unchanged and comes later. **Stop at the end of this doc.**

Target version **`7d`**, SW cache `ascend-v7d`.

## Environment (updated — the old doc predates Git and the module split)

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`. A real build needs the `VITE_`
  env keys. eslint baseline: the same 5 unused-var warnings. 104 unit tests.
- **Git is installed and is how we ship.** Follow `SETUP.md`: clean `git status`, tag `pre-7d`
  before starting, commit at each checkpoint, **never push** — the owner pushes and tags.
  No zip handovers.
- `App.jsx` is now ~1,000 lines; the app lives in `src/theme.js`, `src/data/`, `src/lib/`,
  `src/ui/`, `src/auras/`, `src/tabs/<screen>/`, with `src/math.js` for shared math. Screens outside
  Status load lazily through `src/screenLoad.jsx`.
- Localhost: sign in only with `TEST_EMAIL` / `TEST_PASSWORD` (chud). chud stays `test: true`,
  `lb: false`, no crew, no boss damage.
- Don't undo: save/sync (three-way merge, pending copies, verified copy, tripwire, read-only
  hydrate), crash-safe workouts, error boundaries, offline boot, the 5 s boot watchdog, SW precache
  and the two-cache rule, the update banners' safe reload path, the diagnostic log, Phase 4 segments,
  lazy loading and prefetch.
- IP rule: no names, series or copied art from real anime/manga anywhere — code, copy, filenames.
- Locate code by name: `isWorkout`, `activeDays`, `rangeStats`, `lifetimeStats`, `WEEKLY_POOL`,
  `MONTHLY_POOL`, `ACH` ("Show Up"), the duel "workouts" condition, `profileCard`, `fillQuests`.
  Report which module each now lives in.

## Why

`isWorkout(w)` (`source !== "quest" && source !== "deck"`) counts every other session as exactly one
workout. A 10-minute walk and a two-hour lifting session count the same toward "Train 4 times this
week", "16 workouts this month", the 3-day training streak, the "Show Up" achievement, workout duels
and the board's workout count. That inflates counts for short or cardio-only sessions.

## A1. `workoutCredit(s, w)` — one function, used everywhere

Returns a fractional credit for a session. Quest and deck sessions stay at 0, as today.

**Strength sessions** (any non-run session with at least one completed non-timed working set):

- **Effective minutes** = `min(duration, workingSets × 5)`, where duration is `w.minutes`
  (finish − start). The set cap stops a forgotten timer or an idle session from inflating credit.
  If a session has no duration (old or imported), use `workingSets × 3.5`.
- Credit from effective minutes, piecewise linear:
  - 0–20 min: 0 → 0.70
  - 20–60 min: 0.70 → 1.00
  - 60–120 min: 1.00 → 1.25
  - capped at 1.25
- So 30 min ≈ 0.78, 45 min ≈ 0.89, 60 min = 1.00, 90 min ≈ 1.13, 2 h = 1.25.

**Runs and walks** (sessions with `w.run`, and standalone Running / Walking / Incline Walk entries),
using Phase 4's per-mode minutes:

- running: `runMinutes / 60`, walking: `walkMinutes / 120`, summed, **capped at 0.75** per session.
- So a 30-min run = 0.50, a 45-min run = 0.75, a 60-min walk = 0.50, a 20-min walk ≈ 0.17.

**Mixed sessions** (lifting plus cardio in one workout): strength credit plus cardio credit, capped
at 1.25 total.

Put every constant in one exported config object in `math.js` so balance can be tuned in one place,
and unit-test the table above.

## A2. Consumers — audit every one

Grep every `isWorkout(` call site, `activeDays`, and every place a "workouts" number is computed,
displayed or compared — across all modules, not just `App.jsx`. Replace session counting with summed
credit where the number means "how much training", and report the list with what each now uses.

- **"Train 4 times this week" / "16 workouts this month"**: progress is summed credit, shown to one
  decimal ("3.4 / 4"). Retitle to "Earn 4 workouts of credit this week" / "…16 workouts of credit
  this month" or similar — keep them short.
- **Streaks — any session saves the day.** For "Train 3 days in a row" and every other training or
  activity streak, a day counts if it has **any** session with credit above 0 — a short lift, a
  10-minute walk, anything except quest/deck entries. Credit size never matters for streaks. Check
  `activeDays` and any other streak logic still counts runs and walks.
- **"Show Up" achievement**: lifetime summed credit, floored. **Earned tiers are never revoked.**
- **Workout duels**: summed credit — but only for duels **created after 7d ships**. Duels already in
  progress settle under the rule they started with; store the rule version on the duel.
- **Board, profile and recap stats**: "Workouts" shows summed credit to one decimal.
- **Keep as-is**: miles, volume, reps, PRs and muscle-group counts still read from runs and sessions
  exactly as today. `rangeStats` derives miles from the same filtered list — don't let a change to
  what counts as a workout drop runs from the miles quest.
- **Already-claimed quests stay claimed.** Only in-progress progress changes.

## A3. Standing cardio quest

Add a **fixed** weekly quest alongside "Train 4 times": **"90 minutes of cardio this week"** (running
and walking minutes from runs and cardio entries), 300 XP. Minutes, not miles, so walkers aren't at a
disadvantage. The existing daily run quest and the miles quests stay.

## A4. Explain it once

The first time a user sees the new quest wording, show a one-time note: longer sessions count for a
bit more, and runs and walks count as part of a workout based on their length. One or two sentences,
in all four themes.

---

## A-checkpoint

1. eslint baseline (same 5); real production build; all unit tests pass; `madge` zero cycles;
   harness on chud + fixture at 4× and 6×, 100/100, `fallbackCount` 0.
2. Unit tests: the credit table (strength durations, the set cap, the no-duration fallback, run/walk,
   mixed, quest/deck = 0); a 5-minute walk alone keeps a streak day; "Show Up" never revokes; the
   duel rule version; miles and volume unchanged on a fixture with runs.
3. On chud and `?fixture=big`: weekly/monthly quest progress shows decimals and matches hand-computed
   credit for the week; the cardio quest counts run and walk minutes; a claimed quest stays claimed.
4. **No regression in what shipped:** production-preview smoke on every screen in four themes; start a
   workout, log a set, force a reload and confirm the set survives; offline relaunch opens every tab.
5. Report the consumer audit list (each call site, its module, and what it now uses).
6. New copy in dark, light, zesty and custom at ~380 px; `APP_VERSION` `7d`, SW cache `ascend-v7d`.
7. Commit; report the hash, `git diff --stat`, and a "noticed" list. **Don't push. Stop before
   Part B.**
