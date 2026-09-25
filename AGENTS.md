# Ascend — agent notes

## Dev server

- `npm run dev` → http://localhost:5174 (vite).
- The `?auras=1` page is the dev gallery for aura harness scripts (exports `makeAura`, `AuraLoop`, `AURA_FX` via `/src/auras/AuraCanvas.jsx`).

## Zero-diff baseline worktree

- `C:\Users\rms76\ascend-7k-base` is a git worktree pinned at `da967d0` (pre-revamp code). It is the baseline for pixel-diff checks in every aura-revamp batch.
- Do NOT leave a dev server running on it. Start one only when running a diff (`npm run dev -- --port 5175` inside the worktree, using the worktree's own node_modules) and kill it afterwards.

## Diff / evidence conventions

- `scripts/aura-7j-full-diff.mjs` — multi-geometry pixel-diff harness. Use `--fresh` (new page per aura) for definitive comparisons; `--spec <file>` injects alternate specs; `--auras` filters.
- `scripts/aura-7k-revamp-shots.mjs` — evidence shots (ring dark/light, board-32, figure, 2 frames, reduced-motion, edge scan, `--perf` for p95 at 4× CPU).
- `scripts/aura-7k-ladder-current.mjs` — current per-aura ladder/spec table.
- Evidence output goes under `evidence/` — gitignored. Do not commit screenshots or harness output.
- lit%/lum metrics are measured aura-only (main canvas before avatar compositing).

## Per-aura budget

- p95 ≤ 0.8 ms at board-32 / 4× CPU for every revamped aura (see `docs/DECISIONS.md`).
- Transient bolt strikes touching the board edge are a documented edge-scan exception.

## Validation

- `npm test` — vitest. `npx eslint src` — lint (some pre-existing warnings are acceptable). `npx madge --circular --extensions js,jsx src` — dependency cycles.
