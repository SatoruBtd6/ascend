# Ascend — Foundations 2: Split `App.jsx` into modules (move-only)

Requires Foundations 1 (Git, deploy by push). Four passes, **stop after every pass**. Nothing is
deployed until all four are approved; then one release, **`7c.1`** (SW cache `ascend-v7c.1`).

## Environment reminders

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`, real build needs the `VITE_`
  env keys, eslint baseline 5, ~104 unit tests.
- Git rules from `SETUP.md`: clean `git status` before starting, tag `pre-foundations-2`, commit at
  every pass, **never push**, no `reset --hard` / `clean` / force anything without the owner's OK.
- Localhost: sign in only with `TEST_EMAIL` / `TEST_PASSWORD` (chud). chud stays `test: true`,
  `lb: false`, no crew.
- Only functions go in `api/`. The new check script goes in `scripts/`.

---

## The one rule: move-only

Code is **cut from `App.jsx` and pasted into new files unchanged**. Allowed edits:

- adding `import` / `export` lines and the `export` keyword in front of a moved declaration;
- updating imports in files that use moved code.

Not allowed: renaming anything, reformatting, reordering code inside a moved block, fixing bugs,
removing dead code, changing props, adding `React.lazy`, "small cleanups". If you notice something
worth fixing, **add it to a "noticed" list in the report** and leave the code alone.

**Do not touch at all in this phase:**

- **Everything inside `App()`**, including hydrate, `persistNow`, the tripwire, pending copies,
  the verified local copy, and any component defined inside `App()`. `App.jsx` keeps `App()` and
  whatever it alone uses.
- `math.js`, `shims.js`, `supabase.js`, `Auth.jsx`, `Boot.jsx`, `diag.js`, `main.jsx`, `sw.js`,
  `vite.config.js`, `api/`.

## Hazards to handle

- **`C` (the live theme object) is mutated in place when the theme changes.** It must live in
  exactly one module (`theme.js`) and every file must import that same object. Never copy it
  (`{ ...C }` at module level), never reassign it, never create a second `C`. Same for
  `THEMES`, `ZEST` and anything else that is mutated at runtime.
- **Module-level mutable state** (top-level `let`, caches such as `auraImage`'s, registries, timers):
  list every one before moving. Each moves to exactly **one** owner module together with the code
  that writes it; nothing is duplicated.
- **No circular imports.** Cycles cause "cannot access X before initialization" blank screens that
  may only appear in the production build. Check with `npx.cmd madge --circular --extensions js,jsx src`
  (run through `npx`; don't add it to `package.json`). Must report zero cycles at every stop.
- **eslint baseline must stay at 5.** If the React Refresh rule (`only-export-components`) starts
  warning because a file exports both components and constants, split so component files export
  only components and constants live in plain `.js` files. Don't disable the rule.
- **Tests and `main.jsx`**: anything they import must still resolve; `App` stays the default export of
  `src/App.jsx`.
- **DEV-only code** (`?simrun`, `?fixture=big`, dev tools) must stay behind `import.meta.env.DEV`
  and still be stripped from production.

## Target layout

Adjust names where the code suggests better seams, but keep this shape and report the final tree:

```
src/
  App.jsx            App() shell + save/sync (untouched) + anything only App() uses
  theme.js           THEMES, ZEST, C, RAINBOW and theme helpers
  data/              EXERCISES, RANKS, quest pools (WEEKLY_POOL, MONTHLY_POOL…), ACH,
                     crate data, other static tables
  lib/               pure non-React helpers (isWorkout, activeDays, rangeStats, lifetimeStats,
                     formatting, dates, stats…)
  ui/                small shared components used by several tabs
  auras/             makeAura, AURA_FX, AURA_ART, auraImage, AuraCanvas, bolts, over pass
  tabs/
    status/          Status, Dashboard, Quests, Ranks, …
    train/           Train, ExercisePicker, ExercisePage, MusclePage, RestDock, …
    run/             RunTracker, RunHub, StepsPanel, run detail sheet, sim (DEV)
    fuel/            Fuel, AddFood, MealBuilder, …
    board/           Board, BossFight, CrewPanel, RaidNight, Feed, …
    profile/         ProfilePage, LookStudio, MogSection, ProgressPhotos, CrateVault, …
    settings/        SettingsPage, DedupeSettings, Assistant, XpLedger, …
