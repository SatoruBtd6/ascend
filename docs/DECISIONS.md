# Decisions

Rules a later session must not undo. Each one is the behavior the app ships.

## Workout credit and streaks

`WORKOUT_CREDIT` in `src/math.js` is the curve. A short walk and a long lift are not the same workout: strength is piecewise on effective minutes, runs and walks use their own minutes and a lower cap, mixed sessions add both and then cap, and quest or deck sessions stay at 0. Streaks count any session that earns credit, so a short walk still keeps the day.

## Claimed quests and earned achievements

A claimed quest stays claimed, and an earned achievement stays earned. `unionAchievements` only adds ids. A recount or a rule change must not take a reward back.

## Duel rule versioning

A workout duel stores `rule`. `rule >= WORKOUT_CREDIT.duelRule` sums workout credit. Older duels (no `rule`, or `0`) still count sessions. Editing the curve must not rescore a duel that already started.

## Bonewright flash rate

`noteStrikeFlash` allows at most one flash per burst and at most 3 per second (`FLASH_MIN_GAP` is 0.334s, so three gaps are longer than a second). Reduced motion never flashes. The gallery and any new renderer must go through this function.

## Bonewright flash paint

The strike flash uses `lighter` and a radial gradient that falls off to transparent. A `source-over` white fill paints a white box on the figure. That paint is not allowed.

## Physique anchors

`FIGURE_ANCHORS` is keyed by the figure's `physiqueSrc` path. Each rank and body has its own landmarks, so an unknown figure must not borrow another figure's entry. `src/auras/anchors.test.mjs` fails if any figure is missing an entry.

## Update reload

`reloadForUpdate` saves the live run (`saveLive`), writes `ascend-pending` synchronously, and only then reloads. If that write throws, it does not reload. The app never auto-reloads. The service-worker banner and the in-app **Update now** button both use this function.

## Service-worker caches

On activate, the worker keeps the current `VERSION` cache and the previous `ascend-v*` cache, and deletes every older cache. The previous cache is what a rollback still has on the phone. Keeping every historical cache fills storage.

## `api/`

Only Vercel functions live in `api/`. Every `.js` / `.mjs` file there becomes an endpoint. App source, tests, and scripts do not go in that folder.

## Prefetch waits for the service worker

In production, screen prefetch waits until `navigator.serviceWorker.controller` is set (or 20 seconds), and until Status is on screen. Prefetching before the worker controls the page races the precache and loads chunks twice. `?noprefetch=1` skips prefetch for timing runs.

## IP

No character names, series names, or copied art from real anime or manga anywhere in the product, the copy, or the asset files. Auras are original designs in an anime idiom.
