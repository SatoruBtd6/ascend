# Part 3 — Aura tooling investigation report

Investigation for the build-and-review aura tool. Done on `main` at
`d52dc31` ("fix(aura gallery): crate-160 stray letter + none tile empty
editor"). Scope: read-only audit + proposal — no tool code this pass.

Note on prior-session state: Task B (the brief template) already landed on
main as commit `614b411` — `docs/aura-brief-template.md` +
`docs/aura-brief-descended.md` — and five gallery improvement commits
landed after it (`dd16f1a` scrub, `9bee871` toolbar grouping,
`b02fb1c` anchor overlay landmarks, `50a6a8b` Driving/source rows,
`d52dc31` crate/none fixes). This report audits the gallery **as it exists
at d52dc31**, which is further along than the "buttons don't work"
description — see §2.

Evidence: source read of `src/auras/{AuraCanvas.jsx,devGallery.jsx,
catalog.js,specFormat.js,anchors.js,boltClock.js}`, `src/Auth.jsx`, plus a
live smoke test — dev server + headless Chrome driving `?auras=1`: grid,
toolbar, Descended inspector, scope buttons, Copy spec, scrub/pause,
anchors, reduced motion, add/remove flame layer, shape sheet, Play moment,
⏭ moment. **Zero page errors; every control responded.** The smoke script
was a `/tmp` file, not committed.

---

## 1. How an aura is defined — a three-part hybrid

An aura is **data spec + imperative painter + metadata**, not one thing:

### a) `AURA_FX[id]` — the data spec (the editor's domain)

A plain object literal inside `src/auras/AuraCanvas.jsx` (~lines 11–1730).
Top-level fields:

- `spd`, `glow`, `dark`, `corona` — global look.
- `rays`, `bolts`, `sweep`, `rings[]`, `flare` — named sub-effects, each a
  small object (`rays: { n, c, spin, len, a, fan, fit }`, `bolts: { every,
  c, flashP, painter, minPx, fit, ... }`, `rings: [{ r, c, spin, a, w,
  filigree, ink, dash, colorCycle, ... }]`).
- `art` / `overArt` — name a painter in `AURA_ART` (main canvas / over
  canvas). This is where flagship auras live.
- `moment` — `{ every: [min,max], dur, reduceSlow, flash: {at, flashPeak,
  flashLife, flashC, anchor}, shake: {at, amp, dur}, bursts: [{at, path,
  shape, n, c, anchor, sp, sz, life, grav, a, over, fit, ... }] }`.
- `layers[]` — particle layers. Each has a motion **kind** `k`
  (`orbit`/`rise`/`fall`/`inward`/`bubble`), a **shape** (30+ named
  particle shapes, plus `img` sprite, `emoji`, `flame`, `glyphring`), and
  fields that are scalars or `[min,max]` ranges: `n, sz, w, r, sp, life,
  sway, drift, a, spin, wave, tw, jit, at, x, y, rot, even, flip, over,
  top, placed, hover, headSz, rimSz, rimSink, rimX, wander, e, blend,
  shadow, embers, frames/frameMode/frameDuration/fadeLen/frameOffsets,
  tongues, flicker, shimmerN`, and **moment keyframes** `mX, mY, mRot,
  mScale, mShake, mSpin, mR, mDim, mOrbit, mA, mFlings, mTrail, mAmp,
  mBurst` — all `[[t, v], …]` arrays sampled by `keyAt()` (linear
  interpolation, `t` normalized 0–1 over the moment).
- **View blocks** `body:` / `circle:` / `small:` / `large:` — per-view
  overrides merged one level deep (`mergeSpecForView`/`mergeLayerForView`
  in `specFormat.js`). `small:` (canvas <110px) is whitelisted to
  size/count/speed keys + a `scale` multiplier, enforced by
  `validateSpec()` in tests. `large:` exists for the 160px crate.

### b) `AURA_ART[name]` — painter functions (the flagship domain)

`export const AURA_ART = { … }` at line 1733: imperative canvas code, one
function per named art (`ophanim`, `descended`, `wheel`, `stormborn`,
`wanderer`, `vendetta`, `huntersmoon`, `blacksun`, `nullpoint`, `ledger`,
`bonewright`, `brandmark`, `atlas`, …). Each receives
`{ pass, g, over, clock, time, moment, cx, cy, rx, ry, w, h, unit, reduce,
anchors, cc, … }` — `pass` is `"main"`/`"over"`/`"late"` so one painter
draws behind AND over the photo; `cc` is a per-instance cache.

Painters self-declare tooling hooks: `AURA_ART.descended.cycle = 45` (the
scrub timeline's max) and `AURA_ART.descended.anchorPoints` (socket
markers for the gallery overlay).

### c) `AURAS` in `catalog.js` — metadata

`{ id, name, how, tier/rarity/group, colors }` — unlock text and card
metadata, deliberately separate from rendering. `resolveAuraId` handles
the one rename alias.

### d) Shared machinery

- `anchors.js` — the anchoring vocabulary. `resolveAuraAnchors(mode, geo,
  figure)` returns `{ face: {x, y, eyeX, eyeW}, shoulderX/Y/Half, cape,
  torso, sigil, pauldronH }`. Ring mode derives from `FACE_REGION` in
  avatar radii; body mode uses `FIGURE_ANCHORS` — hand-measured pixel
  landmarks on each 424×568 physique sprite. Layers opt in via
  `placed: "head"`/`"shoulders"` + `hover`/`headSz`, or `rim*` fields for
  the ring's top edge.
- Assets: `public/aura/*.webp` (~40 sprites) via the `auraImage()` cache —
  attached in specs as `shape:"img", src|frames, placed, at, sz`, or
  drawn directly in painters (`DESC_WINGS_SRC` etc.).
- Timing: `keyAt([[t,v],…])` keyframes everywhere; spec moments fire on a
  randomized `every` wait; painter sequences (Descended) key absolute
  seconds on `clock % cycle`.
- Flash safety: every flash funnels through `noteStrikeFlash`
  (`boltClock.js`), page-wide ≤3/s, none under reduce.

### Representative flagship: Descended

`AURA_FX.descended` is small on purpose — ambient only:

```js
descended: { spd: 0.9, glow: 0.5, art: "descended", overArt: "descended",
  dark: { mid: "#07080C", ring: "#14161C" },
  rings: [{ r: 1.1, c: "#23262B", spin: 0.02, a: 0.8, w: 2.2, filigree: 16, ink: 1 }],
  small: { scale: 0.6 },
  layers: [ /* ambient smoke rise + ember orbit only */ ] },
```

The signature is entirely in `AURA_ART.descended` (~200 lines): a 45s
`clock`-keyed sequence — REST 0–6s (8 eyes seated in the wing art's
sockets), SURGE 6–14s (spin-up to 3.4 rad/s with tangential shear +
smear), ARREST ~14s (overshoot; eyes pull out inward, main→over-canvas
handoff at identical pixels), WATCHING 14–40s (independent bounded wander
+ per-eye blinks on the over canvas), RETURN 40–45s (reseat, over→main).

**Eye-socket anchoring, concretely:** the wing sprite
(`descended-wings.webp`) was authored with 8 almond sockets; `DESC_SOCKS`
is a measured `[x,y]`-fraction table on the normalized sprite; each frame
the painter maps socket points through the wing's own transform (rotation
+ breathe + lag shear) and draws eyes there. `AURA_ART.descended.
anchorPoints` re-derives the same rest-pose points so the gallery overlay
can draw socket rings for review.

