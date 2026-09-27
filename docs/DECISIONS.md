# Decisions

Rules a later session must not undo. Each one is the behavior the app ships.

## Workout credit and streaks

`WORKOUT_CREDIT` in `src/math.js` is the curve. A short walk and a long lift are not the same workout: strength is piecewise on effective minutes, runs and walks use their own minutes and a lower cap, mixed sessions add both and then cap, and quest or deck sessions stay at 0. Streaks count any session that earns credit, so a short walk still keeps the day.

## Claimed quests and earned achievements

A claimed quest stays claimed, and an earned achievement stays earned. `unionAchievements` only adds ids. A recount or a rule change must not take a reward back.

## Duel rule versioning

A workout duel stores `rule`. `rule >= WORKOUT_CREDIT.duelRule` sums workout credit. Older duels (no `rule`, or `0`) still count sessions. Editing the curve must not rescore a duel that already started.

## Bonewright flash rate

`noteStrikeFlash` allows at most one flash per burst and at most 3 per second (`FLASH_MIN_GAP` is 0.334s, so three gaps are longer than a second). Reduced motion never flashes. The gallery and any new renderer must go through this function.

## Bonewright flash paint

The strike flash uses `lighter` and a radial gradient that falls off to transparent. A `source-over` white fill paints a white box on the figure. That paint is not allowed.

## Physique anchors

`FIGURE_ANCHORS` is keyed by the figure's `physiqueSrc` path. Each rank and body has its own landmarks, so an unknown figure must not borrow another figure's entry. `src/auras/anchors.test.mjs` fails if any figure is missing an entry.

## Update reload

`reloadForUpdate` saves the live run (`saveLive`), writes `ascend-pending` synchronously, and only then reloads. If that write throws, it does not reload. The app never auto-reloads. The service-worker banner and the in-app **Update now** button both use this function.

## Service-worker caches

On activate, the worker keeps the current `VERSION` cache and the previous `ascend-v*` cache, and deletes every older cache. The previous cache is what a rollback still has on the phone. Keeping every historical cache fills storage.

## `api/`

Only Vercel functions live in `api/`. Every `.js` / `.mjs` file there becomes an endpoint. App source, tests, and scripts do not go in that folder.

## Prefetch waits for the service worker

In production, screen prefetch waits until `navigator.serviceWorker.controller` is set (or 20 seconds), and until Status is on screen. Prefetching before the worker controls the page races the precache and loads chunks twice. `?noprefetch=1` skips prefetch for timing runs.

## IP

No character names, series names, or copied art from real anime or manga anywhere in the product, the copy, or the asset files. Auras are original designs in an anime idiom.

## Aura moments: flashes, canvas edges, and frame budget

Every moment flash, recurring flare, and lightning strike goes through `noteStrikeFlash` — at most 3 flashes per second, none under reduced motion. `fx.moment.flash`, `fx.flare`, and `fx.bolts.flash` all gate; nothing draws an ungated bright flash. The same rule covers flares that spawn bolts (`fx.flare.bolt`): the strike only exists when the gate fires.

No part of a moment — bursts, beams, orbiting pieces, or placed images — may be cut off by the canvas edge in a way that looks chopped. Transient burst debris may exit while fading; image layers stay inside the canvas or dim out before the edge.

The leaderboard worst-case stress test must stay under 16 ms p95 at 4x CPU: all moment auras at board-32 with every moment forced simultaneously (`scripts/aura-p3b-perf.mjs`).

Per-aura budget: average loop time at or under 0.6 ms at board-32 / 4x CPU (quiet --perf, 400 frames, moments forced for moment auras), median of 3 runs. p95 is reported for information only. Revamp stress: after every aura batch, run a board-32 stress with the 10 heaviest revamped auras (by average), circle mode, 4x CPU, moments forced; p95 must stay under 16 ms.

`docs/aura-style-guide.md` is the standard for new and reworked auras: the approved rarity ladder, ring-first sizing recipe, and per-view particle sizes live there.

