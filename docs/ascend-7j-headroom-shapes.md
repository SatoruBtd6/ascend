# Ascend — 7j: Render headroom + new particle shapes

Follows 7i. Target version **`7j`**, SW cache `ascend-v7j`.

Two goals: first get the leaderboard back to a comfortable performance margin, then design a set of
new, more detailed particle shapes for the owner to choose from. The order matters: new shapes cost
frame time, so headroom comes first.

## Environment and rules

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`.
- Baselines as of 7i (confirm before starting): eslint `src` **5** warnings (never `eslint .`),
  **215** unit tests, `npx madge --circular --extensions js,jsx,mjs src` → 188 files, 0 cycles,
  harness `fallbackCount` 0.
- Git: clean `git status`, tag `pre-7j` locally, commit per part, **never push**.
- chud only on localhost; `test: true`, `lb: false`, no crew.
- Read `docs/DECISIONS.md` and don't undo anything in it. In particular:
  - Every flash goes through `noteStrikeFlash`, with a page-wide budget of 3 per second at most and none under reduced motion.
  - Nothing may be chopped off by the canvas edge.
  - Bonewright stays pixel-identical with identical `flashTimes`.
  - `body:` and `circle:` overrides merge one level deep.
  - Saved ids are never renamed without a migration.
- **IP rule:** original designs only. No character names, series names or copied art.
- Tools:
  - The `?auras=1` gallery: three previews, Play moment, scoped editing, and the effect test.
  - The pixel compare against a baseline worktree.
  - `aura-p3b-perf.mjs` and the stress breakdown script.
  - The lazy-load and screenshot harnesses.

## Working agreement

- **Stop after each part** and report. Don't start the next part until the owner approves.
- **Propose before building** anything non-trivial.
- Evidence goes **in the same message** as the work: exact numbers, test names with what each
  asserts, screenshots, commit hashes.
- **Separate real speed-ups from measurement fixes.** If a harness change moves a number, report it
  as a measurement correction, not as an optimisation.
- Diagnose before fixing. If something in this doc conflicts with the repo, stop and ask.

---

# Part 1 — Render headroom

The fixed stress set measured p95 **13.6–15.5 ms** across runs at the end of 7i. That's under the
16 ms bar, but too close, and the run-to-run spread is large.

**Fixed stress set:** `atlas forge fallenlight ossuary ironbound standardbearer ascended bonewright
nullpoint inferno`, board-32, circle mode, 4× CPU, all moments forced. Keep this set unchanged so
numbers stay comparable across phases.

1. **Make the measurement stable first.**
   - Run the stress test **5 times** and report every run, the median and the max.
   - Confirm every aura's lazy assets are loaded before measuring starts. 7i found the blindfold missing from captures.
   - If the spread is still above about 1.5 ms, find out why (warm-up, garbage collection, background work) and fix the harness before optimising.
2. **Profile.** For each aura in the set, report:
   - its share of the frame
   - its draw-call count
   - where its time goes: gradients, image draws, shadows, path building, or per-particle overhead
3. **Optimise the top offenders without changing how they look.**
   - The target is a stress **median p95 of 12 ms or lower, and max p95 of 13 ms or lower**, on both the fixed set and the fixed set with Ledger swapped in for Inferno.
   - Every optimisation must be **pixel-identical** (0 differing bytes on main and over canvases, seeded) unless you stop and ask first.
   - If an attempt doesn't help, revert it fully and say so.
4. **Budget for new work.** Measure what one extra aura of average cost adds to the stress p95, and state the per-aura loop budget (board-32, 4× CPU) that new shapes and auras should stay under.

Stop and report.

---

# Part 2 — New particle shapes (design first)

The owner finds the current particle shapes plain. His favourites are `crescent` and `pulse`,
because they have more character. He wants **more detailed** shapes that make auras feel richer.

**Propose first, build a sample sheet, then stop.** Don't assign any new shape to an aura in this part.

1. Propose **8–10 new shapes**. For each one, give:
   - a name
   - what it looks like, in plain words
   - how it's drawn: procedural path, cached sprite, or a small built-in image
   - how it animates, if at all (rotation, flicker, trail, internal shimmer)
   - its estimated cost against the Part 1 budget

   Detailed means things like layered gradients, highlights, inner detail, soft glows or short trails, not bigger blobs.

   Starting ideas, to use, change or replace:
   - **comet**: a bright head with a tapering tail that follows its motion
   - **sparkle**: a four-point star with a cross flare and a soft core
   - **orb**: a glowing sphere with a specular highlight
   - **crystal**: a faceted shard with a light edge and a dark edge
   - **wisp**: a small curling ribbon of light
   - **rune**: a tiny circular glyph that slowly rotates
   - **bolt**: a tiny jagged zigzag of light (no flash, so it doesn't touch the flash budget)
   - **moth**: small glowing wings that flutter
2. Build them in the renderer and add them to the gallery shape sheet and the Shape dropdown with plain-English labels.
3. Make a **sample sheet**: every new shape next to `crescent` and `pulse`, at the three sizes they'll be seen at, figure 160, photo 76 and board 32, on dark and light backgrounds.
4. Each shape must read clearly at board 32. If one turns into a blob when small, say so and give it a simpler small-size version.
5. Under reduced motion, animated shapes calm down (slower or static), the same way existing shapes do.

Stop and report. The owner picks which shapes to keep and which auras get them.

---

# Part 3 — Assign shapes (after the owner picks)

The owner will send a list of which auras get which new shapes, possibly as gallery "copy spec"
output. Apply exactly that list, changing only those fields.

---

## Every checkpoint

1. **Screenshots** for anything visible that changed: figure 160 on at least 3 figures (one low
   rank, one high rank, one female), photo 76 and board 32, dark theme; add light theme for any
   colour change.
2. **Edges:** nothing chopped off by the canvas edge; report the smallest margin in px.
3. **Untouched auras unchanged:** pixel compare against `pre-7j` for every aura not intentionally
   changed, with 0 differences. Bonewright's `flashTimes` are identical.
4. **Performance:** the stress test run 5 times (median and max p95), on the fixed set and the
   Ledger-swapped set, plus steady-state loop cost for anything changed.
5. **Checks:** exact counts for the unit tests, eslint `src` (baseline 5 warnings) and madge (the
   command above). New tests by name with what each asserts. At minimum:
   - each new shape draws without throwing in both modes
   - each new shape respects reduced motion
   - the gallery effect test shows 0 dead controls
6. **Commit** hash and `git diff --stat`, plus a "noticed" list. **Don't push.**

## Final part only

- `APP_VERSION` `7j`, SW cache `ascend-v7j`, so the update banner shows for existing users.
- Update `docs/DECISIONS.md` with the per-aura performance budget from Part 1 and any new rules.
  Update `docs/DEV.md` with any new tools or harness changes.
- End with a short, accurate summary of everything in 7j for the release notes.
