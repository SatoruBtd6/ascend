# Testing and aura tooling

## 1. Quick start

Before every push, run:

```
npm.cmd run check
```

A green run ends with `PASS tests`, `PASS lint`, `PASS cycles`, `check passed.` and exit
code 0. If it's red, don't push — paste the whole output to the agent.

## 2. The commands

Every `aura:*` command starts its own dev server on the current tree (port 5180) and,
when it compares, a second server on the pinned baseline worktree (port 5181). Leave
Brodan's dev server on 5174 alone. Every command writes its output under
`evidence/<command>/<timestamp>/` (gitignored) and prints the path.

| Command | Job | Rules / limits |
|---|---|---|
| `npm.cmd run check` | `npm test` (once), `eslint src --max-warnings 5`, `madge --circular` | FAIL on any failing test, a lint error or a 6th warning, or any madge cycle |
| `npm.cmd run aura:baseline -- <tag>` | re-pin the baseline worktree to a tag/commit; `npm ci` only if the lockfile changed | refuses a dirty baseline worktree |
| `npm.cmd run aura:diff [--only ids] [--expect ids] [--spec file]` | multi-frame, multi-size pixel diff vs the baseline, fresh page per aura | FAIL if any aura not in `--expect` differs, or any `--expect` aura shows zero diff |
| `npm.cmd run aura:stress [--set fixed|ledger|revamp] [--ab]` | board-32 circle, 4x CPU, moments forced, all auras of a set at once | FAIL if p95 >= 16 ms; WARN if the fixed set median is over 12 ms |
| `npm.cmd run aura:perf [--only ids] [--runs N]` | per-aura frame cost, median of N runs | informational: prints each aura's ratio to stormstep's same-session median; WARN over 1.3x (~0.6 ms quiet-day); never fails |
| `npm.cmd run aura:perf -- --ab` | same measurement, alternating baseline vs current in one session | **the FAIL rule:** current median >15% AND >0.05 ms over baseline; a borderline fail is re-measured once and may fail only if it fails twice |
| `npm.cmd run aura:shots [--only ids]` | evidence grid per aura (ring dark/light on the real avatar, board, figure, 2 frames, reduced motion) | edge alpha scan prints as INFO, never pass/fail |
| `npm.cmd run aura:shots -- --strip a,b,c` | one side-by-side ring-size strip on the real avatar — the style-guide look-alike check | informational |
| `npm.cmd run aura:flash` | bonewright pixel diff + seeded flashTimes capture on both servers | FAIL on any pixel or flashTimes difference |
| `npm.cmd run aura:contact` | contact sheet of all FX auras at ring size, plus audit.json | informational; all image records are loaded before capture |

## 3. What to run for which change

- **docs only:** `check` is optional.
- **any code change:** `check`.
- **one aura's look or moment:** `check`; `aura:diff --expect <id>`; `aura:perf --only <id>`
  (and `--ab` for the regression verdict); `aura:shots --only <id>` plus
  `aura:shots -- --strip <id>,<closest look-alikes>`. Edge check: report the largest object
  touching the edge with its size — only sparks of 3 px or less may touch (manual until a
  dedicated tool exists).
- **a batch of auras:** everything above, plus `aura:stress` (all three sets).
- **shared aura code** (the renderer, `AuraCanvas`, shapes, the fits, `noteStrikeFlash`): a
  full `aura:diff` with explicit `--expect`, `aura:stress -- --ab`, `aura:perf -- --ab`, and
  `aura:flash`.
- **anything that flashes:** `aura:flash`, plus the flash-rule proof: every flash goes
  through `noteStrikeFlash`, at most 3 per second page-wide, none under reduced motion.
  Staggered per-particle twinkles are a manual gallery check.
- **the protected moments** (atlas, forge, fallenlight, ledger, ossuary): figure views must
  stay byte-identical — `aura:diff` at zero on their figure frames.
- **app code outside auras** (screens, logging, settings): `check`, plus a click-through
  list the agent writes for that change.
- **the save path, Supabase or account data:** `check`, plus a written test plan in the
  phase doc, run on a test account, never a cousin's.
- **releases:** `APP_VERSION` is bumped only in the final part of a phase; the SW cache
  name is `ascend-v{APP_VERSION}`.
- **tooling:** `check`, a full `aura:diff` at zero, and a negative control proving the
  tool still catches changes.

## 4. Why numbers lie (measurement rules)

- Run old and new alternating in one session, never across sessions — `aura:perf --ab` and
  `aura:stress -- --ab` do this for you.
- Absolute ms thresholds pass or fail on machine load, not code. That is why perf has two
  session-relative rules: **the A/B delta is the FAIL rule** (current vs baseline, >15% and
  >0.05 ms, auto re-run once), and **the ratio to stormstep is a provisional WARN** (1.3x
  ≈ 0.6 ms on a quiet day — revisit after cross-day data from the next aura phase).
  Grandfathered ceilings (`GRANDFATHERED` in `scripts/aura-sets.mjs`) print as info only.
- Stress p95 drifts ±3 ms between sessions — compare A/B in one run.
- Use medians of 3+ runs (5 for `--ab`); a single borderline result is noise until
  reproduced.
- Close the gallery tab while measuring; restart the PC if orphaned node/Chrome processes
  pile up.
- p95 is information only for the per-aura budget.
- lit% saturates on the glow disc (about 63% at glow 0.75+); use glow-disabled lit% to
  compare tiers.
- Anything outside the canvas is invisible to the diff and perf tools.
- The gallery doesn't mount `App`, so anything defined only in `App.jsx` won't run there.
- `/avatars/E.webp` is a full-body photo clipped to a circle; use an opaque square photo
  when it matters.
- Press Ctrl + Shift + R if the gallery looks wrong right after a change.
- Ask for proof that the visible result changed, not just that a value changed.

## 5. Current baselines

Measured 2026-09-27 at commit `067616a` (v7k code; tooling-only phase):

- tests: **218 pass, 0 fail**
- eslint: **0 errors, 5 warnings** (budget: `--max-warnings 5`)
- madge: **188 files, 0 cycles**
- stress p95 medians (board-32 circle, 4x CPU, moments forced, median of 3):
  fixed **11.0 ms**, ledger **10.4 ms**, revamp **10.1 ms** (frozen set in
  `scripts/aura-sets.mjs`)
- perf reference: stormstep ~0.42–0.48 ms this machine; ratio budget >1.3x = WARN.

Baselines are updated only in the final part of a phase, with the new numbers in that
report.

## 6. Re-pinning the baseline

At the start of any phase that changes auras, pin the baseline worktree to the last
release tag:

```
npm.cmd run aura:baseline -- <tag>
```

It refuses if `C:\Users\rms76\ascend-baseline` has local changes, and runs `npm ci` there
only when the lockfile changed.
