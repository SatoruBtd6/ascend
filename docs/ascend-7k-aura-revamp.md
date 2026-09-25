# Ascend 7k — Aura revamp

Save as `docs/ascend-7k-aura-revamp.md`. Do one part at a time, then stop and report.

## Goal

Rebuild the plain, unpolished auras so they look detailed, bright and exciting, in the spirit of
Sol's RNG on Roblox. The target is an addictive collecting feature: every aura should look good,
and each rarity tier up should look clearly more impressive than the one below.

Tools for this: the 10 shapes from 7j (comet, sparkle, orb, crystal, wisp, rune, zap, moth,
lantern, sparkburst), plus the older favourites crescent and pulse.

**The avatar ring (profile picture) is the most important view.** Judge every revamp there first,
using the real 76 px profile avatar, then check the board-32 and body figure views.

The 7j sample sheet showed the main problem: at ring and figure size, particles shrink to specks,
so their detail disappears. Revamped auras must size particles per view (via `circle:` / `body:`
overrides) so that the shape is recognisable on the ring.

## What you may change

For auras on the approved revamp list only, you may change:
- particle shapes, sizes, counts, colours and glow;
- blend modes, motion paths and speeds;
- layers (add or remove) and ambient gradients.

You may also PROPOSE (not build) signature moments for epic tier and above.

## What you must not change

- An aura's id, display name, rarity, drop rate, unlock method, `group`, or `ach`. Crate auras
  stay crate auras; earned auras stay earned. If something here seems wrong, ask.
- Any aura not on the approved list. All untouched auras must stay **0 differing bytes** vs the
  start of the phase (`aura-7j-full-diff.mjs`, all sizes, all frames).
- Auras reworked in 7h/7i, unless Brodan adds them to the list: Redline, Nullpoint, Ledger,
  Eclipseheart, Hunter's Moon, Black Sun, Godray, Halo, Inferno, Champion, Ironbound, Ossuary,
  Fallen Light, Atlas, Forge, Standard-Bearer.
- **Bonewright:** never. It must stay pixel-identical with identical `flashTimes`.
- No new art files. If an aura needs art, say so and Brodan will generate it.
- No renamed ids anywhere without a migration.
- Shared renderer code: avoid changing it. If a change is truly needed, propose it first; all
  untouched auras must still diff to 0.

## Rules that always apply (docs/DECISIONS.md)

- **Flash rule (seizure safety):** every flash, flare or bright wash goes through
  `noteStrikeFlash`, with a page-wide maximum of 3 per second and none under reduced motion.
  "Brighter" means more luminous colours and glow that stay on, not flashing. Any whole-aura
  brightness swing faster than 3 per second counts as a flash. Staggered twinkles on individual
  particles are fine.
- **Reduced motion:** every revamped aura must have a calm, still-looking version under reduced
  motion.
- **Edges:** nothing may be cut off by the canvas edge at any size (border alpha scan = 0).
  Transient burst debris is the only exception.
- **Per-aura budget:** at or under 0.8 ms p95 loop time at board-32 / 4x CPU. Prefer bigger,
  brighter particles over more particles.
- **Leaderboard stress:** if any aura in the fixed stress set is touched, rerun it. p95 must stay
  under 16 ms, and the fixed-set median should stay at or under 12 ms to keep the headroom won in 7j.
- **IP rule:** original designs only; no character names, series names or copied art.
- **Backgrounds:** check every revamp on both the dark and light app themes.

## Part 1 — Audit and plan (no aura changes)

1. **Contact sheet** of all 51 FX-bearing auras at a mid-animation frame:
   - real 76 px avatar, on dark and on light;
   - board-32;
   - body figure.

   Group them by rarity tier and label each with its display name.
2. **Table**, one row per aura, with these columns:
   - id and display name;
   - rarity;
   - how it's unlocked;
   - layers;
   - shapes used;
   - particle count;
   - art (yes/no);
   - moment (yes/no);
   - loop p95 at board-32 / 4x CPU;
   - the last phase that reworked it.
3. **Visibility numbers at ring size** (76 px avatar, dark background): the share of pixels that
   are visibly lit, and the mean brightness of the aura area. Say exactly what each number
   measures. Use these to flag auras that are barely visible.
4. **Proposals:**
   - a ranked revamp list, plainest first;
   - a **rarity ladder:** for each tier, target ranges for particle size on the ring, particle
     count, glow strength, number of layers, and whether a moment fits. Each tier must look
     clearly stronger than the one below;
   - for each aura on the list, one line on the plan: which shapes, which colours, and what motion,
     chosen to fit the aura's name and flavour.

Stop. Brodan picks the list and approves or edits the ladder.

## Part 2 — Pilot (2 auras)

Revamp two auras from the approved list: one low tier and one epic or higher.

Evidence:
- before/after screenshots at the 76 px avatar (dark and light), board-32 and figure;
- two frames each, so motion is visible;
- loop p95 for each aura;
- edge scan;
- a reduced-motion screenshot;
- all other auras at 0 differing bytes.

Brodan tunes the pilots in the gallery (`?auras=1`, "Both views" or per-view scope) and pastes
Copy spec output. Apply the pasted spec exactly. Then write `docs/aura-style-guide.md`, containing
the ladder with the values Brodan approved and the recipe that worked (ring particle sizes, glow,
colour approach). Every later batch follows it.

Stop.

## Part 3 onward — Batches of 5

Work through the approved list five auras per part, following `docs/aura-style-guide.md`. Each
report includes the same evidence as Part 2 for every aura in the batch, plus:
- a stress rerun if any stress-set aura was touched;
- npm test, `npx eslint src` (5 warnings), and
  `npx madge --circular --extensions js,jsx,mjs src` (188 files, 0 cycles).

Use one commit per batch. Stop after each batch; Brodan may tune and paste specs before the next.

## Final part

- Bump `APP_VERSION`.
- Full diff: every untouched aura at 0 bytes.
- Stress rerun (fixed set and Ledger set, 5 runs each).
- Full checks.
- Add one line to `docs/DECISIONS.md` pointing at `docs/aura-style-guide.md` as the standard for
  new and reworked auras.

## Checklist (every part)

- [ ] Only approved auras changed; all others at 0 differing bytes
- [ ] No id, name, rarity, drop rate, unlock method, group or ach changed
- [ ] Ring view checked first, on dark and light
- [ ] Each aura within 0.8 ms p95 at board-32 / 4x CPU
- [ ] No flash outside `noteStrikeFlash`; no fast whole-aura brightness swings
- [ ] Reduced-motion version checked
- [ ] Edge scan = 0
- [ ] Stress rerun if a stress-set aura was touched
- [ ] npm test, eslint src (5 warnings), madge (188 files, 0 cycles)
- [ ] Evidence in the same report; nothing pushed
