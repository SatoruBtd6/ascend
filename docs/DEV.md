# Dev tools

Windows, PowerShell. Use `npm.cmd` and `npx.cmd` (`npm` / `npx` are blocked). The dev server is `npm.cmd run dev -- --host 127.0.0.1 --port 5173`. If 5173 is taken, Vite prints the port it actually bound (often 5174). Point the tools at that URL.

## Tap and input harness

Signs in with `TEST_EMAIL` / `TEST_PASSWORD` from `.env.local`. Writes `tmp-diag/harness-summary.json`. Default base is `http://127.0.0.1:5173`.

```
$env:ASCEND_BASE = "http://127.0.0.1:5173"
node scripts/diag-harness.mjs --chud-only
```

Each run throttles CPU at 6×, then 4× (`Emulation.setCPUThrottlingRate`). `--chud-only` is the pass to run before a handover: chud only, 100 taps per rate. Without that flag the same script also drives `/?fixture=big` (900s budget). That fixture is too slow to boot at 6×, so it is not part of the pass.

`fallbackCount` is how many of those measured taps failed `locator.tap()` and fell back to `locator.click()`. A pass is 100/100 with `fallbackCount` 0. The tap must be a real pointer/touch (`locator.tap()`). `element.click()` and other DOM clicks skip the touch path, which is the path that froze on phones, so a green result from a DOM click does not count.

Other flags: `--taps-only`, `--no-diag`. Playwright is loaded from `node_modules/playwright`, then `%TEMP%\ascend-pw-shots\node_modules\playwright`. If Chromium is missing, install it from that temp project (`npx.cmd playwright install chromium`) and set `PLAYWRIGHT_BROWSERS_PATH` to the folder that holds `chromium-1148`.

## Move check

Proves the Foundations 2 split is still a cut-and-paste of `pre-foundations-2:src/App.jsx` (imports and re-exports stripped). Exit 0 prints `move-check OK`.

```
node scripts/move-check.mjs
```

`MOVE_CHECK_TAG` overrides the tag.

## Cycles

```
npx.cmd madge --circular --extensions js,jsx src
```

## What is in the bundle

Throwaway source maps only. Do not commit a source-map setting and do not deploy with maps on.

```
npx.cmd vite build --sourcemap
npx.cmd source-map-explorer dist/assets/index-*.js
```

## Production preview

Vite reads `.env.local` during the build. Preview serves `dist/` (service worker included).

```
npx.cmd vite build
npx.cmd vite preview --host 127.0.0.1 --port 4173
```

## Dev URL flags

- `?auras=1` — dev-only aura gallery. Replaces the app shell. Does not write the account.
- `?simrun=1` — dev-only GPS simulator on the run screen.
- `?fixture=big` — dev-only large synthetic account. Persistence of that state is off. Not for the pass harness.
- `?noprefetch=1` — skips idle screen prefetch, so a timing run is not racing chunk downloads.

## Ghost crate sandbox

On the chud test account (`test: true`), Profile → crate is the ghost sandbox. Opens are free and use the real roll. They do not write unlocks, points, or pity on the real account. **Force prize** picks one prize for the next open. **Reset sandbox** clears sandbox pity and the sandbox log.

## On-device diagnostics

Settings, bottom of the page: tap the `Ascend version …` line 5 times within 2.5 seconds. That toggles the diagnostic log. **Copy diagnostic log** copies event types and timings, not account content. Ask for that log when a phone bug is reported.

## chud

Localhost sign-in uses only `TEST_EMAIL` / `TEST_PASSWORD` from `.env.local`. Dev talks to the real database, so never sign in as the owner. chud stays `test: true`, `lb: false`, no crew, and does no real boss damage. The Ghost / test toggle in Settings is behind the tester password. Restoring a backup on chud resets its name and settings; that is expected.

## `.env.local`

Required names (values stay out of git):

| Name | Why |
|---|---|
| `VITE_SUPABASE_URL` | Inlined at build time. The app and the harness need it. |
| `VITE_SUPABASE_ANON_KEY` | Same. |
| `TEST_EMAIL` | Harness sign-in. chud only. |
| `TEST_PASSWORD` | Harness sign-in. |

`ANTHROPIC_API_KEY` is a Vercel env var for `/api`, not a Vite build var.

A production build that exits 0 with a main JS file around **148 KB** did not load the two `VITE_` variables. Empty env values tree-shake the Supabase client and the app that depends on it. A real build of the current app is the full bundle (the 7e.1 `index-*.js` is about 786 KB). Check `.env.local`, then build again.

## Release

The owner pushes. The agent does not.

1. Clean `git status`. Tag the start `pre-<phase>` (example `pre-7d`).
2. Commit at each part. Never commit `.env*`, `dist/`, or `node_modules/`.
3. Handover is the commit hashes, `git diff --stat pre-<phase>..HEAD`, and the verification results.
4. After the owner approves, tag `v<version>`. Every release bumps `APP_VERSION` and the service-worker cache (`ascend-v<version>`) together.
5. Owner: `git push origin main` and `git push origin v<version>`. Vercel builds from `main`.
6. A bad production deploy: Vercel → Deployments → the last good deployment → **Instant Rollback**.

## Aura gallery moments and perf

In `?auras=1`, any aura with a `moment` spec shows a **Play moment** button under the stage. It fires the moment on every live canvas of that aura at once — the figure stage and the profile preview — via `fireAuraMoment`, so what you preview is what production renders.

`node scripts/aura-p3b-perf.mjs --base http://localhost:5173` (dev server must be running) reports loop and moment frame cost per moment aura at 4x CPU, then a worst-case stress: 10 auras at board-32 with all moments forced simultaneously — p95 must stay under 16 ms. `node scripts/aura-p3b-shots.mjs <auras> <base>` renders loop/moment-phase screenshots at production z-order into `docs/baselines/ascended-7h/`.
