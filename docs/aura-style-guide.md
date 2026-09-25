# Aura style guide (7k)

Standards for the aura revamp. Anchored on the two approved pilots:
**ember = the Tier 1 standard**, **stormstep = the Tier 2 standard**.

## The ladder

Measured on the ring view: `ring px` = particle footprint diameter in real
pixels on the 76 px avatar (`sz × 0.92` at the 141 px render); `lit%` = share
of the aura-only disc (r ≤ 70.5 px) with luminance ≥ 25; `glow` = the spec's
ambient disc alpha scale; `layers` = total spec layers incl. body-only.

| axis | **Tier 1** — ember standard | **Tier 2** — stormstep standard | **Tier 3** — showcase |
|---|---|---|---|
| hero ring particle | 2.5–3.5 px | 3.5–4.5 px | 4.5–6.5 px |
| lit% | 55–65 | 60–70 (lum ≥ 120) | 65–75 |
| glow | 0.75–0.85 | 1.0–1.15 | 1.3–1.55 |
| layers | 3–4 | 4–5 | ≥ 5 |
| signature | none — particle ring only | ONE: bolts, sweep, or art accent | several allowed (art, moments, rays, bolts) |
| flashes | none | via `noteStrikeFlash` only | via `noteStrikeFlash` only |

The step anyone notices: T1 → T2 adds ~+0.3 glow (disc luminance ~85 → ~137),
a visibly bigger hero shape, and one signature mechanic. T2 → T3 adds another
~+0.3 glow, hero particles ~1.5–2 px larger again, and art/moment content.

### Dark-by-design auras

`void`, `abyss`, `vendetta` keep their dark mood. They do **not** chase the
tier lit% band — target **lit 15–25 %** from a bright accent layer only
(thin `zap`/`sparkle`/`crescent` rim orbit or accent motes, bright palette on
the dark body). They must read clearly on a dark theme but never become
bright auras.

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

- **Budget:** p95 ≤ 0.8 ms at board-32 / 4× CPU for every revamped aura.
  Over budget → fewer, bigger, brighter particles.
- **Flashes:** only through `noteStrikeFlash` (≤ 3/s page-wide, none under
  reduced motion). No whole-aura brightness oscillation faster than 3/s.
  Staggered per-particle twinkle is fine.
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
- Metrics vs the ladder: ring px / lit% / glow / layers.
- p95 at board-32 / 4× CPU.
- Edge scan across sampled frames.
- **Look-alike strip:** a side-by-side ring-size strip showing each changed
  aura next to its 2–3 closest visual look-alikes, including approved auras
  such as `stormstep` — proves the distinctness rule at the size that
  matters.
- `evidence/` is gitignored — shots and JSONL never get committed.
