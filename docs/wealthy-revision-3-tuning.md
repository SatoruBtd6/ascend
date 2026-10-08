# Wealthy — revision 3.1 report (composition tuning)

Composition-tuning pass on top of revision 3 (`59a9847`). Same sprites,
same painter architecture, same moment clock — only the five placement
values from the brief moved. Prior passes: `docs/wealthy-revision-3.md`.
Reference: `docs/aura-refs/wealthy/wealthy-ref-mogul.png`.

Based on **`59a9847`** on `main`. One commit, not pushed.

## What changed

All edits are in `src/auras/AuraCanvas.jsx` (spec + wealthy painter) except
the audit whitelist line noted below.

1. **Hat** — `AURA_FX.wealthy.layers[0]` gains the raised circle seat.
   - **Deviation from the literal brief spec, flagged:** the brief's
     `circle: { y: -0.89 }` is encoded as **`circle: { hover: 0.635 }`**.
     `y` is a post-anchor `ry`-scaled draw offset; `hover` is the same axis
     in `sz` units, and `0.89·ry = 0.505·sz` at every circle size (both
     scale with `rx`), so the drawn seat is **pixel-identical** to
     `y:-0.89` — the brim edge lands at the photo's top rim and the crown
     towers off the canvas top. The reason for the re-encoding: `y` is not
     in `SMALL_ALLOWED_KEYS` (small: may only change size/count/speed), so
     a `y`-encoded lift could not be reseated at small sizes. With `hover`
     the crown can be brought back in frame by `small:`.
   - **`small: { headSz: 1.75 }`** — per the brief's per-size-override
     escape hatch. The literal lift is proportional, so at crew52 /
     board59 / studio88 (all `<110`) the crown would clip identically;
     shrinking the sprite shortens the `sz·hover` lift so the crown stays
     in frame while the brim still clears the bigger `$`-eyes.
   - `body:` unchanged — figure view keeps its own seat.
   - Ring141 / crate160 keep Brodan's seat verbatim and the crown bleeds
     off the top edge **by design** — same "too big for the frame"
     precedent as `descended`'s wing tips. `wealthy` was added to
     `EDGE_BLEED_OK` for `["ring141", "crate160"]` in
     `scripts/aura-edge.mjs` (verdict prints BLEED, not FAIL; small sizes
     still gate normally). The edge attribution confirms the only bleeder
     is `img:wealthy-tophat.webp` (~72 px at ring141, ~81 px at crate160).
2. **Sun** — `fx.sun.r 1.58 → 2.1`, `drop 0.14 → 0.05`. The dome now
   halos visibly past the bezel's outer edge at ring size. Canvas clamp
   and `mA/mR` swell unchanged.
3. **Pool** — `wealthyPool` draws `d = ry·1.2/span` (~+20%) and seats the
   pile base at `cy + 1.09·ry` (clamped `h−2`), tucking it to the ring's
   bottom edge. Mound tops rise to ~`cy−0.10·ry`, covering the photo's
   bottom ~55–60%; the photo sits deeper in the cash.
4. **Eyes** — `es = eyeW·1.15 → eyeW·2.2` (~2×), pair spread widened to
   `±eyeX·(1.7+0.45·rise)` so the bigger coins don't merge, and the seat
   moves from under-the-brim (`f.y + es·0.35`) to the eye line
   (`f.y − es·0.05`). Mirrored pair + `easeOutBack` pop kept.
5. **Tongue** — `td = eyeW·3.4 → eyeW·6.2` (~1.8×). Unroll reveal,
   overshoot stretch (1.07×) and sway kept; the tip now droops deep into
   the pool.

Also: `wealthy.anchorPoints` (the `?auras=1` gallery debug overlay) now
declares the new seat (`hov 0.635`, `small headSz 1.75`) so the hat
marker stays truthful — it still pointed at the v2 seat.

Test update (`rendererAdditions.test.mjs`): the hat-seat assertion reads
`hat.circle?.hover ?? hat.hover` so it still proves the head-anchored
seat under the circle override.

## Gates (all run on the final tree, current = `59a9847` + this work)

