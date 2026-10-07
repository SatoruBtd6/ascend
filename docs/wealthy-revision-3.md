# Wealthy — revision 3 report (sprite composition)

Replaces revision 2's procedural scene art with the six keyed sprites
commissioned for this pass (`public/aura/wealthy-{sun,pool,bill,tongue,eye,bezel}.webp`,
landed in `9f67cbb`), keeping the existing `wealthy-tophat.webp` and
`wealthy-gun.webp`. The moment clock, anchor system, burst plumbing and
gate tooling are unchanged. Prior passes: `docs/wealthy-build-report.md`,
`docs/wealthy-revision-2.md`. Reference: `docs/aura-refs/wealthy/wealthy-ref-mogul.png`.

Branched from **`9f67cbb`** on `main`. One commit, not pushed.

## What changed

### `AURA_FX.wealthy` (src/auras/AuraCanvas.jsx ~line 786)

- `sun` spec kept (`r:1.58, drop:0.14, a:0.97` + `mA/mR` swell keys) — it
  now drives the sprite draw instead of the procedural banded arc.
- `pool` procedural spec removed entirely (genPool/poolBill gone).
- Hat layer: `over: 1 → over: 2` (paints last, above the gag so the brim
  reads over the coin tops), `hover 0.05 → 0.13`, damped
  `bobAmp/wobble/rot` and gentler `mY/mRot/mScale` keys so the crown
  stays inside the canvas through the dip→pop→tip beat. Drawn width ≈
  0.85× photo at ring size (the edge rule is the ceiling — a true
  0.9–1.0× brim clips the border).
- Ambient bill storm: same layer spec, larger sprite sizes (`sz 8–13`,
  small `3.2–5.2`, body `4.5–7.5`); `shape:"bill"` now draws the keyed
  banknote sprite (below). `c` palette field dropped (sprite carries its
  own colours).
- Moment block untouched: `every [16,24]`, `dur 2.3`, the two `shower`
  bursts (`dollar` + `sparkle`, `over`) — the ka-ching at the hat band.

### `AURA_ART.wealthy` painter (~line 3350)

- `wealthySun` — draws `wealthy-sun.webp` on the **main** pass. The
  sprite's measured flat base row (0.742) seats at `cy + drop·ry` and the
  dome span maps to `R = min(rx,ry)·1.58`, clamped to the canvas minus
  the moment swell multiplier. `mA/mR` keys give the POP-beat swell —
  alpha/scale only, never `noteStrikeFlash`.
- `wealthyBezel` — **always-on** `wealthy-bezel.webp` on the over canvas
  (circle mode only): the measured inner hole (0.328·sprite) hugs the
  photo rim, outer edge (0.480) clamped inside the border. During
  `mt 0.15–0.8` a pale shine arc sweeps the band (sin window, ≤0.5
  alpha — not a flash, and damped 0.55× under reduced motion).
- `wealthyPool` — `wealthy-pool.webp` on the over canvas at rest: the
  sprite's concave cradle (measured mound tops 0.314, pile base 0.684)
  seats so the mounds wrap the photo's lower half. Width- and
  bottom-edge-capped. Dropped at board size outside circle mode.
- Gun — unchanged placement (`W_GUN_A/R/ANG/W`, measured muzzle pivot),
  still gated `mode==="circle" && !small && !reduce`, still fires
  `shape:"bill"` particles from `cc._muzzle` with the POP flurry
  (`mt 0.6–0.85` ×2.2 rate + 9-bill burst). Fired-bill size `9–14`.
- `$`-eyes — `wealthy-eye.webp` drawn as a mirrored pair
  (`scale(-1,1)` on the right) on `anchors.face`: `x ± eyeX·1.16`,
  seated `f.y + eyeW·0.35` — just under the eye line so the medallions
  read as coins peeking out from under the brim (the hat paints last on
  purpose). `easeOutBack` pop, small rotational wobble, snap-out at
  `mt 0.85`.
- Tongue — `wealthy-tongue.webp` unrolls from the mouth point
  (`cy + 0.06·ry` circle / `f.y + eyeW·1.5` body): progressive source
  crop (top-down reveal) + dest-height growth while the flat root stays
  pinned — slide+scale reveal clipped at the attachment. Slight sway,
  overshoot stretch to 1.07×, rolls back up at `mt 0.85`.
