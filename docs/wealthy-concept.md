# Wealthy — approved concept + per-layer plan

Approved by Brodan 2026-10-07 (see `aura-brief-wealthy.md` sign-off; the
brief is the checklist authority, this doc is the build plan authority).

## Concept

Money-mogul flex: an oversized black top hat bobbing above the photo, a
gold sunburst pulsing behind, a cartoon money gun on the right rim raining
bills up-and-out, and a field of tumbling green bills plus twinkling gold
`$`s around the ring. Every ~20 s the payout gag fires: the hat dips, pops
up and tips, green `$` EYES burst over the photo's eye-line, and a red
cartoon tongue unrolls from photo centre; hold, snap back, resume.

Green leads, gold accents, black hat. No flashes anywhere; all brightening
is slow swell. Reads "cash" instantly at ring size.

## Architecture

Split: the `AURA_FX.wealthy` spec owns everything gallery-tunable (pure
data); `AURA_ART.wealthy` owns only what needs a measured point or a beat.

### Spec side (`AURA_FX.wealthy`)

- `rays` — the gold sunburst: `n` ~12, `spin` ~0.03, `len` ~1.35–1.45,
  `fit: 1`, low alpha plus the warm-white core glow; `mA`/`mLen` keyframes
  give the POP-beat swell.
- `moment` — `{ every: [16, 24], dur: 2.3 }` so the gag rides the normal
  scheduler (gallery Play, `seekMoment` and the reduce gate work for
  free). One `bursts` entry: `anchor: "head"`, sparkle/dollar, `at` ~0.15 —
  the ka-ching by the hat band.
- Layers:
  1. **Top hat** — `shape: "img"`, `placed: "head"`, hover gap, bob/wobble
     idle, oversized (`headSz`); `mY`/`mRot`/`mScale` keys drive
     dip → pop → tip → settle (img layers already carry these keys). Rim
     placement (`rim`/`rimSz`/`rimSink`) in circle view like the existing
     worn hats.
  2. **Ambient bill storm** — `shape: "bill"`, `k: "fall"` + drift + tumble.
  3. **`$` sparkle field** — `shape: "dollar"`, `tw: 1` twinkle, slow drift.
- `small:`/`circle:` overrides per size, per existing conventions.

### Painter side (`AURA_ART.wealthy`)

- **Money gun** on the over pass: sprite at a fixed point on the RIGHT rim,
  rotated ~45° so the barrel aims up-and-out; small recoil jitter per shot.
  `WEALTHY_MUZZLE` is a measured sprite-space point (the dark muzzle hole
  at the barrel tip) rotated WITH the sprite. A painter-managed `cc.bills`
  array spawns continuously from the muzzle (capped): ballistic up-out arc,
  then gravity + tumble, then fade at or before the frame edge — frame-edge
  exit is allowed only as transient burst debris. It fires CONTINUOUSLY at
  rest and reuses the shared `bill` draw so gun bills look identical to the
  ambient storm.
- **The gag** on `opts.moment.t` (the same `mt` timeline the spec layers
  read, so sync is automatic):
  - mt 0–0.13 — wind / ka-ching.
  - mt 0.13–0.4 — `$` eyes pop at `anchors.face` eye-line (overshoot ease,
    held pop).
  - mt 0.26–0.6 — tongue unrolls from photo centre (procedural ribbon,
    curled tip, overshoot-settle).
  - mt 0.6–0.85 — hold + a one-time gun flurry (fired-once flag in `cc`,
    reset when the moment clears).
  - mt 0.85–1 — retract.
- **reduce:** the painter suppresses the gag and gun firing; spec ambient
  layers get the standard 0.35 calm drift. No per-layer freeze flag.
- **Small/board (<110 px):** the painter drops gun, eyes and tongue; hat +
  bills + sunburst carry the identity via `small:` overrides.
- `AURA_ART.wealthy.anchorPoints` declares: hat brim-seat, gun muzzle,
  eye-line L/R, tongue attach (same `({ w, h, cx, cy })` signature as
  descended's; widen the gallery call to pass `rx`/`anchors` if needed,
  dev-only). `anchorPoints` must DERIVE from the painter's own constants,
  not copies.
- No `.cycle` (it is a moment aura, not a clock loop).

### New particle shapes (additive cases in `drawNewParticleShape`)

- `bill` — flat green note, white edge, built-in tumble; reused by the
  painter's muzzle bills so they look identical to the ambient storm.
- `dollar` — palette-tinted drawn `$` glyph (NOT the emoji shape — emoji
  cannot tint and renders per-OS). The `$` eyes use the same drawn
  approach at larger size with a dark outline, in green.

## Design direction

(Specific; adapt if the gallery's tonal system requires, and report any
change.)

- Palette: green LEADS — bill body ~`#2FBF5B` with shading ~`#1E8E43` and
  a white edge. Gold accents ~`#F2C230` with highlight ~`#FFD95A`. Black
  hat as supplied. Sunburst: gold at low alpha with a warm-white core.
- Hat: ~0.8–1.0× the photo width, seated level on the head anchor with the
  sprite's own tilt kept.
- `$` eyes: clear green `$` glyphs with a dark outline, readable at ring
  size, popping slightly past the photo surface then settling.
- Tongue: red cartoon tongue (ORIGINAL styling, rounded tip, subtle centre
  line), unrolling downward over the front of the photo.
- NO Mask / Jim Carrey likeness: no green face or skull-face, no yellow
  zoot suit, no that-character hat styling. An uninformed viewer should
  read "money mogul."
