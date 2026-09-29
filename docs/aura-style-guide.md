# Aura style guide (7m)

Standards for the aura ladder. **ember anchors R1, stormstep anchors R2** —
neither changed in 7m. The seven approved 7m pilots are the live references:
ironbound (R2), forge + standardbearer (R3), fallenlight + huntersmoon (R4),
eclipseheart + blacksun (R5).

## The ladder (7m, five rungs)

Measured on the ring view: `ring px` = particle footprint diameter in real
pixels on the 76 px avatar (`sz × 0.92` at the 141 px render); `lit%` = share
of the aura-only disc (r ≤ 70.5 px) with luminance ≥ 25; `lit% (glow=0)` =
the same measured with the ambient glow disc disabled — this is the number
that actually separates auras, see below; `glow` = the spec's ambient disc
alpha scale; `layers` = total spec layers incl. body-only.

Numeric bands per rung. `sz` values are spec units; hero footprint ≈
sz × unit × 5.2 (soft) / × 3.5 (hard) px on the 141 px ring render. Glow is
the ambient disc alpha scale — hard ceiling **1.8 at every rung** (the
gradient clips at glow × breathe ≈ 1.82; measured linear to there).

| axis | R1 quiet | R2 charged | R3 heavy | R4 showcase | R5 spectacle |
|---|---|---|---|---|---|
| glow | 0.70–0.85 | 1.00–1.15 | 1.15–1.25 | 1.35–1.50 | 1.55–1.75 |
| soft hero sz (≥110 px) | ≤4.5 | ≤5.5 | ≤6.5 | ≤8.0 | ≤9.5, orbit ≤1.2 |
| soft hero sz (`small:`) | ≤2.8 | ≤3.2 | ≤3.6 | ≤4.0 | ≤4.0 |
| hard hero sz (≥110 px) | ≤5 | ≤7 | ≤9 | ≤10.5 | ≤12 |
| hard hero sz (`small:`) | ≤4 | ≤5 | ≤5.5 | ≤6 | ≤6.5 |
| img sprite hero (×rx) | none | ≤0.5, behind-photo only | ≤0.7 | ≤0.9 | ≤1.2 |
| glyphring radius (×rx) | none | none | ≤0.4 | ≤0.5 | ≤0.5 |
| ring particles N | 10–25 | 20–35 | 25–45 | 35–60 | 40–80 |
| spec layers | 3–4 | 4–5 | 5–6 | 5–7 | ≥6 |
| signatures | none | ONE | signature + accent; no new moments, no sweeps | ≥2 + moment + art | unrestricted; moment + art |

**Signature sprite (amendment):** each aura may designate ONE sprite *asset*
as its signature — all `img` layers sharing that `src` count as one — and the
signature may exceed the rung's img cap. Its ceiling is the edge rule itself
at all six sizes. Resolve order when it bites: pull orbit `r` inward, reduce
bob/wobble, then shrink — **shrinking is the last resort, not the first**.
`small:` may set the signature's `sz` independently of blanket `scale`.

**Ceilings vs minimums.** For existing auras these rows are permitted
ceilings — an aura may sit below its rung, never above it. For an aura built
or reworked to a rung, the rows are minimums as well. Grandfathered
exceptions, by name: `iaidraw` (sweep at R1), `steadybreath` (rings at R1),
`nullpoint` (no moment at R4), `yogurt` (no signature at R5).

### Membership

| Rung | Members |
|---|---|
| **R1** | crate uncommon: sigil, steadybreath, iaidraw · rank 1–2: ember, tide |
| **R2** | crate epic: glassfire, stormstep, zeropoint, ninetail, ironbound · rank 3: storm |
| **R3** | feat: smolder, stormborn, dawn, wanderer, atlas, forge, standardbearer · boss: wyrm, frost, abyss, chud, rust, thunder, hollow, deep, magma, plague, sand, void · crate legendary: ledger, ossuary, redline, bonewright · rank 4: inferno |
| **R4** | crate mythic: nullpoint, carve, brandmark, fallenlight · rank 5: halo · special: huntersmoon |
| **R5** | special: yogurt, vendetta, ascended, wheel, champion · crate gilded: eclipseheart · crate secret: blacksun · rank 6: godray |

`soon_throne` and `soon_seraphim` are unassigned placeholders.

### `small:` — the size scope

`small:` is an opt-in size block (`w < 110` — crew 52, leaderboard 59, duel
67, studio 88) that merges on top of the active view block in either mode:
base → `circle`/`body` → `small`. It may change **size, count and speed
only** — never palette, shapes, signatures or art selection — enforced by
`validateSpec`. `small: { scale: k }` is the one-number opt-in (multiplies
`sz`/`n`, stacking with per-layer `small.scale`); explicit keys beat `scale`
for their field. `treatRim` is allowed inside `small:` for rim appearance
only — a dark silhouette needs more rim at 52 px than at 141 px. Specs
without `small:` are byte-identical at every size. See `DECISIONS.md` for
the full semantics and the three amendments.

### Why lit% is a floor, not a tier metric

