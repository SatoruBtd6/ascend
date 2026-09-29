# Decisions

Rules a later session must not undo. Each one is the behavior the app ships.

## kv owner trigger and NULL-owner rows (phase 7n security audit)

The live `kv` table has a BEFORE INSERT/UPDATE trigger that stamps
`owner := coalesce(old.owner, auth.uid())`. Two consequences:

- **Any unowned legacy row is claimed by whoever updates it first.** A
  byte-identical PATCH from any signed-in user takes ownership — this is how a
  diagnostic probe accidentally claimed a user's comment. After the
  2026-10 backfill, two `food:` catalog rows remain `owner = null` because they
  have no `from` field. **Recommendation (Brodan's call): owner-lock them** to a
  curator uid rather than leave them communal — they feed the shared food
  catalog everyone logs from, and `owner IS NULL` keeps them editable and
  deletable by any authenticated account. Communal editing buys nothing here;
  new foods are already stamped to their creator on insert.
- **Part 3 (N–R), 2026-10.** Recipes are editable in place (saved copy and
  shared `food:` slug updated; logged meals keep their baked-in values —
  history must not move). Workout credit stays computed, not recorded; the
  credit log derives every row via `creditBreakdown`. Ghost accounts publish
  `lb:` cards and appear on the board only for test-mode viewers;
  `settleSeason`/`applyReigning` always run on the ghost-free list. Tester
  tools unlock via 7 taps on the version number — the old password was in
  the bundle and protected nothing; the allowlist RPC `kv_audit_state` is
  the only real gate for foreign-state reads.
- **SQL-editor maintenance UPDATEs on `kv` silently do nothing to `owner`.**
  In the SQL editor `auth.uid()` is NULL, so the trigger writes
  `coalesce(old.owner, NULL)` back over whatever the statement set — the
  backfill "matched zero rows" exactly this way. Any future migration that
  touches `kv.owner` must disable the trigger for the transaction
  (`alter table public.kv disable trigger <name>` / `enable`), or work around it.

## Bodyweight rank classes (phase 7n — Brodan)

Bodyweight exercises carry a `bw` class on the exercise def. Endurance moves
(`bw: "end"` — air squat, sit-up, Russian twist, back extension, walking lunge,
burpee) scale tiers inverse-linearly with body mass (`BW_END_STEPS`,
exponent 1.0 vs the 171 lb / 72 in reference). Strength-limited moves
(`bw: "str"` — pull-up, chin-up, dip, hanging leg raise, push-up) get **no mass
scaling**: for these movements bodyweight IS the resistance, so a heavier person
is already doing more work per rep — a mass discount on top double-counts it.
This matches how gyms and military standards treat bodyweight strength
movements. The female scale splits by class: endurance ×0.85 (`FEMALE_END_SCALE`),
strength-limited ×0.7 (`FEMALE_REP_SCALE`) — the sex gap concentrates in
upper-body strength work. Unclassified bodyweight exercises default to `end`
(harder curve) so invented exercises cannot sandbag ranks.

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

`reloadForUpdate` saves the live run (`saveLive`), writes `ascend-pending` synchronously, and only then reloads. If that write throws, it does not reload. The service-worker banner and the in-app **Update now** button both use this function. Since 7o, once a new bundle is detected the app also auto-reloads the next time the page hides, but only while `updateReloadBlocked` returns null — a live run, an unsaved workout (`s.active`), a running rest or interval timer, or a half-typed field defers it to a later hide. The hidden reload stashes `ascend-return-tab` in sessionStorage so the user lands back on the same tab.

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

#### What the ring stress pass measures — realistic concurrency, not a grid

The stress gate must model a screen a user can actually see. An inventory of every
`AuraRing`/`AuraCanvas` mount (2026-09-27) shows a real screen displays **at most 3
ring-size (≥110 px) aura canvases**: the profile header avatar (~141 px canvas) plus
up to two `VersusSide` cards (~119–141 px) in the profile `VersusPanel`. CrateVault's
160 px preview and the ~116 px duel nemesis card are one-per-screen; every leaderboard
and crew tile tops out at ~107 px, so the 32-up board belongs to the board-32 series
and to `small:`.

So `aura:stress --size ring` gates on a dedicated frozen `ring` set — the 4 heaviest
auras (`STRESS_SETS.ring` in `scripts/aura-sets.mjs`, currently eclipseheart, godray,
blacksun, huntersmoon) — run at 141 px, 4× CPU, moments forced, p95 < 16 ms. Four
instances is strictly harder than the real worst screen (three canvases, only one at
141 px), so the gate keeps margin without inventing a load no user generates.

Running a bigger set at `--size ring` stays available as a synthetic worst case —
`--set fixed --size ring` measures 10 auras at 141 px — but it reports **INFO, never
FAIL**, because that configuration cannot occur in the app and must not constrain the
ladder. (The 13 ms fixed-set ring number from the Part 3 smoke run was this synthetic
config; it is evidence, not a gate number.) `aura:perf --size ring` stays per-aura and
informational, same as board.

## Dark-aura contrast metric (phase 7m Part 4 redo — proposed, pending Brodan approval)

lit% penalises exactly what a dark aura is trying to do — a near-black void with a
blinding rim scores low while looking loud. `aura:lit --contrast` therefore adds a
contrast triple measured on the ring-141 aura canvas at f120, alongside lit%:

- `rimPk` — 95th-percentile alpha-weighted luminance of **band** pixels
  (38 < r ≤ 70.5): how hot the brightest rim reads.
- `coreMin` — 5th-percentile luminance of **disc** pixels (r ≤ 38, alpha ≥ 128):
  how black the darkest solid floor gets.
- `bandMed` — median band luminance: catches grey-haze mid-tones that the two
  extremes alone miss.
- `ratio` — rimPk / max(1, coreMin): the void-versus-corona separation.

Proposed R5 dark-aura targets (ring-141, f120): `rimPk ≥ 150`, `coreMin ≤ 4`,
`bandMed ≤ 20`, `ratio ≥ 40`. Calibration: approved eclipseheart runs
rimPk 211 / coreMin 43.8 / bandMed 96.5 / ratio 4.8 — it is the *bright* R5 and must
stay out of this class; vendetta (dark, dim rim) runs rimPk 50.6 / ratio 11.8 and
would not pass, which is correct — it is a mid-tier dark aura, not an R5-dark.
The metric is a floor, not a look guarantee: it certifies the void is black and the
edge is hot; it does not judge composition, hue, or sprite quality.

## Blacksun rebuild opt-ins and pending cap amendment (phase 7m Part 4 redo)

Renderer additions are all opt-in; every non-opted aura stays byte-identical
(verified by `aura:diff`: ascended/wheel clean after a RNG-consumption fix — the
`r` floor must consume `rnd()` either way, so centred layers opt in via `ctr: 1`
rather than a `r:[0,0]` sentinel):

- `treat: "shadowfade"` on img layers — bakes a dark gradient source-atop plus a
  rim alpha-feather once per src+kind; shadow-wisp anchors derive from the treated
  silhouette. This is how the restored `wing.webp` loses its white rough-cut rim.
- `dark` accepts `{ mid, ring }` — overrides the hardcoded purple dark-glow stops.
- `ctr: 1` on orbit layers — drops the 0.5·rx orbit floor for a literally centred
  particle (blacksun's iron ring). Glyphring's existing 0 floor is unchanged.
- `aura:lit --mtime T` — forces a moment and samples lit/contrast at moment-time T
  (used to prove Umbra beat 2 reaches measured near-black: bandMed 1.3 at T=0.33).
- `treatRim: { c, dx, dy, a }` on treated img layers — bakes a rim-light crescent
  (silhouette minus a shifted copy, composited source-atop) so a treated sprite
  keeps a thin lit edge on one side. Steady-state nudge only; blacksun wings.
- `moment.reduceSlow` — under reduced motion the moment still plays with its
  duration multiplied (Umbra's swell slows 1.6x instead of vanishing); the
  flash gate is unchanged — reduced motion still fires zero flashes.
- `aura:moment-hue` — every-frame hue audit of the composited moment canvas;
  fails if visibly saturated pixels in the 290–340° magenta band exceed 1.5%
  of saturated pixels. Added when Umbra's additive shockring stack was found
  to clamp crimson bursts to (255,0,B) magenta — fixed by `n: 1` on the burst
  (the default 8 spawns 8 identical additive rings).

**PENDING APPROVAL — R5 img-sprite cap amendment.** The ladder table caps R5 img
sprites at ≤1.2·rx. Rebuilt blacksun exceeds it twice, deliberately:

- restored `wing.webp` at `sz 2.0` (≈2.0·rx span; raised 1.75→2.0 in the
  small-size/wings polish pass — Brodan: wings are the signature and were too
  easy to miss — with `r 0.92` and a deeper `mR` pullback during the swell so
  tips stay inside at all six evidence sizes);
- `blacksun-ring.webp` at `sz 3.2` (≈1.45·rx outer radius after the 0.452 trim
  fraction — the wrought-iron ring is the aura's signature).

Proposed wording: "R5 img sprites ≤1.2·rx, except `treat`-feathered or
signature-ring sprites up to ≤1.8·rx that pass the edge rule at all four sizes."
Evidence for the exception: `aura:edge` all-PASS at crew52/board59/ring141/
figure128x163 — worst steady hard 0px, worst moment run 6px clearing in 0.03s.
`wing-blacksun.webp` (the rejected sprite) is referenced by no aura and is left
in `public/` unused per instruction.

## Approval-commit diffs are the acceptance gate (phase 7m — Brodan 2026-09-28)

Any aura Brodan has approved is thereafter diffed against **its approval
commit**, not the v7k baseline. `aura:baseline -- <approval-commit>` + plain
`aura:diff -- --only <id>`; any differing pixel is examined. v7k stays useful
as the historical regression check, but it cannot see post-approval drift —
a spec can mutate after approval and still read "expected to differ" vs v7k.
`--expect` must never be used to wave through an unexamined change on an
approved aura.

Current approval pins:

- `eclipseheart` — approved at `5ffd2f3` (Part 4). Verified byte-identical at
  `d195d96`: `aura:diff --only eclipseheart`, 0 differing px at
  board32/profile76/figure160 across all sampled frames.
- `blacksun` — approved at `58931bd` (Part 4 redo 2 + small-size/wings polish:
  wings sz 2.0, stronger rim, Umbra growth via img `mScale`); re-pinned at
  `7dbceec` (Part 6f crate160 fix — `large:`-scoped wing pull-in;
  profile76/figure160 byte-identical to `58931bd`, crate160 edge-clean).

Real-mount evidence: every canvas size a user sees is now in the evidence
grids — `aura:edge` and `aura:shots` cover studio-88 (w88/ringR 25) and
crate-160 (w160/ringR 46) in addition to crew52/board59/ring141/figure160.
The dev gallery's "88 studio" and "160 crate" cells mount the real geometry
(CrateVault `ringR 52→46`, Studio `ringR 28→25` — the old mounts ran ~0.64
fill vs the tuned 0.579, clipping anything past ~1.5·rx).

### Widened-window findings (5 seeds x frames 30–240, all six sizes — recorded 2026-09-29)

The widened edge window surfaced contacts the old grid never saw. Numbers are
`steady hard px / contiguous run30`, fail rule is run > 3 px:

- `blacksun` crate160: steady hard 3px (run 3) at top@108 — **was within the
  letter of the run rule but visible on the rarest aura's showcase view, so
  fixed rather than excepted**: wings pulled in via `large:` (see above).
  Painter attribution: composite of the `wing.webp` tip + `blacksun-ring.webp`
  feather + `fall:ember` cinders at the same border pixel — no single layer
  reaches the border alone (bisect: removing ANY one layer cleared it;
  removing the wing was the only structural reach). ring141 keeps a steady
  2px/3px run at top@97 by construction — the diff gate requires it
  byte-identical to `58931bd`, so it is a known *recorded* contact, not a
  regression.
- `fallenlight` figure128x163: steady hard 4px / run 3 — inside the fail
  threshold but at the boundary; the moment contact (hard 23px, 0.67s) is the
  recorded figure-view exception (frozen view, `img:halo-cracked.webp` painter).
  Disposition: **rollout** — the steady 4px sits at the rule's edge on a view
  that is already excepted; revisit only if the figure exception is lifted.
- `eclipseheart` crew52/board59: steady hard 3px / run30 3px (run50 1–2px) —
  **within rule, exactly at the boundary**, `rise:smoke` painter.
  Disposition: **never unless the rule tightens** — one more px of contiguous
  contact would fail; worth a re-check if smoke params ever change.
- `huntersmoon`: 1px transients at all six sizes (steady run30 1px, moment
  contacts ≤0.15s) — **within rule**, transient debris allowance.
  Disposition: **never** — this is what the transient allowance exists for.

## `small:` may override rim appearance (phase 7m — approved by Brodan 2026-09-28)

`treatRim` is in `SMALL_ALLOWED_KEYS`, scoped to rim appearance only — colour
(`c`, hex), offset (`dx`/`dy`) and alpha (`a`); validated by `isRimBlock` in
`validateSpec`. Rationale: `small:` exists so an aura reads correctly at every
size, and a dark silhouette needs more rim at 52px than at 141px to read at
all. This does not open `small:` to palette or shape changes — `treatRim` is
edge lighting on an existing sprite; the sprite itself is unchanged.
First use: blacksun's wings (`small: { treatRim: { c:"#FF3A3A", dy:0.1, a:1 } }`).

## `large:` view block (phase 7m — crate-scoped fixes)

A third size scope symmetric to `small:`: `large:` merges on top of the active
view block whenever the canvas is **at or over `LARGE_VIEW_PX = 150` px** —
today that is exactly crate160 (ring141 at 141 px stays under it; figure160's
body canvas is 128 px wide, also under it). It exists because the crate-160
edge rule could not otherwise be fixed without moving pixels on the
approval-diff cells (profile76 = 141 px circle, figure160 = body): every
geometry parameter scales with `w`, so the only honest isolation was a size
gate. `mergeLayerForView`/`mergeSpecForView`/`viewBlocksFor` handle it through
the same one-level merge as `small:`; opt-in — specs without a `large:` key
merge byte-identically at every size, and no spec field named `large` existed
before the block was added. First use: blacksun's wings
(`large: { r: [0.86, 0.86] }` — orbit pull-in, the amendment's first resolve
step, clearing the crate160 top-border touch while profile76/figure160/ring141
stay byte-identical to `58931bd`).

## fallenlight is a known multi-source flash aura (phase 7m — 2026-09-28)

`aura:flashaudit` intentionally FAILS fallenlight: one moment produces
**32 flashes across 8 moments (4.00/moment)** from three independent gated
paths — measured per-source as `bolts→flare:19`, `moment.flash:7`,
`flare:6` (the `bolts→flare` label is the bolt flash path rendering with the
`flare` spec). Every path goes through `noteStrikeFlash`; reduced motion
fires 0; the page-wide cap holds (≤3/s). The strict `flashes === moments`
equality stays as the gate — do NOT relax it; this fail is the audit working.
Any future flash-path increase on fallenlight fails loudly here.

Page-wide worst case, answered once: 32 fallenlights on one leaderboard each
demanding ~4 flashes/moment can *demand* far more than 3 flashes/s — but the
shared page budget in `boltClock` (`FLASH_MIN_GAP = 0.334s`) drops excess
attempts. Measured: 32 forced-moment instances, 40 s → 97 flashes fired,
max 3/s in any 1 s window (demand mostly suppressed: only 3 of ~30
`moment.flash` calls fired). The failure mode of saturation is lost flashes,
not extra flashes — the emitted rate cannot exceed ~3/s by construction.

## fallenlight figure-view edge breach — known exception, scoped (phase 7m — 2026-09-28)

`aura:edge` reports a pre-existing breach at **figure128x163 ONLY**:
moment hard **23px**, run50 17px, longest contact **0.58s** — the
halo-cracked sprite's moment `mY` snap reaches the top border under seed-dependent
bob. Confirmed pre-existing (identical numbers on the untouched spec) and
unfixable while the figure view is a protected/frozen byte-identical moment.
This is a per-view exception for fallenlight's figure128x163 cell only —
it is NOT a general edge-rule exception; every other aura and every other
fallenlight view remains bound by hard=0 steady / run50≤3px / <0.5s clear.

## Signature-sprite allowance + `rimlight` treat (phase 7m — approved by Brodan 2026-09-29)

The rung img-hero caps (R2 ≤0.5, R3 ≤0.7, R4 ≤0.9, R5 ≤1.2 ×rx) proved too
tight for sprite-led auras: shrinking the identity sprite and compensating
with glow produced brighter auras that lost their signature (fallenlight-style
lit% fell while brightness rose — glow disc is filler, the sprite is the
identity). Amendment, approved as written:

- Each aura may designate ONE sprite *asset* as its signature — all `img`
  layers sharing that `src` count as one signature (ironbound's three chains).
- The signature sprite may exceed the rung's img-hero cap. All other
  sprites stay capped.
- The signature's ceiling is the edge rule itself: painted border alpha = 0
  at all six sizes, steady AND moment, all seeds.
- If the painted sprite reaches the border, resolve in order: (1) pull orbit
  `r` inward, (2) reduce bob/wobble amplitude, (3) shrink — **shrinking is
  the last resort, not the first**.
- `small:` may set the signature's `sz` independently of blanket `scale`, to
  keep it legible at crew52.

Renderer support: `treat: "rimlight"` — opt-in; bakes the same (dx,dy)-shifted
edge catch as `treatRim` but WITHOUT `shadowfade`'s darkening, for bright
sprites. Non-treated layers remain byte-identical. First use: forge's hammer
(`treatRim { c:"#FF8A2A", dx:-0.03, dy:-0.05, a:0.85 }`, rim faces the
forge-floor strike light).

## `wave:{strips,amp,period}` + `rotTracksOrbit` (phase 7m — approved by Brodan 2026-09-29)

Two opt-in `img`-layer fields, both approved on method + cost before building:

- `wave:{strips,amp,period}` — segmented cloth draw: the sprite is drawn as N
  horizontal strips, each x-offset by `sin(t·2π/period + i·step)·amp·min(rx,ry)`,
  so one wave travels down the sprite's length. Built for standardbearer's
  banner (7 strips, amp 0.045, period 2.4s — slow heraldic ripple, damped to
  30% under reduced motion). Skew was rejected (reads as leaning, not cloth).
  COST: 7 drawImage calls instead of 1 on one layer ≈ +0.03ms.
- `rotTracksOrbit` — the sprite's rotation tracks its orbit angle
  (`p.ang + rot·2π` instead of `p.rot`), laying its long axis along the orbit
  tangent. Built for ironbound's encircling chain links, so they read as one
  continuous chain wrapping the ring rather than links floating near it.
  COST: same single rotate call — free.

`wave` keeps its existing NUMERIC meaning (orbit radial oscillation) when a
number — the object form is type-gated, so both semantics coexist on the same
field name. Both fields are opt-in at layer level; non-opted auras are
byte-identical (confirmed in the aura:diff run for this batch).

## aura:edge seed/frame window widened (phase 7m — 2026-09-29)

The steady-state grid scanned 7 sampled frames per seed
({60,90,…,240} x 3 seeds); a transient that fires between samples could hide —
measured live: forge's first moment can roll at t≈0.4s and a 3-frame
bottom-border spark graze at frame ~223 sat between grid points. Now 5 seeds
and EVERY frame 30–240 is scanned (steady vs moment classified by
`inst.moment`), plus the unchanged forced-moment pass.

## Phase 7m close-out — the loudness ladder (settled at v7m)

**Rung map** — approved by Brodan across Parts 4–6; the binding table is in
`docs/phase-7m-ladder.md` and the working copy is in `docs/aura-style-guide.md`:

- **R1 quiet:** sigil, steadybreath, iaidraw (crate uncommon); ember, tide (rank 1–2)
- **R2 charged:** glassfire, stormstep, zeropoint, ninetail, ironbound (crate epic); storm (rank 3)
- **R3 heavy:** smolder, stormborn, dawn, wanderer, atlas, forge, standardbearer (feat);
  wyrm, frost, abyss, chud, rust, thunder, hollow, deep, magma, plague, sand, void (boss);
  ledger, ossuary, redline, bonewright (crate legendary); inferno (rank 4)
- **R4 showcase:** nullpoint, carve, brandmark, fallenlight (crate mythic);
  halo (rank 5); huntersmoon (special)
- **R5 spectacle:** yogurt, vendetta, ascended, wheel, champion (special);
  eclipseheart (crate gilded); blacksun (crate secret); godray (rank 6)
- `soon_throne`, `soon_seraphim` are unassigned placeholders, untouched.

Ceilings vs minimums: for existing auras the rung rows are permitted ceilings —
an aura may sit below its rung, never above it. For an aura built or reworked
to a rung the rows are minimums as well. Grandfathered exceptions by name:
`iaidraw` (sweep at R1), `steadybreath` (rings at R1), `nullpoint` (no moment
at R4), `yogurt` (no signature at R5).

**Edge rule (measurable):** border = the outermost 1-px rows on all four edges,
both canvases. `edgeSoft` (alpha < 0.30) is always legal; `edgeHard`
(alpha ≥ 0.30) must be 0 in steady state — transient burst debris may exit if
it clears within 0.5 s and is reported; `edgeRun` (connected run at
alpha ≥ 0.50) must stay ≤ 3 px. Verdict is the max over 5 seeds × every frame
30–240 + a forced-moment pass at all six evidence sizes.

**Budget reference pinned:** under `aura:perf --ab` the ratio WARN denominates
on the baseline side's stormstep median, so a warm or cold current session
cannot inflate every ratio. Plain runs keep the live ref as a same-session
approximation.

**FAIL exemption (expired at v7m):** `P7M_FAIL_EXEMPT` in `aura-sets.mjs` held
the seven pilot ids out of the --ab FAIL rule for the phase. At the v7m tag the
baseline re-pins, the exemptions retire, and each pilot's v7m median becomes
its ceiling in `GRANDFATHERED`.

**`spectacle` stress set:** frozen — yogurt, vendetta, ascended, wheel,
champion, eclipseheart, blacksun, godray; board-32, circle, 4x CPU, moments
forced, p95 < 16 ms. It exists because fixed/ledger/revamp exclude the loudest
auras, so the gate would not cover the worst board.

**Rollout stop rule:** after each rollout batch, run the stress sets; if
fixed-set p95 exceeds 14.5 ms the rollout pauses and the remaining rungs get
cheaper recipes. 16 ms is where frames start dropping; 14.5 is the margin that
keeps session noise from eating it.

**Per-rung ratio budgets** (item K): the flat 1.3x stormstep line was a dead
signal — every R5 aura violates it by design. Replaced by
`RUNG_RATIO_BUDGET` in `aura-sets.mjs`, derived from the seven approved
pilots' measured medians (~10% over each rung's costliest approved member):
board-32 R1 0.95x / R2 1.3x / R3 1.7x / R4 3.5x / R5 5.5x; ring-141 R1 1.3x /
R2 1.3x / R3 2.7x / R4 3.6x / R5 4.5x. R1 has no pilot — its line is ~10% over
the costliest existing R1 member (tide, 0.84x board / 1.15x ring) rather than
the ember anchor alone, so untouched quiet auras don't warn for being
themselves. `AURA_RUNG` holds the map; unassigned auras fall back to 1.3x.
An aura warns only when it is costlier than its rung's proven maximum.

**Session validity** (item L): under `--ab`, if the pinned reference's own
B−A delta crosses the FAIL threshold (>0.05 ms AND >15%, either direction —
drift either way means the two sides ran under different load), every verdict
in the session prints INVALID, the run exits non-zero, and a rerun is
required. Caveat recorded: the reference is exempt from FAIL by position, so
without this check a genuine stormstep regression would print WARN and could
never gate — session invalidation is what closes that hole.

**Diff harness (item M):** the ninetail 7,219-px board32 blip was narrowed to
browser-session resource accumulation, not renderer state — in-cell state is
airtight (seeded RNG, flash clock reset, synchronous captures, fresh page per
aura) but `newPage` leaked each aura's whole browser context (~50 live
gallery canvases per leaked context, ~100 contexts per full run). Harness
hardened three ways: the context is now closed per aura; the subject aura's
moment is warmed once per page so moment-only `auraImage` calls (vendetta's
skull) can no longer register mid-cell after the image wait; and every cell
records an image-state ledger — a diff where the two sides' ledgers disagree,
an image is still pending, or an src registered late prints HARNESS-SUSPECT /
HARNESS flags instead of silently passing or failing. The mechanism is not
proven end-to-end (no live recurrence caught), so the rule stands: a lone
unexplained diff warrants a rerun and investigation, not a shrug.

**blacksun pre-existing clip:** `AURA_ART.blacksun`'s eclipse disc reached
≈1.97·rx against a ≈1.72·rx frame half — opaque pixels leaving the canvas for
seconds per orbit, present before 7m. Fixed in Part 4 as a bug fix; the wing
sprite's `large:` pull-in (crate160) is recorded under its own section.

**Why the unit floor was not lowered:** a global floor drop rewrites all 51
auras at small sizes, invalidates every zero-diff gate, and lands hardest on
soft-particle commons (ember and stormstep deflate) while barely moving the
sprite-driven auras that need it (eclipseheart). `small:` was chosen instead —
opt-in, byte-identical for non-opted auras.

**`carve` stays in `KNOWN_OVER`:** over the 0.6 ms board budget by ~0.04 ms —
inside session noise — and the only route to the saving changes approved
pixels. Recorded, not fixed.

**`chain-heavy.webp` is kept:** it is unreferenced after ironbound's revert to
`chain.webp`, but it is the only surviving output of
`scripts/aura-asset-key-chain.mjs` — the source jpg was never committed, so
deleting it would destroy the asset irreversibly. 18.7 KB of `public/` weight
is immaterial; removal is permanent, keeping it is not.
