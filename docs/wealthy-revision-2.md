# Wealthy — revision 2 report (visual overhaul to match `wealthy-ref-mogul.png`)

Visual rebuild of Wealthy against Brodan's master reference
(`docs/aura-refs/wealthy/wealthy-ref-mogul.png`). Mechanics, gates, anchor
system and particle plumbing unchanged; pass 1's report is
`docs/wealthy-build-report.md`.

## HEAD + commit list

New HEAD: **the commit containing this file**
(`aura(wealthy): revision 2 report + v2 screenshots`), on top of `7999d14`.

```
(this)   aura(wealthy): revision 2 report + v2 screenshots
7999d14  aura(wealthy): revision 2 — rebuild composition to match the reference
6413be2  docs(wealthy): master reference + sprite source refs for revision 2
d0b642a  aura(wealthy): build report + screenshots
12b37a0  aura(wealthy): edge tuning — hat seat and pop fit inside every canvas
7c1f975  aura(wealthy): painter — right-rim money gun, $ eyes, tongue, anchors
14ab5c2  aura(wealthy): AURA_FX spec + minimal catalog row
3ba5baa  aura(wealthy): `bill` + `dollar` particle shapes
6f53801  aura(wealthy): keyed top hat + money gun sprites from Brodan's art
0e12e3b  docs: Wealthy aura brief + approved concept/plan
```

## Reference-vs-build comparison (self-critique)

Compared `v2/ring-rest.png` and `v2/ring-moment.png` directly against
`wealthy-ref-mogul.png`:

| Aspect | Reference | Build | Verdict |
|--------|-----------|-------|---------|
| **Composition** | Mogul bursts out of a huge bill pile, sun behind | Photo rises out of a deep bill pool, banded sun behind, hat on head — same layout minus arms/hands (per brief) | **Match** |
| **Sun** | Saturated red inner band → orange → gold outer arc, radiating lines, low-centre origin | Procedural `wealthySun`: red→orange→gold banded arc + ray wedges rising from behind the lower photo; slow `mR/mA` swell on moment (no flash) | **Match** |
| **Pool depth** | Pile fills bottom ~50%, mounds up both sides, photo emerges from it | `genPool` bill lattice fills bottom ~45–50%, shoulders curve up the sides; `m<110` simplifies | **Match** |
| **Bill style** | Flat green notes, varied angles, dark outlines, pale label strips (STOCK OPTIONS / MUTUAL FUNDS / BONDS) | Layered light/dark greens, rotated overlap, dark outlines, faint procedural labels on scattered bills | **Match** (labels necessarily faint at 141px) |
| **Bill size/density** | Large tumbling notes everywhere | Ambient/fired bills enlarged ~2× vs pass 1, denser field, thicker outlines; gun stream is a visible burst | **Match** |
| **Colour punch** | Bold saturated flat cartoon | Saturated green/gold/red on dark card — punchier than pass 1; the dark backdrop is inherent to the aura canvas (reference is on white) | **Close** — as saturated as the dark-card medium allows |
| **Gag** | n/a (reference is static) | `$` eyes launch off the eye-line with overshoot, wobble, hold, snap back; tongue unfurls segment-by-segment with a curling tip and rolls back up | **Delivered** — original cartoon, no Mask likeness |
| **Hat** | Top hat on head | Head-anchored, jaunty tilt kept, pops on the POP beat | **Match** |

**Missing/weaker, honestly:**
- Reference bills are larger, flatter, paler-green with printed label
  strips; at ring scale the build's pool bills read smaller. Density
  compensates; labels are present but subtle by design.
- Nothing else meaningful missing: no arms/hands (explicitly excluded),
  no man (replaced by the photo, per brief).

**Fixes made during the critique loop:** pool bill bounds now account for
rotated half-extents; rising-sun ray tips are clamped inside the canvas
including the moment `mR` swell; moment pool lift and hat-tip amplitudes
trimmed until all six edge sizes read `hard=0`.

## Requirement checklist

| # | Item | Result | Evidence |
|---|------|--------|----------|
| 1 | Rising-sun arc: red inner → gold/orange outer, radiating lines, behind photo, slow moment swell | **PASS** | `v2/ring-rest.png`, `v2/ring-moment.png` |
| 2 | Deep money pool: bottom ~45–50%, curves up both sides, overlapping angled bills, light/dark greens, dark outlines, faint finance labels, loose bills at top edge | **PASS** | `v2/ring-rest.png` |
| 3 | Flying bills bigger/bolder/denser; gun stream reads as a burst | **PASS** | `v2/ring-rest.png`, `v2/ring-moment.png` |
| 4 | Hat on the photo's head (not rim), ~0.85–1.0× photo width, tilt kept, edge clip solved by seating/pop tuning | **PASS** — head-anchored via `placed:"head"` img layer; edge-safe after `mY`/scale trim | `v2/ring-rest.png` |
| 5 | Gag revamped: `$` eyes launch/overshoot/wobble/hold/snap; tongue unrolls curled ribbon segment-by-segment, overshoot, rolls back; synced to hat pop + gun flurry | **PASS** | `v2/ring-moment.png` (hold beat: popped `$` eyes + unrolled tongue + tipped hat) |
| 6 | Small/board: pool readable, gag dropped | **PASS** | `v2/board32.png` |
| 7 | No flashes; flash safety unchanged | **PASS** — flashaudit below | gate output |

