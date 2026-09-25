# Ascend — rules for coding agents

Ascend is a leveling-style gym tracker: React 18 + Vite + Tailwind, Supabase, Vercel. Every push to
`main` deploys live. Windows machine: use `npm.cmd`. The owner, Brodan, makes all decisions.
`docs/DECISIONS.md` is authoritative; if anything here conflicts with it, DECISIONS.md wins.

## Working agreement

- Work comes from a phase doc in `docs/`. Do only the part you were asked for, then **stop and
  report**. Never start the next part on your own.
- **Never `git push`, never tag.** Commit only. Use one commit per part or batch unless told otherwise.
- If a message asks for several things, **report on every one of them**. If you skipped or deferred
  something, say so explicitly.
- If the brief doesn't say something, **ask. Do not guess.** Never change an aura's id, name,
  rarity, drop rate, unlock method, `group` or `ach` unless the brief says so.
- Diagnose before fixing. Propose before building anything non-trivial or touching shared renderer
  code. Shared renderer changes must be opt-in, so non-opted auras stay byte-identical.

## Dev server and baseline

- The owner's dev server is `npm.cmd run dev`, at http://localhost:5174. Leave it running.
  `?auras=1` is the dev gallery (exports `makeAura`, `AuraLoop`, `AURA_FX` via
  `/src/auras/AuraCanvas.jsx`).
- `C:\Users\rms76\ascend-7k-base` is a git worktree pinned at `da967d0` (pre-revamp). It is the
  zero-diff baseline for every 7k batch. Start a server on it only while running a diff
  (`npm.cmd run dev -- --port 5175`, using the worktree's own node_modules), then kill it.
- Kill any other server or browser you start before you stop.

## Scripts

- `scripts/aura-7j-full-diff.mjs`: multi-size pixel diff. Use `--fresh` (a new page per aura) for
  all pass/fail evidence. Other flags: `--spec <file>` injects alternate specs; `--auras` filters.
- `scripts/aura-7k-revamp-shots.mjs`: the evidence grid (ring dark/light, board-32, figure, 2
  frames, reduced motion, edge scan, `--perf`).
- `scripts/aura-7k-ladder-current.mjs`: the per-aura ladder/spec table.
- All evidence output goes under `evidence/`, which is gitignored. Never commit it.

## Reports

Put evidence in the same report as the work:
- exact numbers, with what each number measures;
- test names, with what each asserts;
- commit hashes;
- screenshot paths.

In addition:
- Tests must prove the **visible result** changed, not just that a value was set.
- Say clearly whether a speed change is a real speed-up or a measurement/harness fix.
- Report honestly: known gaps, reverted attempts, anything you did not check.

## Checks (exact commands; use them verbatim)

- `npm test`: all pass.
- `npx eslint src`: 0 errors, no new warnings (baseline 5). Never run `eslint .`.
- `npx madge --circular --extensions js,jsx,mjs src`: 0 cycles (currently 188 files). Dropping
  `mjs` gives a wrong count.
- Aura changes: `scripts/aura-7j-full-diff.mjs --fresh` against the baseline worktree. Every aura
  you didn't intend to change must show 0 differing bytes.

## Hard rules (never undo)

- **Flash rule (seizure safety):** every flash, flare or lightning wash goes through
  `noteStrikeFlash`, with a page-wide maximum of 3 per second and none under reduced motion. No
  whole-aura brightness swing faster than 3 per second. Staggered per-particle twinkles are fine.
- **Edges:** nothing is cut off by the canvas edge at any size (border alpha scan = 0). This
  includes bolt strikes: use `bolts.fit` / `rays.fit` / `inward.fit`. Only transient burst debris
  may leave the frame.
- **Per-aura budget:** 0.8 ms p95 loop time or less at board-32 / 4x CPU for any new or reworked
  aura.
- **Leaderboard stress:** the set is `atlas forge fallenlight ossuary ironbound standardbearer
  ascended bonewright nullpoint inferno`, run at board-32, circle mode, 4x CPU, with moments
  forced. p95 must stay under 16 ms. Rerun it whenever any of these auras, or shared renderer code,
  changes.
- **Bonewright** stays pixel-identical, with identical `flashTimes`, through any renderer change.
- **View overrides:** `body:` and `circle:` merge one level deep (objects key-by-key; scalars and
  arrays replace).
- **Never rename a saved id without a migration** and an alias.
- **Reduced motion:** every aura has a calm version.
- **IP:** original designs only. No character names, series names or copied art.
- **`APP_VERSION`:** bump it in the final part of every phase.
- **Aura look and quality:** follow `docs/aura-style-guide.md`. Every aura needs its own colour
  theme and signature, instantly tellable apart at ring size.