**What this means for a visual editor:** everything in `AURA_FX` is
editable data. Everything in `AURA_ART` is code — but painters consume
data-shaped things (keyframe arrays, measured point tables, declared
cycles/anchors), so the practical boundary is: *specs, keyframes, and
measured anchor tables in the tool; painter code stays hand-written.*

## 2. The gallery today (`?auras=1`, dev-only)

Gated at `Auth.jsx:20` on `import.meta.env.DEV` + URL param; lazy-imports
`devGallery.jsx` so production bundles drop it entirely.

**Verified working** (code + live smoke test, zero page errors):

- **Grid:** all 53 catalog auras as live tiles through the real
  `AuraCanvas` (single render path); name/rarity/id under each; `none`
  disabled.
- **Toolbar:** Backdrop (Figure / Default avatar / My photo + file input +
  hidden select for scripts), Figure (male/female + rank E–SS + ◀▶
  steppers), Theme (Dark/Light/Zesty/Custom + 3 pickers), Size (32 board /
  76 profile / 88 studio / 160 crate / inspect — real mount geometries),
  Overlays (Reduced motion via `matchMedia` stub, Anchors, Show shapes).
- **Inspector:** three live stages at once — body figure, avatar ring,
  board-32 — plus a real-chrome 76px `Avatar` preview (the production
  component).
- **ScrubBar:** play/pause, timeline seek (max = painter `cycle`, else
  moment window, else 30s), ⏭ moment (steps to a spec moment); seeks drive
  all three stages and survive remounts.
