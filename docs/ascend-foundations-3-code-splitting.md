# Ascend — Foundations 3: Code splitting (`7c.2`)

Requires 7c.1 (the module split) deployed. Two parts, **stop after each**. Target version **`7c.2`**
(SW cache `ascend-v7c.2`).

Goal: the first screen stops waiting for the whole ~1.1 MB app. Status, sign-in, boot and save/sync
load first; other screens load as separate files and are fetched in the background right after the
first screen appears, so tabs still open instantly and offline mode keeps working.

**Owner priority: active workouts must be crash-safe through everything in this phase — lazy
loading, a failed screen load, the update banner and its reload.** No logged set may ever be lost.

## Environment reminders

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`, real build needs the `VITE_`
  env keys, eslint baseline 5, 104 unit tests, harness with `fallbackCount` (must stay 0).
- Git rules from `SETUP.md`: clean `git status`, tag `pre-foundations-3`, commit at each part,
  **never push**.
- Localhost: sign in only with `TEST_EMAIL` / `TEST_PASSWORD` (chud). chud stays `test: true`,
  `lb: false`, no crew.
- Don't undo: save/sync (three-way merge, pending copies, verified copy, tripwire, read-only hydrate),
  7b crash-safe workouts, error boundaries, offline boot, 5 s boot watchdog, SW precache (a precache
  failure must never block install), the diagnostic log, Phase 4 segments.
- **`App()` body and the save/sync code are not modified**, except for adding the `Suspense`
  wrappers and the banner described below. Report every line changed inside `App()`.

---

# Part A — Measure and propose (no app changes)

1. **What's in the bundle.** Make a throwaway build with source maps and run
   `npx.cmd source-map-explorer` on it. Don't commit the source-map setting and never deploy with it.
   Report the largest contributors: React/ReactDOM, Supabase, lucide icons, Leaflet, each `tabs/`
   folder, `auras/`, `data/` tables (exercises, foods…), `lib/`.
2. **Baseline timings** on the production preview (`npm.cmd run build` + `preview`), Chrome device
   emulation, 4× CPU throttle, "Slow 4G" network:
   - **Cold** first launch (service worker and caches cleared): time until Status is visible and
     tappable.
   - **Warm** launch (SW installed): same measure.
   - Three runs each; report the median.
3. **Import-time side effects.** List every module that runs code when it is imported (top-level
   listeners, timers, `localStorage` reads, audio setup, `AuraLoop`, `XpSync` retries, live-run
   recovery, anything registering on `window`/`document`). For each: what it does, and whether
   startup depends on it. **Anything startup depends on must stay in the first download** — making it
   lazy would silently delay it (e.g. an unfinished run or pending XP not being picked up on launch).
4. **Proposal.** Which modules go in the first download and which become separate files, with the
   expected first-download size. Default plan:
   - **First download:** `main.jsx`, `Auth`, `Boot`, `App` + save/sync, `theme`, `lib/`, `ui/`, the
     `data/` tables the first screen needs, `tabs/status/`, `auras/` renderer (the avatar aura is on
     the home screen; aura images already load on demand), and every module from step 3 that startup
     depends on.
   - **Separate files:** `tabs/train/`, `tabs/run/` (Leaflet is already separate), `tabs/fuel/` with
     the food data, `tabs/board/`, `tabs/profile/` (Look Studio, crate vault, music), `tabs/settings/`
     (Assistant, XP ledger), and any other large screen or sheet.
   - Explain any deviation.

## A-checkpoint

Report the bundle breakdown, baseline timings, the side-effect list and the proposal. **Stop.**

---

# Part B — Split, prefetch, and safe updates

## B1. Lazy screens

- `React.lazy` + `Suspense` at screen boundaries from the approved proposal. Each `Suspense` sits
  **inside** the existing `TabErrorBoundary`.
- Fallback: an empty panel in the current theme's background, shown only if loading takes longer than
  ~200 ms. No white flash in dark theme, no layout jump.
- **No static import may pull a lazy module back into the first download.** The build must print
  zero "dynamic import will not move module into another chunk" warnings, and the chunk list must
  show each lazy folder as its own file.
- No other behaviour changes. Moved code keeps its names and logic.

## B2. Background prefetch

After the first screen is visible and the app is idle (`requestIdleCallback`, with a `setTimeout`
fallback for Safari), import every lazy screen one after another at low priority. On the first tap of
a tab that hasn't finished prefetching, load it immediately.

## B3. Keep the previous version's files

On Vercel only the current deployment's files exist, so a phone still running the old version can't
fetch an old screen file once a new version ships. In `public/sw.js` (and the precache plugin if
needed):

- On activate, keep the current cache **and the one immediately previous `ascend-v*` cache**; delete
  anything older. Never more than two app caches.
- Serving hashed assets must find them in either cache.
- Keep `skipWaiting` / `clients.claim` behaviour and the rule that a precache failure never blocks
  install.

## B4. Failed screen load → retry → banner

- Wrap every lazy import: on failure, retry once after ~1 s (network blip). If it fails again, show
  the banner and render the screen's area as a calm placeholder ("This screen needs the latest
  version.") — **not** the error boundary's crash screen.
- Also listen for Vite's `vite:preloadError` event (call `preventDefault()`) and route it to the same
  banner.
- **Banner:** "Ascend updated — tap to reload." Non-blocking, dismissible, in all four themes.
  **It never reloads by itself.**
- Log chunk failures, retries, banner shown and banner tapped in the diagnostic log (event types and
  timings only, no content).

## B5. Crash safety on reload (owner priority)

When the banner is tapped, before reloading:

1. Write `ascend-pending:{userId}` **synchronously** with the current state (the same write used on
   page hide), then start the normal persist without waiting for it.
2. If a live run is active, call the live-run save (`saveLive`) first so the run resumes after reload.
3. Then reload.

If the pending write throws, show a short "Couldn't save — try again" note and **don't reload**.

Also confirm the following, and fix only if one isn't true: workout state lives in `App` state and the
save path, not inside the Train module, so a Train file that fails to load can't lose logged sets; the
rest timer's loss on reload is the only thing not restored (report if anything else is).

---

## B-checkpoint (stop for owner review)

1. eslint 5 (same five); 104+ unit tests pass; `madge` zero cycles; build with zero "will not move"
   warnings; harness chud + fixture at 4× and 6×, 100/100, **fallbackCount 0**.
2. **Sizes:** first-download JS before/after (index plus any chunks it preloads), and the full chunk
   list with sizes.
3. **Timings:** cold and warm launch, same setup as Part A, before/after medians.
4. **Offline:** after one online launch, go offline (DevTools Offline), relaunch, and open every tab,
   Settings, profile, Look Studio, crew/boss/raid, run detail. Everything loads.
5. **Update scenarios** on the production preview (build version 1, open it, then serve a version 2
   build with version 1's screen files removed from the server):
   - With prefetch finished: every tab still works (loaded already).
   - With prefetch **disabled** for the test: opening a tab loads version 1's file from the kept
     previous cache — no banner.
   - With the previous cache also deleted: retry, then banner and placeholder, no crash screen.
   - **Mid-workout:** log two sets (one typed but not ticked), trigger the failure, tap the banner:
     after reload the workout, both sets and the typed values are there. Repeat at 6× throttle.
   - **Mid-live-run** (`?simrun=1`): trigger the failure, tap the banner: after reload the run resumes
     with its segments and distance.
   - Pending write forced to throw: "Couldn't save" note, no reload.
6. SW: DevTools → Cache Storage shows at most two `ascend-v*` caches after an update.
7. Production-preview smoke on chud: every screen, four themes, start/discard a workout (with an
   exercise added), Force-prize crate. No console errors. Screenshots match 7c.1 except the banner.
8. Banner and placeholder copy screenshotted in dark, light, zesty and custom at ~380 px.
9. Diagnostic log shows the chunk-failure, retry and banner events from scenario 5.
10. `APP_VERSION` `7c.2`, SW cache `ascend-v7c.2`. Production build grep: no `simrun`.
11. Commit, report the hash, `git diff --stat`, every line changed inside `App()`, and a "noticed"
    list. **Don't push.**
