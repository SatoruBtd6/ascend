# Wealthy — build report

Built on macOS from the approved concept (Brodan, 2026-10-07) in
`docs/aura-brief-wealthy.md` / `docs/wealthy-concept.md`. Wealthy is the
monthly #1 Points-leaderboard prize aura — **reward/unlock wiring is
deferred and NOT part of this build**. The catalog row carries no
`award`/`task`/`ach`/`loot`/`crate`/`soon` fields, so it is gallery-visible
but never equippable through normal unlock paths.

## HEAD + commit list

New HEAD: **the commit containing this file**
(`aura(wealthy): build report + screenshots`), on top of `12b37a0`.

```
(this)   aura(wealthy): build report + screenshots
12b37a0  aura(wealthy): edge tuning — hat seat and pop fit inside every canvas
7c1f975  aura(wealthy): painter — right-rim money gun, $ eyes, tongue, anchors
14ab5c2  aura(wealthy): AURA_FX spec + minimal catalog row
3ba5baa  aura(wealthy): `bill` + `dollar` particle shapes
6f53801  aura(wealthy): keyed top hat + money gun sprites from Brodan's art
0e12e3b  docs: Wealthy aura brief + approved concept/plan
```

## Must-have checklist (ring view first)

Screenshots live in `docs/wealthy-screens/`.

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | `$` eyes are real green `$` glyphs at ring size | **PASS** — painter-drawn green glyphs with dark outline; not circles, not the OS emoji shape | `moment-hold.png`, `moment-film.png` |
| 2 | Does NOT resemble The Mask / Jim Carrey | **PASS** — black top hat + gold band + feather, grey money gun, green bills. No green face, no skull, no yellow suit | `ring-rest.png`, `moment-hold.png` |
| 3 | `$` eyes + tongue render over the photo at eye-line / photo centre | **PASS** — eyes at `anchors.face` eye-line, tongue unrolls from face centre downward; unit test asserts the eye-line y | `moment-hold.png`, `ring-anchors.png` (markers land on eyes/tongue), `moment-film.png` |
| 4 | Money gun on RIGHT rim, fires continuously at rest, bills arc up-and-out then rain, from measured muzzle | **PASS** — gun at 0.88·rx rotated ~45° up-out; `WEALTHY_MUZZLE` measured sprite point rotates with the gun; `cc.bills` spawns every frame at rest; test asserts spawn at the muzzle | `ring-rest.png` (bill at muzzle), `ring-anchors.png` (muzzle marker on the muzzle hole), `aura-shot-grid.png` |
| 5 | Hat oversized, head-anchored, idle wobble, POPS on the moment | **PASS with note** — rim-seated at 1.4·rx ≈ 0.70× photo width. Brief targets 0.8–1.0×; anything larger clips the frame at crew-52 under the edge rule, so 1.4·rx is the largest that passes all six sizes. Pop via `mY`/`mRot`/`mScale` keys synced to the eye-pop beat; `aura:edge` moment scan proves it stays in-frame | `ring-rest.png`, `moment-hold.png`, `moment-film.png` |
| 6 | Green leads, gold accents, black hat; reads "cash" instantly; gold `$` sparkles | **PASS** — green bills + green `$` eyes lead; gold sunburst/`$` sparkles/hat band accent; black hat | `ring-rest.png`, `aura-shot-grid.png`, `board32.png` |
| 7 | No flashes anywhere, zero `noteStrikeFlash` | **PASS** — `aura:flashaudit`: `wealthy paths=[none] moments=13 flashes=0 (0.00/moment) max=0/s reduce-moments=13 reduce-flashes=0`. Sunburst POP brightening is a slow `mA` swell | gate output below |
| 8 | Reduce: gag + gun suppressed; ambient drifts at the standard 35% calm | **PASS** — painter returns early under `reduce` (no gun, no bills, no eyes/tongue); spec layers ride `motionDt × 0.35`; hat moment keys damped by `mAmp 0.45` like every aura | `ring-reduce.png` (gun gone, field present), unit test |
| 9 | Small (board-32, <110px): hat + a few bills + sunburst only | **PASS** — painter drops gun/eyes/tongue at `m<110`; `small:` overrides thin the field; still reads "money" | `board32.png` |
| 10 | `anchorPoints` declared (brim-seat, muzzle, eye-line, tongue attach) | **PASS** — markers derive from the painter's own constants; gallery call widened (dev-only) to pass `rx`/`ry`/`mode`/`anchors` | `ring-anchors.png` — muzzle marker lands exactly on the muzzle hole |

## Asset keying

Sources: two 1024×559 RGB PNGs on `~/Desktop`, flat magenta backing.
`scripts/aura-asset-key-wealthy.mjs` does key → despill → trim → 512² WebP.

- **wealthy-tophat.webp**: ~80.6% of pixels keyed as background; art bbox
  454×386; zero pink-residue pixels. Fringe: clean on both `#0a0c14`
  (dark) and `#e8e4d8` (light) backings — `asset-tophat-dark.png`,
  `asset-tophat-light.png`.
- **wealthy-gun.webp**: ~83.4% keyed; bbox 498×425; zero pink-residue.
  Clean on both backings — `asset-gun-dark.png`, `asset-gun-light.png`.
- **Hat on dark**: reads clearly — the sprite's own grey-blue highlights
  and gold band carry it against a dark photo/card. No rim light needed.
  Verified in `asset-tophat-dark.png` and the dark-card ring shots.
- **R5 cap (DECISIONS.md)**: gun sprite centre sits at **0.88·rx** —
  under the 1.2·rx base cap: PASS. Hat at **1.4·rx** is over the 1.2 base
  cap but inside the pending **≤1.8·rx signature-sprite exception** —
  flagged for Brodan; `DECISIONS.md` not amended.