- **SpecEditor:** scope selector (Body figure only / Avatar ring only /
  Both views — writes route through `applyScopedEdit` into view blocks);
  sections: Overall, Driving/source (read-only painter/asset/placement
  rows), per-layer Motion/Particles/Appearance/Timing/Other groups;
  dedicated panels for `img` layers (shift/size/rotation/flip/blend/frame
  animation/shadow wisps) and `flame` layers (incl. ember sparks); ring
  rows + colour-cycle controls; rays/bolts/sweep/corona/flare sections;
  min/max pair sliders; per-field ⟲ reset with dirty dots; ●/○/×
  view-override markers; Advanced collapse; dead-control hiding
  (`editorFields`/`isDeadField` — a visible control must move pixels in
  the current view); "Add flame layer".
- **Live draft pipeline:** drafts write into `AURA_FX` directly → every
  mounted preview re-renders; mid-drag swaps a particle-capped preview
  spec so sliders stay smooth.
- **Copy spec / Reset:** `formatAuraEntry` emits lossless `id: {…}` JS for
  pasting into `AuraCanvas.jsx` (round-trip test covers every catalog
  aura); Reset deletes the draft.
- **Shape sheet:** 19 particle shapes previewed at board/ring/figure
  sizes. **PerfHud:** frame avg/p95, work, live canvases, images, shadow
  wisps.
- **Anchor overlay:** head circle, shoulder line, torso cross, eye
  sockets, sigil point + painter-declared `anchorPoints` (Descended's
  socket rings).
- **Automated coverage:** `scripts/gallery-effects.mjs` drives every
  visible control to min/max and pixel-diffs the result per aura;
  `aura-spec-probe.mjs` patches specs in-page and scans border alpha.

**Genuinely missing (the "can't drop in a shape/asset and fiddle" gap):**

1. **No generic add-layer.** Only "Add flame layer" exists; Remove exists
   only on flame layers. You cannot add a particle layer or an image
   layer.
2. **`src` is read-only.** Image layers show the file in a FixedNote —
   there is no way to point a layer at a new asset, and no file
   picker/drop. (Frame-cycle `frames[i]` paths ARE editable text inputs —
   a partial workaround.)
3. **`moment:` is hidden entirely** — `editorFields` filters
   `path[0] === "moment"`; moment cadence/duration/flash/burst numbers
   can't be tuned live.
4. **Painters are read-only** — `art`/`overArt` show as Driving/source
   rows only. For flagships (the auras Brodan builds) the biggest visuals
   are untunable; only keyframe/measure constants could reach them.
5. **`small:` has no editor scope** — hand-edited only (deliberate per
   the whitelist, but worth knowing).
6. **No new-aura scaffold** — you can only edit existing `AURA_FX` keys;
   starting a fresh aura still means hand-writing a spec + catalog row.
7. **No paste/import** — `parseAuraEntry` exists (used in tests) but the
   gallery never calls it; you can't load a spec string back in.
8. **Write-back is manual** — Copy spec → hand-paste into
   `AuraCanvas.jsx`; the pasted entry drops the code comments that carry
   design intent, and there's no diff/changed-fields-only export.
9. **No reference-image pane** — photo upload only fills the avatar face;
   no side-by-side or overlay for the reference images Brodan will now
   supply.
10. **No layer reorder.**

## 3. The feasible "drop in and fiddle" workflow

For each capability Brodan asked about — feasibility given the code:

- **Add/move/scale a particle layer live — EASY (spec edit).** The
  renderer consumes `AURA_FX` live and the gallery already remounts on
  draft change. Needs: an "Add particle layer" button (seed a minimal
  `{k:"orbit", shape:"dot", n, …}`), generalized Remove, and the existing
  Motion/Shape selects. S.
- **Drop in an asset layer — MEDIUM (spec edit + one renderer-friendly
  trick).** `shape:"img"` + `src` already lazy-loads via `auraImage()`.
  Needs: "Add image layer", editable `src`, and a file input that previews
  via `URL.createObjectURL` (same pattern as the photo picker) while the
  spec value stays the intended `/aura/name.webp` path — file goes to
  `public/aura/` on commit. Placement fields (at/r or x/y, sz, rot, flip,
  placed) already have sliders. S–M.
- **Adjust timing/motion and watch it loop — MOSTLY DONE.** Every scalar
  spec field already live-updates all three stages, and the scrub bar +
  pause exist. Missing: the `moment:` scalars (`every`, `dur`, `flash.*`,
  `shake.*`, burst fields) — they're plain numbers, so a Moment section
  reusing existing row components is S–M. Keyframe arrays (`mX`, `mSpin`,
  painter `keyAt` tables) are `[[t,v],…]` — editable as data but a real
  curve editor is M–L.
