# Ascend — Phase 5 Part B: Bonewright and Brandmark (`7e`)

Replaces Part B of `ascend-phase-5.md` and supersedes `phase-c-prompt.md` (written before the assets
existed, before Git, and before the module split). Where this doc and the old one disagree, **this
one wins**; where the old one is more detailed, follow it.

Target version **`7e`**, SW cache `ascend-v7e`. **Stop for owner screenshot review before handing
anything over.**

## Environment

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`. Real build needs the `VITE_`
  env keys (a ~148 KB build means they weren't loaded). eslint baseline: the same 5 unused-var
  warnings. 109 unit tests.
- **Git.** Follow `SETUP.md`: clean `git status`, tag `pre-7e`, commit at the checkpoint, **never
  push** — the owner pushes and tags. No zips.
- Aura code lives in `src/auras/` (`catalog.js` = `AURAS`, `AuraCanvas.jsx` = `AURA_FX`, `makeAura`,
  `AURA_ART`, `auraImage`, `_auraImageCache`, `AuraLoop`, the `over` pass, `bolts`). Aura-adjacent
  data sits in `src/tabs/profile/` (`lookConsts.js`, `unlock.js`, `points.js`).
- Localhost: sign in only with `TEST_EMAIL` / `TEST_PASSWORD` (chud). chud stays `test: true`,
  `lb: false`, no crew, no boss damage.
- Don't undo: save/sync, crash-safe workouts, error boundaries, offline boot, SW precache and the
  two-cache rule, the update banners' safe reload, the diagnostic log, Phase 4 segments, lazy loading
  and prefetch, Phase 5 Part A's workout credit.
- **IP rule:** no character names, series names or copied art from real anime/manga anywhere — code,
  copy or filenames. These are original designs in an anime idiom.

## Rendering rules (unchanged since Phase B)

Extend the declarative spec system and the `AURA_ART` lookup. **No second rendering path**: one
canvas pair, one rAF loop, the `over` pass on the canvas above the photo. Nothing draws inside
r = 1.05 except deliberate `over` elements. The `over` canvas must still not be created for auras
that have no `over` layer.

**The assets already exist** in `public/aura/` — the old doc's placeholder instructions are void:

- `cape.webp` (447×512)
- `pauldron.webp` (301×384) — a single plate, mirrored for the pair
- `brand.png` (173×256)

Load all three through `auraImage`: lazy per aura, `decode()` before first paint, skip drawing while
not ready, permanent skip on failure. Generated art is produced on solid green, never a transparency
checkerboard.

---

## B1. Bonewright (Legendary)

### Lightning

Replace the current steam-burst-with-single-strike cycle; strikes are the centrepiece.

- Use the existing `bolts` mechanism — `thunder` and `vendetta` already call it; match that shape.
  Do not write a second lightning implementation.
- Big and yellow: `#FFF27A` core with a white-hot centre line and a wide `#FFD447` outer glow.
  Thicker than `thunder`'s bolts — strikes, not sparks.
- Fire in **bursts of 2–3 within ~400 ms**, then an irregular gap of 3–5 s (not a metronome).
- Strikes come from above and terminate at the ring edge, never the avatar centre.

### Full-frame flash — photosensitivity cap (stricter than the old doc)

- Peak brightness at most ~35% added, decaying over ~90 ms.
- **Hard limit: no more than 3 flashes per second, measured, regardless of how many bolts fire.**
  A burst of 3 strikes in 400 ms must **not** produce 3 flashes — rate-limit the flash independently
  of the bolts (e.g. one flash per burst, with a minimum interval enforced in code).
- Under `prefers-reduced-motion`: **no flash at all**, and calmer bolts. Everything else stays.

### Glowing eyes

Procedural (no sprite), drawn in the `over` pass on the avatar photo.

- Two elongated lens shapes at about y = −0.16 of avatar radius, at ±0.19 horizontally, about 0.17
  radius wide. Sitting slightly high reads better, since avatar photos are framed inconsistently.
- Anchor them to the **same face-region reference Nullpoint's blindfold uses**, so placement is
  consistent across photos.
- Colour `#8CFF5A` core, `#2BAA14` outer, additive bloom halo at ~2.5× the eye size. `lighter` for
  the bloom, `source-over` for the core.
- Idle flicker wanders on layered sines, roughly 0.75–1.0, never fully off.
- **On each strike they spike to full and bloom, then decay over ~250 ms, driven by the same strike
  timer as the bolts.** If the eyes and bolts run on independent timers the effect fails — this
  coupling is the point.

---

## B2. Brandmark (Mythic)

Layer order: **cape behind → avatar → pauldrons → sigil on top.**

### Sigil

- `brand.png` replaces the current single red dot and its thin trail. Drawn in the `over` pass, upper
  right at about r = 0.55 from centre, ~0.42 of avatar radius, rotated ~8° so it doesn't look pasted.
- Inherits the red dot's existing heartbeat: the same ~4.5 Hz sine, intensity ~0.7–1.0.
- A thin red trickle runs downward from the sigil's lowest point, drawn procedurally, length
  oscillating slowly. Retarget the existing trail code to start at the sigil rather than the ring.
- The sigil brightens in sync with the existing slab sweep.

### Cape

- `cape.webp` behind the avatar on the **main** canvas (not the `over` pass). Anchored at the
  shoulder line, wider at the bottom, slow lateral sway (~5 s period, small amplitude, pivoting from
  the top rather than sliding).

### Pauldrons

- `pauldron.webp` used twice, the second mirrored (`flip: 1`), in the `over` pass, at about ±0.62
  radius horizontally and +0.42 vertically, so they sit at the lower corners like shoulders entering
  from below.

---

## Checkpoint — stop for owner review

1. eslint baseline (same 5); real production build (report the size); 109 unit tests pass; `madge`
   zero cycles; harness on chud at 4× and 6×, 100/100, `fallbackCount` 0.
2. **Screenshots and short screen recordings** of both auras on the profile, the spin reveal (ghost
   sandbox Force prize) and the leaderboard card, in dark, light, zesty and custom at ~380 px.
3. **Measured flash rate ≤ 3/s** — say how it was measured (e.g. counted flash events over 10 s of
   heavy strikes). Show `prefers-reduced-motion` behaviour: no flash, calmer bolts, everything else
   intact.
4. Confirm the eyes and bolts are driven by one timer, not two.
5. Confirm the other auras are unchanged: Black Sun, Ninetail, Nullpoint, Eclipseheart, The Deep,
   Champion — screenshots compared against 7d.
6. Confirm the `over` canvas is still not created for auras without an `over` layer.
7. Frame time with each new aura equipped at 4× CPU throttle, and on the leaderboard where several
   cards render at once.
8. Offline relaunch still opens every tab; a mid-workout reload still keeps a typed set.
9. `APP_VERSION` `7e`, SW cache `ascend-v7e`. Production build has no `simrun`.
10. Commit; report the hash, `git diff --stat`, the files changed and a "noticed" list.

**Stop and send screenshots before handing over. Don't push.**