| Gate | Result | Evidence |
|------|--------|----------|
| `npm.cmd run check` | **PASS** — tests 310/0; eslint **0 errors / 5 warnings** (baseline); madge **0 cycles / 206 files**; build clean | — |
| `aura:diff --expect wealthy` | **53 auras: 52 pass 0 differing bytes; wealthy EXPECTED-DIFF 1,258,654 px** (board32 113,424; profile76 689,266; figure160 455,964) | `evidence/aura-diff/2026-10-08-00-40-03` |
| `aura:edge` (full grid, 53 × 6 sizes × 5 seeds + forced moment) | **36 pass / 17 fail — all 17 on untouched auras byte-identical to baseline** (pre-existing). Wealthy: **PASS** crew52, board59, studio88, figure128x163 (`hard=0`, `run50=0`, `contact=0.00s`); **BLEED** ring141 (`hard=39px run50=39px`, `edgeObj=wealthy-tophat ~72px`, moment `longestContact=3.62s`) + crate160 (`hard=45px run50=45px`, `~81px`) — deliberate crown bleed, whitelisted per the descended precedent | `evidence/aura-edge/2026-10-08-00-43-04` (+ `--only wealthy` `…-00-26-17`) |
| `aura:flashaudit` | **wealthy PASS** — 13 moments, 0 flashes, 0 reduced; page-wide 82 flashes ≤3/s PASS. `fallenlight` FAIL is **pre-existing** (same 32-flash ledger reproduced on the clean `9f67cbb` baseline in the rev3 pass) | `evidence/aura-flashaudit/2026-10-08-01-41-38` |
| `aura:perf --ab` | **0 fail** (47 pass / 6 warn). **Wealthy Δ−0.586 ms (−59.2%)** — 0.404 ms vs 0.990 ms baseline median | `evidence/aura-perf/2026-10-08-01-42-58` |
| `aura:stress` (fixed + ledger + revamp, board-32, 4× CPU, moments forced) | **within limits** — fixed p95 13.4 ms (WARN band, fail ≥16), ledger 15.6 ms, revamp 13.4 ms | `evidence/aura-stress/2026-10-08-01-46-33` |

Baseline worktree: `9f67cbb` (unchanged from the rev3 pin).

## Reference-vs-build comparison (self-critique)

`docs/wealthy-screens/v3-1/ring-rest.png` and `ring-moment.png` vs
`wealthy-ref-mogul.png`:

### Rest

| Aspect | Reference | Build v3.1 | Verdict |
|--------|-----------|------------|---------|
| Hat | Full top-hat crown towering above the head | Brim hovers at the photo's top rim; crown runs off the canvas top | **Intentional bleed** — reads as "too big for the frame" like `descended`; if Brodan wanted the whole crown visible this needs a rethink (headSz shrink) |
| Sun | Red→gold radiating dome behind the mogul | Dome sprite now halos clearly past the bezel's outer edge | **Match** |
| Pool | Pile fills the bottom ~50%, wraps the sides | Cradle covers the photo's bottom ~55–60%, side peaks higher, base at the ring bottom | **Match** |
| Bills | Large notes raining everywhere | Sprite rain behind + gun stream over | **Match** |
| Gun | Cash cannon on the right | Same grey pistol asset on the right rim | **Match** (unchanged asset) |

### Moment (mt≈0.55)

| Aspect | Reference | Build v3.1 | Verdict |
|--------|-----------|------------|---------|
| `$`-eyes | n/a (static ref) | Two big medallions centred on the eye line — now the focal piece; hat is lifted clear so nothing occludes them | **Delivered** |
| Tongue | n/a | ~1.8× wider, unrolls from the mouth and droops deep into the pool | **Delivered** |
| Hat | — | Tips through the moment with the crown off-frame; brim stays above the photo rim | **Consistent with rest** |

**Honest gaps:**

- The crown is *out of frame* at ring141/crate160 — the chosen seat
  trades "whole hat visible" for "hat lifted clear of the gag". If the
  eyeball pass wants the crown in frame at ring size, the lever is
  `circle: { hover }` down or `headSz` down — both reseat everywhere in
  circle mode.
- At small sizes the hat is proportionally much smaller (`headSz 1.75`)
  — a different balance than the ring, but the only way to keep the
  crown in frame under a raised seat. The gag still reads via the
  medallions.
- The hat brim floats a couple of px above the photo top edge at rest —
  it reads as perched on the ring rather than worn; the moment's
  dip/tip sell it as alive.
- The avatar's red shirt still sits behind the tongue's root region on
  `E.webp`; the longer tongue clears it visually.
- Gun asset unchanged per the brief's carry-over.

## Constraints held

No pushes, one commit; `APP_VERSION` untouched; no rewards/catalog
wiring; `docs/DECISIONS.md` untouched; no shared renderer changes this
pass (the `aura:diff` 0-byte result on the other 52 auras proves it);
bonewright 0-diff; the only tooling edit is the per-aura
`EDGE_BLEED_OK` whitelist entry, opt-in by id.

## Screenshot index (`docs/wealthy-screens/v3-1/`)

- `ring-rest.png` — rest ring view (282 px, composited on `E.webp`):
  haloing sun dome, bezel, deep pool, perched hat, right-rim gun, bill
  rain
- `ring-moment.png` — moment hold (~f102/186): giant `$` medallions on
  the eye line, tongue drooped into the pool, hat tipped off-frame

## Commit

Single commit — `aura(wealthy): revision 3.1 — composition tuning` (**the
commit containing this file**), on `main` directly on top of `59a9847`;
not pushed. Brodan eyeballs at `http://localhost:5174/?auras=1` before
push.
