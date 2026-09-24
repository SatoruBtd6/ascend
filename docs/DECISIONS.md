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

## Aura moments: flashes, canvas edges, and frame budget

Every moment flash, recurring flare, and lightning strike goes through `noteStrikeFlash` — at most 3 flashes per second, none under reduced motion. `fx.moment.flash`, `fx.flare`, and `fx.bolts.flash` all gate; nothing draws an ungated bright flash. The same rule covers flares that spawn bolts (`fx.flare.bolt`): the strike only exists when the gate fires.

No part of a moment — bursts, beams, orbiting pieces, or placed images — may be cut off by the canvas edge in a way that looks chopped. Transient burst debris may exit while fading; image layers stay inside the canvas or dim out before the edge.

The leaderboard worst-case stress test must stay under 16 ms p95 at 4x CPU: all moment auras at board-32 with every moment forced simultaneously (`scripts/aura-p3b-perf.mjs`).

## Worn pieces must end inside the canvas

A worn piece anchored to the figure or photo (cloak, blindfold, hat) must never read as chopped by the canvas edge. Pieces that hang to the bottom edge — Ledger's cloak — fade out over their last stretch and report their smallest clearance in pixels, measured on a cloak-isolated render so full-canvas backdrops don't fake a 0 px margin (`scripts/aura-7i-p3-shots.mjs`). Sides and top get the same rule: the piece either stops short or fades.

## View-scoped spec overrides

`body:` and `circle:` blocks on an aura spec or a layer override only that render view (`src/auras/specFormat.js` `mergeViewSpec`/`mergeViewLayer`). The merge is one level deep: plain-object values merge key-by-key, scalars and arrays replace wholesale. An override must never be a full copy of the base — only the keys that differ. Gallery "Body figure" / "Avatar ring" edits write these blocks; "Both views" writes the shared value and drops the overrides. Structural layer keys (`VIEW_LOCKED_LAYER_KEYS`: kind, shape, src, frames, shadow, embers, placed, blend…) always stay shared.
