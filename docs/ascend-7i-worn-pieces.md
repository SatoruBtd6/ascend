# Ascend — 7i: Worn pieces (Redline, Nullpoint, Ledger)

Follows 7h. Target version **`7i`**, SW cache `ascend-v7i`.

Three auras get pieces **worn on the avatar** rather than particles around it. All three use the
`over` pass and the per-figure anchors from `anchors.js`, so they must land correctly on a photo and
on **each of the 14 physique figures**. Placement is the whole risk in this phase: a past attempt put
pauldrons on the knees.

## Environment and rules

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`.
- Baselines as of 7h (confirm before starting): eslint `src` **5** warnings (never `eslint .`),
  **161** unit tests, `madge` zero cycles, harness `fallbackCount` 0, leaderboard worst-case stress
  p95 **under 16 ms** at 4× CPU.
- Git: clean `git status`, tag `pre-7i` locally, commit per part, **never push**.
- chud only on localhost; `test: true`, `lb: false`, no crew.
- Read `docs/DECISIONS.md` and don't undo anything in it. In particular: every flash, flare or bolt
  goes through `noteStrikeFlash` (3 per second max, none under reduced motion); nothing may be
  chopped off by the canvas edge; Bonewright stays pixel-identical.
- **IP rule** (DECISIONS.md): original designs in an anime idiom. No character names, series names or
  copied art, anywhere: code, copy, flavor text, filenames or commit messages.
- Tools: the `?auras=1` gallery (production-accurate stages, Play moment button),
  `scripts/aura-pixel-compare.mjs`, `aura-p3b-perf.mjs`, `aura-p3b-shots.mjs`, the moment system,
  anchor-aware bursts (`head`, `ground`, `center`, `img:`), and the over-figure layer.

## Working agreement

- **Stop after each part** and report. Don't start the next part until the owner approves.
- **Propose before building** anything non-trivial (Ledger especially): describe the plan in plain
  words, then wait.
- Evidence goes **in the same message** as the work: exact numbers, test names with what each asserts,
  screenshots, commit hashes. No claims without evidence.
- Diagnose before fixing. If something in this doc conflicts with the repo, stop and ask.

---

# Part 0 — Assets and the loop measurement

**Assets.** These were already made, keyed to transparent WebP:

`hat-straw.webp` · `blindfold.webp` · `hair-white.webp` · `robe-ledger.webp` · `mask-ledger.webp`

Check whether each is in `public/aura/`. For every file report dimensions, byte size, that it's RGBA,
and that all four corners are fully transparent (phone downloads can flatten files to JPEG). If any
are missing or flattened, **stop and list them**; the owner will supply them.

**Loop measurement fix.** In 7h, "loop" frame times were measured from about 5 frames between forced
moments, so they were mostly noise. Add a steady-state loop measurement to `aura-p3b-perf.mjs`
(moments suppressed, 600 frames per size) and use it for every loop number from now on. Report the
7h loop numbers for all four moment auras under the new method as the baseline.

Stop and report.

---

# Part 1 — Redline: the straw hat

A wide straw hat worn **on** the head, in the same slot as Champion's crown.

- `hat-straw.webp` in the `over` pass, anchored to the head landmark per figure and to the face
  region on photos.
- It sits on the head, tilted slightly, with the brim overlapping the top of the face. It must not
  float above the head like the halo.
- Scale from the figure's head half-width, so it stays proportional on all 14 figures and on photos
  where head size varies.
- Slow idle motion: a small tilt and bob, as if the wearer is breathing. Nothing that makes it look
  detached.
- Keep Redline's existing effects. Say what, if anything, had to change to make room.

Stop and report (see "Every checkpoint" below).

---

# Part 2 — Nullpoint: blindfold and white hair

## Blindfold

- `blindfold.webp` in the `over` pass, across the eye line, using the **same face anchors
  Bonewright's eyes use**, scaled from the head half-width.
- A faint glow along its lower edge, pulsing slowly, so it reads as part of the aura rather than a
  sticker.

## White hair

Build the **procedural version first** and show it to the owner before using the art:

1. **Procedural:** pale strands drawn from the top of the head anchor, falling and drifting with the
   aura's slow motion. It adapts to any head size and can't sit wrong on an unusual photo.
2. **Asset fallback:** `hair-white.webp` in the `over` pass, anchored to the head, only if the owner
   prefers it.

Show both side by side at 160 and 76 if both are built. Stop and report.

---

# Part 3 — Ledger: redesign

Ledger is currently themed around a death-note idea. **Replace it entirely** with an original design
built on its own name: a sinister organisation that keeps a record of names. The look is
bureaucratic menace: something is being written down about you.

**Propose first, then wait for approval.**

- **Robe:** `robe-ledger.webp`, behind the avatar on the main canvas, anchored at the shoulder line,
  with a slow sway like Brandmark's cape.
- **Mask:** `mask-ledger.webp`, in the `over` pass, floating beside the head at a slight angle,
  bobbing and turning a few degrees as it drifts. Beside the head, never over the face.
- **Pages:** pale rectangles drifting and tumbling around the ring, with a slow red bleed running down
  a few of them. Add a `page` shape if needed and show it in the gallery shape sheet.
- **Ink:** a thin red trickle from the ring edge, reusing Brandmark's trail mechanism, with the
  robe's emblem brightening on the same beat.
- Keep Ledger's existing id so owners keep it. Update its name, flavor text and catalog entry to fit
  the new design, and show the owner the new flavor text before committing.

Stop and report.

---

## Every checkpoint (Parts 1–3)

1. **Placement on every figure.** Screenshot each changed aura on **all 14 physique figures** at 160,
   plus a photo at 76 and at board 32, dark theme; add light theme for any colour change. The hat on
   the head, the blindfold across the eyes, the hair from the head, the mask beside the head, the robe
   from the shoulders, on every figure, not just the E male one.
2. **Edges.** Nothing chopped off by the canvas edge at any size. Report the smallest margin in px.
3. **Untouched auras unchanged.** Pixel comparison against `pre-7i` for every aura not changed in
   this part: 0 differences. Bonewright's flashTimes identical.
4. **Performance.** Steady-state loop frame time (Part 0 method) for each changed aura at board 32,
   profile 76 and figure 160, plus the worst-case leaderboard stress test (p95 under 16 ms).
5. **Checks.** Exact counts for the unit tests, eslint `src` (baseline 5 warnings) and `madge`. New
   tests by name with what each asserts. At minimum: each changed aura renders without throwing in
   both modes; worn pieces anchor from the per-figure landmarks (test at least three different
   figures); reduced-motion behaviour for each new effect.
6. **Assets** are lazy-loaded and not in the first download; report each file's size.
7. **Commit** hash and `git diff --stat`, plus a "noticed" list of anything odd you saw along the way.
   **Don't push.**

## Final part only

- `APP_VERSION` `7i`, SW cache `ascend-v7i`, so the update banner shows for existing users.
- Update `docs/DECISIONS.md` with any new rules this phase creates (for example, how worn pieces
  anchor), and `docs/DEV.md` with any new tools.
- End with a short, accurate summary of everything in 7i for the release notes.