## Worn pieces must end inside the canvas

A worn piece anchored to the figure or photo (cloak, blindfold, hat) must never read as chopped by the canvas edge. Pieces that hang to the bottom edge — Ledger's cloak — fade out over their last stretch and report their smallest clearance in pixels, measured on a cloak-isolated render so full-canvas backdrops don't fake a 0 px margin (`scripts/aura-7i-p3-shots.mjs`). Sides and top get the same rule: the piece either stops short or fades.

## View-scoped spec overrides

`body:` and `circle:` blocks on an aura spec or a layer override only that render view (`src/auras/specFormat.js` `mergeViewSpec`/`mergeViewLayer`). The merge is one level deep: plain-object values merge key-by-key, scalars and arrays replace wholesale. An override must never be a full copy of the base — only the keys that differ. Gallery "Body figure" / "Avatar ring" edits write these blocks; "Both views" writes the shared value and drops the overrides. Structural layer keys (`VIEW_LOCKED_LAYER_KEYS`: kind, shape, src, frames, shadow, embers, placed, blend…) always stay shared.

## Testing commands are the supported checks

The named commands in `docs/TESTING.md` — `check`, `aura:diff`, `aura:perf`, `aura:stress`, `aura:shots`, `aura:flash`, `aura:contact`, `aura:baseline` — are the supported way to run checks. Changes to how anything is measured (frames, sizes, budgets, thresholds, warm-up) need a proposal first; the implementation follows the decision, not the other way round.

## `small:` view block (phase 7m Part 3 — approved by Brodan 2026-09-27)

A third override block `small:` on aura specs and layers, so ring-size heroes can grow
at 141 px while 52–88 px tiles (crew row, leaderboard, duel, studio) stay legible.
Opt-in only: a spec with no `small:` renders byte-identical to one without.

### Threshold and body mode

`small:` merges when the canvas is under 110 px wide: `w < 110`, the same predicate as
the existing unit floor (`Math.max(w < 110 ? 1.15 : 0.75, …)`). The definition is
**orthogonal**: `small` is a size scope, not a view. It applies on top of whichever
view block is active, in either mode — circle renders merge base → `circle` → `small`,
body renders merge base → `body` → `small`. No figure canvas under 110 px exists today,
so this is observationally identical to circle-only right now; it is chosen because the
unit floor already fires at `w < 110` in body mode too, and because a future small
figure canvas should get the tuned recipe rather than silently keeping the big one.
**Known consequence (intended):** if a body canvas under 110 px is ever introduced,
every aura carrying a `small:` block inherits those values there automatically.
(Brodan, 2026-09-27. Alternative considered and rejected: `mode === "circle" && w < 110`.)

### Merge order

base → view block (`body` or `circle`) → `small`, most specific last, with the existing
one-level-deep merge rule (plain objects merge key-by-key; scalars and arrays replace).
A `circle:` override still applies under 110 px unless `small:` overrides that same
field. At ≥110 px `small:` never merges. Nested view blocks are forbidden — no
`body:`/`circle:`/`small:` key may appear inside another view block — and `small:` may
not contain a `layers` array; per-layer overrides live on `layer.small`, matching how
`circle:` already works.

### `scale` — the one-number opt-in

`small: { scale: 0.45 }` multiplies particle **size and count** of the merged recipe:

- `spec.small.scale` applies to every layer's `sz` and `n`, and to the `sz`/`max` of a
  layer's `shadow` sub-spec. `spec.small.scale` × `layer.small.scale` stack
  multiplicatively; a layer-level `scale` adjusts one layer only.
- The ember layer a `flame` layer spawns gets the same factor applied to its own
  effective `sz`/`n` (defaults included), so `scale` reaches embers even though
  `embers` is a locked key.
- Multiplication hits the effective value after the base → view → `small` merge. An
  explicit `small:` key beats `scale` for that field: `small: { scale: 0.5, sz: [2, 2] }`
  pins `sz` at 2 while `n` halves.