- Gag + gun suppressed together at board size (`m<110`), body mode, and
  under reduced motion — same gating as before.
- `anchorPoints` updated to the new constants (hat seat, muzzle, eye
  sockets, tongue attach) for the gallery overlay.

### Shared renderer — opt-in only

- `paintLayers` tier model: `over` is now read as a tier (`falsy → 0`
  main canvas, `truthy → 1` over canvas, `2` → painted last, after
  `overArt`). Two call sites switched to numeric tiers and one new call
  `paintLayers(overG, 2)` added after the `overArt` hook. **No existing
  spec uses `over: 2`** — every other aura resolves to the same 0/1 as
  before, proven by the 0-byte aura:diff.
- `shape:"bill"` draws `wealthy-bill.webp` (9-arg `drawImage` of the
  measured banknote crop `0.02,0.277 → 0.979,0.721`, `dw = s·1.3` with
  the sprite's own aspect) with the same `p.rot + sin(t·2.1+ph)·0.3`
  flutter as the old vector note — the ambient storm and gun stream
  share it. Wealthy is the only aura using `bill` — opt-in by the shape
  itself. Old procedural bill branch deleted.
- `makeAura` preloads all seven Wealthy sprites beside the existing
  asset-preload block so first paint isn't a pop-in.

### Tests (src/auras/rendererAdditions.test.mjs)

- `7j particle shapes animate…` — now `async`; warms the `bill` sprite
  through `FakeImage` and asserts a `drawImage` of `wealthy-bill` (was
  `fill`), still flutters and freezes under reduced motion.
- `wealthy renders without throwing; the hat sits head-anchored…` —
  also asserts **visible sprite output**: `wealthy-sun` and ambient
  `wealthy-bill` draws on the **main** canvas; `wealthy-bezel` +
  `wealthy-pool` on the **over** canvas at REST; and the over-canvas
  z-order `bezel → pool → hat` (index ordering on the op log).
- `wealthy money gun draws and fires bills…` — fired bills now counted
  as `drawImage` calls of `wealthy-bill` on the over canvas (was fillStyle
  palette counting).
- `wealthy moment pops sprite $ eyes…` — asserts two `wealthy-eye`
  `drawImage`s centred on the eye line (translate-y within 8px of
  `cy−0.16ry`), a `wealthy-tongue` draw with positive height, and that
  the whole gag + gun stay suppressed under reduced motion.

## Gates (all run on the final tree, current = 9f67cbb + this work)

| Gate | Result | Evidence |
|------|--------|----------|
| `npm test` | **310 pass / 0 fail** (inside `check`) | evidence below |
| `npm.cmd run check` | **PASS** — tests 310/0; eslint **0 errors, 5 warnings** (baseline); madge **0 cycles / 206 files**; build clean | — |
| `aura:diff --expect wealthy` | **52 auras 0 differing bytes; wealthy EXPECTED-DIFF 1,165,054 px** (main 554,463 + over 526,51 at board; profile76 647,817; figure160 409,123) | `evidence/aura-diff/2026-10-07-22-24-16` |
| `aura:edge` (full grid, 53 auras × 6 sizes × 5 seeds) | **wealthy PASS all six sizes** (`hard=0` steady+moment, `longestContact=0.00s`); 17 pre-existing fails on untouched auras — all byte-identical to baseline per the diff, so unchanged by this pass | `evidence/aura-edge/2026-10-07-22-35-17` (+ `--only wealthy` run `…-22-22-47`) |
| `aura:flashaudit` | **wealthy PASS** — 13 moments, 0 flashes, max 0/s, 0 reduced; page-wide 82 flashes ≤3/s PASS. `fallenlight` FAIL is **pre-existing**: identical 32-flash ledger reproduced on the clean `9f67cbb` baseline worktree (`evidence/aura-flashaudit/…-22-31-10` there) | `evidence/aura-flashaudit/2026-10-07-22-29-34` |
| `aura:perf --ab` | **0 fail** (50 pass / 3 warn). **Wealthy Δ−0.395 ms (−50.8%)** — 0.383 ms vs 0.778 ms baseline median; the sprite scene is cheaper than the procedural one | `evidence/aura-perf/2026-10-07-22-31-27` |
| `aura:stress` (fixed=leaderboard + ledger + revamp, board-32, 4× CPU, moments forced) | **within limits** — fixed p95 13.4 ms (WARN band, fail ≥16), ledger 12.8 ms, revamp 11.0 ms | `evidence/aura-stress/2026-10-07-22-34-32` |
| `aura:shots -- wealthy` | `wealthy-shot.png` + `wealthy-moment-film.png` (8 frames / 186-frame moment); edges `ring=0 board=0 fig=0` | `evidence/aura-shots/2026-10-07-23-20-25` |

Baseline worktree re-pinned `f432d9f → 9f67cbb` via `aura:baseline` for
the diff/perf runs.

## Reference-vs-build comparison (self-critique)

`docs/wealthy-screens/v3/ring-rest.png` and `ring-moment.png` vs
`wealthy-ref-mogul.png`:

| Aspect | Reference | Build | Verdict |
|--------|-----------|-------|---------|
| Composition | Mogul bursts out of a bill pile, sunburst behind, bills raining | Photo rises out of the cradle sprite, sun dome behind, rain of banknote sprites | **Match** (minus arms/hands, per brief) |
| Sun | Red→orange→gold radiating disc | Keyed dome sprite seated on `cy+drop`, slow moment swell | **Match** — real art replaces the banded arc |
| Pool | Pile fills bottom ~50%, wraps the figure's sides | Keyed cradle sprite wraps the photo's lower half, base tucked to the photo bottom | **Match** |
| Bezel | (plain disc edge) | Always-on gold ring frame + moment shine sweep | **Added flourish** — frames the photo cleanly |
| Bills | Large flat green notes everywhere | `wealthy-bill` sprite — ambient storm behind the photo, gun stream over it | **Match**; sprite reads far better than the v2 vector note |
| Hat | Top hat on the head | `wealthy-tophat` head-anchored, ~0.85× photo, dip→pop→tip on the moment | **Match** — sized to the edge ceiling |
| Gun | Cash cannon on the right | Existing `wealthy-gun` asset on the right rim, continuous fire, POP flurry | **Match** (asset unchanged per brief) |
| Gag | n/a (static ref) | Mirrored `$` medallions peek out from under the brim on the eye line; tongue unrolls from the mouth over the pile | **Delivered** |

**Honest gaps / weaker points:**

- The hat's brim sits at the eye line, not above the brow — at a
  photo-width size the sprite's crown-to-brim span (~0.82·sz ≈ 60 px)
  exceeds the space from canvas top to the eye line. Resolved by seating
  the `$`-eyes just below the eye line so they "peek out" from under
  the brim edge (hat paints last). Reads well in `ring-moment.png`.
- The avatar's red shirt band sits exactly behind the gag on `E.webp`;
  the tongue still reads (it hangs lower, into the pool) but the palette
  collision is the avatar's, not ours.
- `wealthy-gun.webp` is a grey pistol silhouette rather than a golden
  cash cannon — kept per the brief's "keep the existing gun".
- Small sizes (`m<110`, board32): pool/bezel/gun/gag all drop, leaving
  sun + hat + storm + twinkles — same degradation policy as v2.

## Constraints held

No pushes, one commit; `APP_VERSION` untouched; no rewards/catalog
wiring; `docs/DECISIONS.md` untouched; raw `_*-raw`/`_*-src` art and all
`evidence/` output uncommitted; `over: 2` and the sprite `bill` branch
are opt-in — the other 52 auras diff at 0 bytes; bonewright unchanged
(0-diff).

## Screenshot index (`docs/wealthy-screens/v3/`)

- `ring-rest.png` — rest ring view: bezel frame, sun dome, head-seated
  hat, cradle pool, right-rim gun, banknote rain (282 px, composited on
  `E.webp`)
- `ring-moment.png` — moment hold beat (mt≈0.62): `$` medallions peeking
  under the brim, tongue unrolled into the pool, hat tipped, bill flurry
- `evidence/aura-shots/2026-10-07-23-20-25/wealthy-moment-film.png` —
  8-frame filmstrip across the 186-frame moment

## Commit

Single commit — `aura(wealthy): revision 3 — sprite composition` (**the
commit containing this file**), on `main` directly on top of `9f67cbb`;
not pushed.