- **Side-by-side reference image — EASY.** A draggable/resizable reference
  pane (and optional onion-skin `<img>` over a stage at low opacity) is
  standalone DOM — no renderer involvement. S.
- **Write tweaked values back — three tiers, all feasible:**
  - *Copy spec* — exists, lossless, keep it.
  - *Copy diff* — emit only fields that differ from `originals.current`
    (the snapshot already exists) as a commented patch block. Shrinks the
    hand-merge and preserves intent comments. S.
  - *Write to file* — a tiny Vite dev middleware (e.g.
    `POST /__aura-spec`) that splices the formatted entry into
    `AuraCanvas.jsx` between markers. Removes hand-copying entirely but
    writes source code — keep it local/dev-gated. M.
  - *Paste spec* — `parseAuraEntry` already exists; a paste box to load a
    spec into a draft closes the loop. S.

So: **editing data, not generating code** — except new-aura scaffolding
and Phase C painter constants, where emitting a commented spec block /
`DESC_SOCKS`-style table is the deliverable.

## 4. Phased proposal (dev-only, extend — don't rebuild)

The existing gallery is the right architecture: one render path, spec as
data, scoped edits, round-trip-safe serialization. Rebuild not warranted.

- **Phase A — finish the editor (S, ~1 day).** Generic Add layer
  (particle + image + existing flame), per-layer Remove, editable
  `src`/file-picker preview on image layers, Moment scalars section,
  Paste-spec box. This alone delivers "drop in a shape/asset and fiddle"
  for the spec domain.
- **Phase B — build-and-review loop (M, ~2–3 days).** "New aura" scaffold
  (id + starter spec + catalog row emitted for paste), reference-image
  pane + onion-skin toggle on the inspect stage, Copy-diff export,
  optional `/__aura-spec` write endpoint. This is where reference-driven
  first passes get fast.
- **Phase C — flagship surface (L, ~4–6 days).** Keyframe/`keyAt` editor
  on the scrub timeline for `[[t,v]]` arrays (spec `m*` fields AND painter
  constants exposed as data); measured-anchor picker — click points on a
  dropped sprite → emit a `*_SOCKS` table + `anchorPoints` declaration so
  "eyes in sockets" is authored data, not remembered prose; layer reorder.
- **Not worth building:** a painter-code editor or a second renderer.
  `AURA_ART` is bespoke canvas code; the tool's ceiling is data (specs,
  keyframes, measured points). Flagship painters keep being hand-written —
  the win is the brief + measured constants + review hooks.

## 5. Why first-pass detail gets dropped — and what makes it checkable

- **The signature lives outside the spec.** For flagships the
  must-haves ("eyes in the sockets") are painter code + measured
  constants + asset design — no declarative slot exists where a builder
  could even *write* "seated in sockets". AURA_FX faithfully expresses
  particles/moments; it cannot express asset anchoring. That gap is where
  the Descended first pass lost the eyes.
- **Anchor seating is already half-checkable.** `placed:` layers, the
  `anchors.js` vocabulary, and `AURA_ART.*.anchorPoints` + the gallery
  overlay mean "eyes in sockets" can be a visible marker today and an
  asserted number tomorrow (compare eye positions to declared points at
  rest — the headless harnesses already mount auras). Naming the anchor
  per layer — which the Task-B brief now forces — turns intent into
  something reviewable.
- **Data/prose divergence is the other leak.** `mSpin`-style keyframes
  say *what* happens but not *why*; comments get dropped by Copy spec.
  The brief's beat table + per-item screenshot contract is the guard, and
  `aura:shots`/`aura:edge`/`aura:lit`/`aura:flashaudit`/`aura:contact`
  already produce machine evidence for the objective items (edges, lit%,
  flash ledger).
- **Cheap reinforcements worth considering later:** a `validateSpec`-style
  lint that flags a `placed:` layer whose anchor can't resolve for every
  figure art; and a CI-ish check that every `AURA_ART` with a sequence
  declares `.cycle` (one already does — make it a rule, not a courtesy).

---

## Task B status

Already on main as `614b411` (this session re-verified, no changes
needed): `docs/aura-brief-template.md` — the fill-in brief with the
anchor vocabulary, layer table, beat-by-beat moment, asset table,
must-have checklist, flash/perf section, and the build loop — and
`docs/aura-brief-descended.md` — the filled Descended example whose
checklist items 1–3 are exactly the sentences that would have caught the
eyes-on-a-plain-ring first pass.
