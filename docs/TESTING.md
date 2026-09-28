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
| `npm.cmd run aura:stress [--set fixed|ledger|revamp|ring|spectacle[,…]] [--ab] [--size board|ring]` | board-32 circle, 4x CPU, moments forced, all auras of a set at once; `--size ring` runs at real 141px profile geometry and defaults to the `ring` set (the 4 heaviest auras = the worst real screen) | FAIL if p95 >= 16 ms; WARN if the fixed set median is over 12 ms. Ring is a separate series — never compared to board-32 medians; at ring size only the `ring` set gates, any other set is a synthetic worst case reported as INFO |
| `npm.cmd run aura:perf [--only ids] [--runs N] [--size board|ring]` | per-aura frame cost, median of N runs; `--size ring` measures at the real 141px profile geometry (the loud recipe once auras opt into `small:`) | informational: prints each aura's ratio to stormstep's same-session, same-size median; WARN over 1.3x (~0.6 ms quiet-day at board); ring numbers are a separate series — grandfathered ceilings are board numbers and print as info only; never fails |
| `npm.cmd run aura:perf -- --ab` | same measurement, alternating baseline vs current in one session | **the FAIL rule:** current median >15% AND >0.05 ms over baseline; a borderline fail is re-measured once and may fail only if it fails twice. The ratio WARN denominates on the BASELINE side's stormstep median (pinned ref, 7m proposal 2); the seven `P7M_FAIL_EXEMPT` rework auras measure and print but cannot FAIL until the v7m tag (proposal 3); the stormstep reference likewise cannot FAIL — identical code on both sides means its delta is session drift and prints WARN; the report's last line is the mean+median B−A delta across the whole measured set (proposal for item K) |
| `npm.cmd run aura:shots [--only ids]` | evidence grid per aura (ring dark/light on the real avatar, board, crew-52, figure, 2 frames, reduced motion, opaque-square-photo ring) plus an 8-frame ring moment filmstrip for every aura with a moment | edge alpha scan prints as INFO, never pass/fail |
| `npm.cmd run aura:shots -- --strip a,b,c` | one side-by-side ring-size strip on the real avatar — the style-guide look-alike check | informational |
| `npm.cmd run aura:edge [--only ids] [--baseline] [--spec file]` | the Part 4 edge rule: border-alpha scan of both canvases — edgeSoft (alpha<0.30, always legal), edgeHard (>=0.30, 0 in steady state; moment debris must clear within 0.5s), edgeRun (widest connected run >=0.50, <=3px always); 3 seeds x frames {60..240} + a forced-moment pass at crew-52, board-59, ring-141, figure-128x163, fresh page per aura; largest edge-touching renderer object attributed via `api.edgeHit` | FAIL on a steady-state run >3px, any run50 >3px, or a hard contact sustained >0.5s |
| `npm.cmd run aura:lit [--only ids] [--ab] [--frame N] [--contrast] [--spec file] [--mtime T]` | ring-size lit% — share of the aura disc / halo band with alpha-weighted luminance >= 25, measured with and without spec.glow. `--contrast` adds the dark-aura triple (rimPk = p95 band luminance, coreMin = p5 disc luminance, bandMed = median band luminance, ratio = rimPk/coreMin); see DECISIONS.md for targets. `--mtime T` forces a moment and samples at moment-time T (0–1) instead of steady state | informational |
| `npm.cmd run aura:flashaudit [--only ids] [--secs N]` | flash ledger on a deterministic sim clock: flashes-per-moment per aura, a combined page-wide rate check across the --only list, and a reduced-motion run | FAIL unless every moment.flash aura fires exactly 1 flash per moment, the combined timeline stays <=3/s, and reduce fires 0 |
| `npm.cmd run aura:moment-hue [--only ids] [--size label]` | hue audit of every frame of a forced moment on the composited main+over canvas — share of visibly saturated pixels (alpha>=77, luminance>=64 so near-black void pixels don't false-positive) whose hue lands in the magenta band 290–340°; also reports a pink side-band (340–358°) count as info since approved crimson #C2001F sits at ~350° | FAIL if any frame's magenta share exceeds 1.5% |
| `npm.cmd run aura:flash` | bonewright pixel diff + seeded flashTimes capture on both servers | FAIL on any pixel or flashTimes difference |
| `npm.cmd run aura:contact` | contact sheet of all FX auras at ring size, plus audit.json | informational; all image records are loaded before capture |

## 3. What to run for which change

- **docs only:** `check` is optional.
- **any code change:** `check`.
- **one aura's look or moment:** `check`; `aura:diff --expect <id>`; `aura:perf --only <id>`
  (and `--ab` for the regression verdict); `aura:shots --only <id>` plus
  `aura:shots -- --strip <id>,<closest look-alikes>`. Edge check: `aura:edge` — report
  the largest object touching the edge with its size; only sparks of 3 px or less may touch.
- **a batch of auras:** everything above, plus `aura:stress` (all the frozen sets — `--set`
  accepts a comma list, e.g. `--set fixed,spectacle`).
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