`lit%` saturates on the glow disc: at `glow ≥ 0.75` the disc alone lights
~63 % of the ring regardless of the particles on top, so every normal aura
measures ~63 %. Report it anyway as a **"not barely visible" floor** — an
aura under ~55 % lit is probably too dim — but never use it to compare
tiers. Instead report **`lit% (glow=0)`** (particles only) next to it:
the two numbers together show how much of the brightness is ambient disc
vs particle work. Reference glow=0 lit%: ember ~10, stormstep ~5,
glassfire ~11, vendetta ~28 (vendetta's floor comes from the fixed `dark`
disc band — `rgba(c1, 0.66)` — not the particles).

### Dark-by-design auras

Dark-mood auras keep their dark mood. They do **not** chase the tier lit%
floor — target **lit 15–25 %** from a bright accent layer only (thin
`zap`/`sparkle`/`crescent` rim orbit or accent motes, bright palette on the
dark body). Note the fixed `dark` disc band itself can floor lit% at ~28 %
for warm-hued catalog colours (vendetta) — measure before trimming accents.
They must read clearly on a dark theme but never become bright auras.
(`void` is exempt — it is now the bright starfield aura, not dark-banded.)

## Pilot recipe — what a revamp looks like

Ring-first composition; board-32 and figure share the same spec.

- **Ring is orbit-only.** `orbit` layers at `r ∈ [0.95, 1.3]` keep every
  particle inside the canvas at board-32 (usable margin ≈ 9.4 px). Rim-orbits
  (~1.05–1.15) + a slightly outer fast ring (~1.15–1.3) reads as depth.
- **Body-only layers via the suppress idiom.** `rise`/`comet`/`fall` spawns
  clip the board edge at any visible size — make them body-only with
  `circle: { n: 0, a: 0 }` (n clamps to a minimum of 3, so `a: 0` is what
  actually silences the layer in circle mode). Rising embers / falling rain /
  comet trails live on the figure only.
- **Structure:** 1 hero layer (biggest shape, fewest particles) + 1–2 support
  layers (smaller, faster, more numerous) + accents (`sparkle`/`orb` motes,
  staggered `tw: 1` twinkles) + optional body-only motion layer.
- **Sizes:** size for the ring, not the sheet — hero sz chosen so footprint
  lands in the tier band. Chunky > numerous; board-32 blur kills small
  particles.
- **glow** sets the whole-disc brightness floor — it is the biggest single
  tier signal. Set it first, then tune particles against it.
- **Palette:** keep the aura's existing identity colours; brighten within
  them rather than adding new hues. One light/white accent max.
- **Distinctness:** every aura must have its own colour theme and
  signature, and must be instantly tellable apart from every other aura at
  ring size. If two auras read as "the same" at ring size, one of them
  needs a different palette, shape vocabulary, or signature.
- **Motion:** `spd` 0.9–1.35 typical; orbit `w` staggered so layers don't
  move in lockstep; twinkles staggered (`tw`) so nothing blinks in sync.

## Hard rules

- **Ring view is primary:** the ring (profile photo) view is the most
  important view. Every aura and every moment is designed for the ring
  first and must look complete and impressive there. Anything a moment
  shows on the figure needs a ring equivalent (for example, behind the
  photo and around its edge). Evidence always shows the ring view first.
- **Budget:** average loop time at or under 0.6 ms at board-32 / 4× CPU
  (quiet `--perf`, 400 frames, moments forced for moment auras), median of
  3 runs. p95 is reported for information only. Revamp stress: after every
  aura batch, run a board-32 stress with the 10 heaviest revamped auras
  (by average), circle mode, 4× CPU, moments forced; p95 must stay under
  16 ms. Over budget → fewer, bigger, brighter particles.
- **Flashes:** only through `noteStrikeFlash` (≤ 3/s page-wide, none under
  reduced motion). No whole-aura brightness oscillation faster than 3/s.
  Staggered per-particle twinkle is fine.
- **Moment bursts are individual:** every moment's burst is built from that
  aura's own motifs and colours. No shared generic white shockring or white
  wash. Any wash is tinted to the aura.
- **Edge scan = 0** at ring, board-32, and figure — except transient burst
  debris (moment flings). Bolt strikes are **not** debris: set
  `bolts.fit: 1` so strike vertices clamp inside the canvas (verified
  zero-clip on stormstep at board-32).
- **Reduced motion:** no flashes, calm particles. `bolts.calmEvery` slows
  strike cadence if bolts stay; particle motion freezes per existing reduce
  behaviour. The reduced shot must read as the same aura, paused.
- **Identity:** no changes to id, name, rarity, drop rate, unlock method,
  group, or achievements. Same crate, same tier — only the look changes.
- **Safety:** every batch proves all untouched auras at 0 differing bytes via
  `scripts/aura-7j-full-diff.mjs --fresh`.

## Evidence per aura (same set the pilots produced)

- Ring on dark + light, board-32, figure — before and after.
- Two frames (f90 + f120) and a reduced-motion ring shot.
- Metrics vs the ladder: ring px / lit% **and lit% (glow=0)** / glow / layers.
- Average loop time at board-32 / 4× CPU (quiet `--perf`, 400 frames,
  moments forced, median of 3); p95 reported for information only.
- Edge scan across sampled frames.
- **Look-alike strip:** a side-by-side ring-size strip showing each changed
  aura next to its 2–3 closest visual look-alikes, including approved auras
  such as `stormstep` — proves the distinctness rule at the size that
  matters.
- `evidence/` is gitignored — shots and JSONL never get committed.