- Scaled `n` stays fractional for the renderer's existing `Math.round(n × canvasScale)`
  to round, except on `even` layers where it is rounded to an integer so ring
  distribution stays even. `scale` must be a finite number > 0; values > 1 grow
  particles on small canvases.

Where `scale` falls short of the explicit form:

- One factor for everything — it cannot shrink `n` by 0.3 and `sz` by 0.8, or exempt a
  single hero layer, except via per-layer `small.scale` and explicit keys.
- No floors or ceilings. The renderer's own clamps still apply (1.35 px minimum
  particle size under 110 px; the 3-particle minimum on non-`even` layers), so `scale`
  cannot push a layer below either.
- It reaches only layer particle fields — `moment` internals, `bolts`, `rays`, `rings`,
  `sweep`, `corona`, `flare`, `art`/`overArt`, and glyphring geometry (`r`, `ringN`,
  `glyphS`) are not multiplied; tune those with explicit `small:` keys.
- Binary, not interpolated: full effect under 110 px, none at or above.

### What `small:` may change — size, count and speed only

Enforced by a new `validateSpec(spec)` in `src/auras/specFormat.js` returning a list of
violations; `npm test` runs it over every `AURA_FX` entry, so a bad `small:` block
fails `check`. The renderer does not re-validate on the hot path.

- Every leaf value inside `small:` must be a finite number or a numeric range array,
  under a whitelisted leaf key:
  - **count:** `n`, `max`, `anchors`, `ringN`
  - **size:** `sz`, `r`, `spawnR`, `sway`, `jit`, `headSz`, `rimSz`, `glyphS`, `mR`, `mScale`, `sx`, `sy`
  - **speed/timing:** `sp`, `spd`, `w`, `spin`, `rotW`, `drift`, `life`, `every`, `gap`, `rate`, `dur`, `period`, `cyclePeriod`
  - **meta:** `scale`
- `VIEW_LOCKED_LAYER_KEYS` stay locked inside `small:` too (so `embers`, `shadow`,
  `frames`, `shape`, `k`, `placed`, `blend`, … are rejected even though their leaf
  names might otherwise pass), and `layers`/`body`/`circle`/`small` keys are rejected
  inside any `small:` block.
- Everything else is rejected — palette (`c`, `colorCycle`), opacity (`a`), art and
  placement (`src`, `art`, `overArt`, `at`, `x`, `y`, `hover`, `rot`, `mX`, `mY`,
  `mRot`, `rim`, `rimSink`, `dir`, `flip`), flags and amplitudes (`even`, `low`,
  `frontOnly`, `fit`, `bob`, `wobble`, `wave`, `tremble`, `breathe`, `flicker`,
  `glint`, `tw`, `bobAmp`, `tongues`, `mside`, `mShake`, `mDim`, `mTrail`, `mStreak`,
  `mFlings`), flash fields, `glow`, `dark`. Whitelisted subtrees like
  `small: { bolts: { every: [9, 14] } }` or `small: { moment: { dur: 0.9 } }` pass —
  event timing is speed. The list is deliberately tight; widening it is its own
  proposal.

### Ring-size measurement pass — `--size ring`

`aura:perf` and `aura:stress` gain `--size board|ring` (default `board`, unchanged).
`ring` renders the real profile geometry — 141×141 circle, `ringR = 141/3.456` — the
same geometry `aura:shots` already uses. Everything else is identical: runs/median/4x
CPU, `--ab` alternation, the FAIL rule (>15% AND >0.05 ms over baseline), and the
stress gates (p95 < 16 ms; fixed-set WARN > 12 ms). Ring numbers are a **separate
series** — labelled `ring-141`, never averaged or compared against board-32 medians.
`GRANDFATHERED`/`KNOWN_OVER` ceilings are board-series numbers and print as info labels
only on ring runs; the stormstep ratio WARN stays because it is computed same-size.
This exists because after `small:` opt-ins land, board-32 measures the quiet recipe —
the gate must keep seeing the loud one. Part 7B consumes the ring-size stress pass.