```

Grouping matters for the next phase (lazy loading): Fuel, Board, aura art and the run map should
each be reachable through their own folder so they can later be loaded on demand. Don't add any lazy
loading now.

## Proof that nothing changed: `scripts/move-check.mjs`

Build this **first**, before moving any code:

- Reads the original `src/App.jsx` from the `pre-foundations-2` tag (`git show`) and every current
  file under `src/` that holds moved code.
- Ignores `import` lines, `export` lines that only re-export, and a leading `export ` / `export default `
  on a declaration. Trims trailing whitespace only.
- Compares the two as **multisets of lines**: every original line must appear exactly as many times in
  the new tree, and the new tree must contain no other lines.
- Prints any line added or missing, with file and line number, and exits non-zero if there are any.
- Leave out `math.js` and the other untouched files, or include them on both sides — either way they
  must match.

Prove the checker works: make a one-character throwaway edit in a moved block, show the script
failing and pointing at it, then undo the edit.

## Baseline before pass 1

Record on chud at 380 px, dark theme: screenshots of every tab, Settings, the profile with an aura
equipped, the crate reveal (ghost sandbox) and a run detail sheet. Record the real build's total JS
size and the size of each output chunk. Every later stop is compared against this baseline.

---

## Pass 1 — foundations of the split

`scripts/move-check.mjs` (with the failing-edit proof), then `theme.js`, `data/`, `lib/`, `ui/`.

## Pass 2 — auras

Everything in `auras/`. Aura behaviour must be identical: one canvas pair, one rAF loop, `over` pass,
`auraImage` lazy cache (single instance). Extra checks at this stop: screenshots of the profile with
Black Sun, Ninetail, Nullpoint, Eclipseheart, The Deep and Champion equipped, and the crate reveal,
compared with the baseline.

## Pass 3 — Train, Run, Fuel

`tabs/train/`, `tabs/run/`, `tabs/fuel/`. These hold the tap- and input-sensitive code, so the harness
runs at **4× and 6×** at this stop, including every Fuel field type/delete, and a `?simrun=1`
walk → run → walk saved on chud.

## Pass 4 — everything else

`tabs/status/`, `tabs/board/`, `tabs/profile/`, `tabs/settings/` and anything left that isn't `App()`
or used only by it. Report `App.jsx`'s final line count and what remains in it outside `App()`.
Then bump `APP_VERSION` to `7c.1` and the SW cache to `ascend-v7c.1` (the only non-move edit in this
phase), and commit.

---

## Checkpoint (after every pass)

1. `move-check` passes (paste its summary line).
2. `madge --circular`: zero cycles.
3. eslint: 5 warnings, the same five as before.
4. Real production build succeeds; total JS size within ±1% of the baseline. Report chunk sizes.
5. All unit tests pass.
6. 7b tap/input harness passes (4×; plus 6× at pass 3 and pass 4).
7. Smoke test on chud: every tab opens without an error boundary, switch through dark, light, zesty
   and custom (proves the shared `C` still works everywhere), start and discard a workout, open a
   run detail sheet. Screenshots compared with the baseline — any visual difference is a failure.
8. Production build grep: no `simrun` / sim component names in `dist/assets`.
9. Commit with a message naming the pass. Report the commit hash, `git diff --stat` for the pass, the
   list of module-level mutable state and where it now lives (pass 1 onward), and the **noticed**
   list.

**Stop after every pass.** After pass 4, stop with the full report; the owner reviews, tests
localhost if he wants, then pushes and tags `v7c.1` himself.
