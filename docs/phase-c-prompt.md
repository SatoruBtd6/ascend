# Cursor task — Phase C: Bonewright and Brandmark

**Do not start this until Phase B is finished and verified.** Phase B is Black Sun, Ninetail and
Nullpoint. This is a separate pass. Same rules throughout: extend the declarative spec system and
the `AURA_ART` lookup, no new rendering paths, no new shapes unless listed here.

Prerequisite: this depends on the `over: 1` draw pass (second canvas stacked above the photo)
built in Phase B for Nullpoint's blindfold. Everything below that sits on the avatar uses it.

---

## 3a. Bonewright — lightning and glowing eyes

### Lightning

Bonewright currently has a steam burst on a ~6 s cycle with a single strike preceding it. Make the
strikes the centrepiece:

- Use the existing `bolts` mechanism — do not write a second lightning implementation. `thunder`
  and `vendetta` already use it; match that call shape.
- Big and yellow: `#FFF27A` core with a white-hot centre line and a wide `#FFD447` outer glow.
  Thicker than `thunder`'s bolts — these should read as strikes, not sparks.
- Fire in **bursts of 2–3 within ~400 ms**, then a gap of 3–5 s. Irregular gaps, not a metronome.
- Each burst drives a **full-frame flash**: everything brightens for ~90 ms and falls off fast.
  Cap the flash at about 35% added brightness — a screenshot-worthy aura that strobes is a
  problem for photosensitive users, and this one is on a Legendary that people will stare at.
- Strikes come from above and terminate at the ring edge, not the avatar centre.
- Under `prefers-reduced-motion`: keep the bolts, drop the full-frame flash entirely.

### Glowing eyes

Two glowing eyes on the avatar photo, drawn in the `over` pass. **Procedural, no sprite** — drawn
eyes can bloom and flicker with the lightning, which a flat image can't.

- Two elongated lens shapes, positioned at roughly y = −0.16 of avatar radius, horizontally at
  ±0.19, sized about 0.17 radius wide. Sitting a little high reads better than anatomically
  correct, because avatar photos are framed inconsistently.
- Colour: `#8CFF5A` core, `#2BAA14` outer, with an additive bloom halo at ~2.5× the eye's size.
- Idle flicker: intensity wanders on layered sines, roughly 0.75–1.0, never fully off.
- **On a lightning strike they spike to full and bloom hard**, then decay over ~250 ms. That
  coupling is the whole effect — if the eyes and the bolts run on independent timers it won't land.
- `lighter` blend for the bloom, `source-over` for the core.

---

## 3b. Brandmark — sigil, pauldrons, cape

### The sigil

`brand.png` (173×256, 44 KB) goes in `public/aura/`. It replaces the current single red dot and
its thin trail.

- Drawn in the `over` pass, on the avatar, upper right at about r=0.55 from centre, sized ~0.42 of
  avatar radius. Slight rotation (~8°) so it doesn't look pasted on.
- Keep the existing beat: it pulses on the same ~4.5 Hz sine the red dot uses now, intensity
  roughly 0.7–1.0.
- A thin red trickle runs downward from the sigil's lowest point, drawn procedurally, length
  oscillating slowly. The existing trail code is close — retarget it to start at the sigil rather
  than at the ring.
- The sigil brightens in sync with the existing slab sweep.

### Pauldrons and cape

These two need assets I don't have yet. **Build the layer plumbing now with placeholders and
leave the spec entries commented with the intended paths**, so dropping the real files in later is
a one-line change per layer:

- `cape.png` — behind the avatar, on the normal under-photo canvas (not the `over` pass).
  Anchored at the shoulder line, wider at the bottom, with a slow lateral sway (~5 s period,
  small amplitude, pivoting from the top rather than sliding).
- `pauldron.png` — a single shoulder plate, used twice, one mirrored with `flip: 1`. In the
  `over` pass, anchored at roughly ±0.62 radius horizontally and +0.42 vertically, so they sit at
  the lower corners of the frame like shoulders entering from below.

Order matters: cape behind, avatar, then pauldrons, then the sigil on top.

---

## Phase C verification

- `npx.cmd eslint .` — diff against baseline, paste it.
- Real `npm.cmd run build` with both Vite env vars loaded — paste the bundle size. ~148 KB means
  the env vars weren't loaded and the app was dead-code-eliminated; a real build is now ~1,030 KB.
- Render Bonewright and Brandmark in dark, light, zesty and custom, on the leaderboard card and
  the profile.
- Confirm the eyes and the lightning are driven by the same timer, not two.
- Confirm `prefers-reduced-motion` drops the full-frame flash and keeps everything else.
- Confirm the `over` canvas is still not created for auras with no `over` layer.
- Frame timing check on a mid-range phone profile for Bonewright — full-frame flashes are cheap
  but the bloom passes are not.
- Log in as `chud` from `TEST_EMAIL` / `TEST_PASSWORD` in `.env.local`. **`chud` must not sit on
  the leaderboard, must not join a crew, and must not deal real boss damage.**

Bump `APP_VERSION` to `6v`. Tell me which files changed and what folder each goes in, and remind
me to clear old downloads before I upload.