## Gates

- **`aura:diff`** (baseline worktree at `0e12e3b`, pre-Wealthy): **52/52
  pre-existing auras 0 diff** at every frame and size. `bill`/`dollar`
  and the alpha clamp are additive; wealthy doesn't exist in the
  baseline so nothing else can differ.
- **`npm run check`** — all four stages:
  1. tests: **310 pass / 0 fail** (307 before + 3 wealthy tests; the
     shape cases extend an existing test, not a new count);
  2. `eslint src`: **0 errors, 5 warnings** — the 5 baseline warnings;
  3. `madge --circular --extensions js,jsx,mjs src`: **0 cycles**;
  4. build: clean.
- **`aura:flashaudit`**: wealthy **PASS** (see checklist 7).
  Pre-existing failure on `fallenlight` (4.00 flashes/moment) is
  unchanged — it diffs 0 vs baseline and was not touched.
- **`aura:edge`**: wealthy **PASS at all six sizes** — crew52, board59,
  studio88, ring141, crate160, figure128x163 — `hard=0` steady and
  moment, `longestContact=0.00s`. Residual `soft` contacts ≤11px are the
  sunburst glow halo / fading transient bills (allowed). The full
  registry shows pre-existing FAILs on other auras (ossuary, carve,
  fallenlight, others) — all 0-diff vs baseline, untouched by this work.
- **`aura:perf`**: `--ab` cannot run for a new aura (the baseline
  instance is null and the harness throws). Plain perf, board-32, 4x CPU:
  **avg 0.217 ms, p95 0.800 ms** — far under the 16 ms gate.
  **WARN**: 1.66× stormstep vs the 1.3× provisional budget for unranked
  auras — wealthy is a prize-tier aura; flag for Brodan whether it gets a
  rank/ceiling. No `shadowBlur` anywhere in wealthy code.
- **`aura:stress --set fixed`** (leaderboard set — required because shared
  renderer code changed): **PASS**, 10 auras × 3 runs, B median
  **p95 = 3.4 ms** < 16 ms.
- **`aura:shots`**: produced `wealthy-shot.png` and
  `wealthy-moment-film.png` (copied in as `aura-shot-grid.png`,
  `moment-film.png`). The script then **hung** (~18 min, 0% CPU) after
  writing both PNGs — killed; on macOS its Windows `taskkill` cleanup
  can't reap the vite server either. Evidence complete regardless.

**Not run:** `aura:lit`, `aura:contact` (not in the brief's gate list),
`aura:perf --ab` (inapplicable to a new aura, above), `aura:flash`
(bonewright pin — bonewright is byte-identical per `aura:diff`).

## New hooks / shared-code changes (all additive, opt-in)

- `AuraCanvas.jsx`: `bill` + `dollar` cases in `drawNewParticleShape`
  (new shapes only); clamp on the near-edge alpha fade so off-canvas
  bills can't produce negative `globalAlpha` (fixes invalid canvas
  state; no visual change for in-bounds particles); `AURA_FX.wealthy`;
  `AURA_ART.wealthy` + `WEALTHY_MUZZLE` + `anchorPoints`.
- `devGallery.jsx`: `anchorPoints` call widened to pass
  `rx`/`ry`/`mode`/`anchors` — dev-only, additive.
- `catalog.js`: minimal `wealthy` row after `descended` — no
  unlock/reward fields.
- `rendererAdditions.test.mjs`: shape cases + 3 wealthy tests.

## Deviations / choices

1. **Hat seat** — "above the photo" in a ring canvas is implemented with
   the existing `rim` mechanism (redline's): the brim seats on the
   photo's top edge. On the figure it uses the head anchor + `body:`
   override. A float-above variant has no room inside the ring canvas.
2. **Gun is circle/ring-view only** — a rim placement has no figure
   analogue; figure keeps hat + bills + sunburst + gag.
3. **First-moment window** — `moment.every` rides the standard
   scheduler, whose first fire is `rnd(0.4, every[1])` — same as every
   aura; subsequent fires are 16–24 s.
4. **Moment amplitude** — initial hat pop (`mY −0.3`) clipped the top
   edge at small sizes; tuned to `−0.12` with rimSink 0.24. The
   dip–pop–tip identity is preserved; `aura:edge` proves all sizes.
5. **Transient bill exit** — muzzle bills may leave the frame as they
   fade; that's the edge rule's allowed transient-burst-debris case.
6. **`$` eyes are painter-drawn**, not the emoji shape — emoji can't be
   tinted and renders per-OS (per the spec).
7. **`APP_VERSION` not bumped** — the brief says don't bump. AGENTS.md's
   "bump in the final part of every phase" left to Brodan's call: this
   is a single-aura build, not a phase close.

## Screenshot index (`docs/wealthy-screens/`)

- `ring-rest.png` — resting ring view, all systems live
- `ring-anchors.png` — rest + anchor overlay (brim/muzzle/eye-line/tongue)
- `ring-reduce.png` — reduced-motion ring (gun suppressed)
- `board32.png` — board-32 (gun/gag dropped, still reads money)
- `board32-reduce.png` — board-32 under reduce
- `moment-hold.png` — `$` eyes + tongue + tipped hat (hold beat)
- `moment-film.png` — full moment film strip (`aura:shots`)
- `aura-shot-grid.png` — multi-size grid (`aura:shots`)
- `ring-rest-alt.png` — alternate rest frame
- `asset-tophat-dark.png` / `asset-tophat-light.png` — keying fringe checks
- `asset-gun-dark.png` / `asset-gun-light.png` — keying fringe checks

## Push sequence

```text
git log origin/main..HEAD --oneline
git push
```