## Gates (all re-run on the final tree)

- **`aura:diff`** (baseline `~/ascend-baseline` at `0e12e3b`): **52/52
  auras, 0 differing bytes** at every frame and size
  (`evidence/aura-diff/2026-10-07-20-05-57`). The "HARNESS:
  img-state-differs" tag is the standard loaded-image note, not a pixel
  diff — all counts are 0.
- **`npm run check`** — all four stages PASS:
  1. tests **310 pass / 0 fail**;
  2. `eslint src` **0 errors, 5 warnings** (the 5 baseline warnings);
  3. `madge --circular --extensions js,jsx,mjs src` **0 cycles**
     (206 files);
  4. build clean, precache 22 files.
- **`aura:flashaudit --only wealthy`**: **PASS** — `paths=[none]`,
  0 flashes, max 0/s; page-wide PASS. The sun's moment swell goes through
  `mA/mR` keyframes, not `noteStrikeFlash`
  (`evidence/aura-flashaudit/2026-10-07-20-08-54`).
- **`aura:edge`**: **PASS at all six sizes** — crew52, board59, studio88,
  ring141, crate160, figure128x163 — `hard=0` steady and moment,
  `longestContact=0.00s` (`evidence/aura-edge/2026-10-07-20-04-05`).
- **`aura:perf --only wealthy`** (board-32, 4× CPU): **avg 0.232 ms,
  p95 0.8 ms** — far under 16 ms. WARN 1.71× stormstep vs the 1.3×
  provisional unranked budget (same flag as pass 1; prize-tier aura,
  Brodan's call on ranking). No `shadowBlur`. `--ab` remains inapplicable
  (null baseline instance for a new aura).
- **`aura:stress --set fixed`** (leaderboard set — shared renderer code
  changed): **PASS**, 10 auras × 3 runs, B median **p95 = 3.8 ms** < 16 ms
  (`evidence/aura-stress/2026-10-07-20-09-28`).
- **`aura:shots --only wealthy --tag v2`**: completed normally this run —
  `wealthy-v2.png` + `wealthy-moment-film.png` written, `edges: ring=0
  board=0 fig=0` (`evidence/aura-shots/2026-10-07-18-47-05`).

**Not run:** `aura:lit`, `aura:contact` (not in the gate list);
`aura:perf --ab` (new aura, above).

## Edge-debugging history this pass (for the record)

Three distinct clippers found and fixed before the clean run:

1. Pool bill centres were bounded but rotated half-extents poked past the
   border → bounds now subtract the rotated extent.
2. Rising-sun ray wedges filled to `R·1.14` hit the left/right borders,
   and the moment `mR` swell pushed past the steady clamp → ray length
   clamped to available canvas extent including the swell multiplier.
3. Moment-phase bottom contact was the pool's lift/scale amplitude (not
   burst debris — verified by disabling bursts) → lift trimmed and lower
   bound constrained.

## What changed vs pass 1

- `AURA_FX.wealthy`: gold sunburst → banded rising-sun spec (tunable
  bands/rays/colours); ambient bill layer enlarged + densified; hat img
  layer reseated head-anchored with restrained pop keys.
- `AURA_ART.wealthy`: procedural rising sun (`wealthySun`), seeded pool
  generator (`genPool`/`poolBill` — density/colours tunable from spec),
  rebuilt `$`-eye draw with launch/overshoot/wobble (`dollarEye`), rebuilt
  tongue as a segmented unrolling ribbon with curling tip, bigger fired
  bills + moment flurry; `anchorPoints` derive from the same constants.
- `rendererAdditions.test.mjs`: hat test asserts head anchor (was rim);
  bill palette assertions updated; gag tests kept.
- Renderer: ray-length clamp honours the moment swell multiplier
  (opt-in path — non-rising-sun auras unchanged, proven by the 0-diff).

## Constraints held

No features removed; flash safety unchanged; no reward/unlock/catalog
wiring; `APP_VERSION` untouched; nothing pushed; Part 3b Phase A still
untouched; `scratch/aura-perf` untouched.

## Screenshot index (`docs/wealthy-screens/v2/`)

- `ring-rest.png` — rest ring view: banded rising sun, deep bill pool
  curving up the sides, head-seated hat, gun + flying bills
- `ring-moment.png` — moment hold: popped `$` eyes, unrolled tongue,
  tipped hat, bill flurry
- `board32.png` — board-32: pool + sun + hat still read "money",
  gun/gag dropped

## Push sequence

```text
git log origin/main..HEAD --oneline
git push
```
