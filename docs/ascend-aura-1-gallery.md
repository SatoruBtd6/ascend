# Ascend — Aura overhaul 1: Dev tuning gallery (dev-only)

First of four in the aura overhaul (gallery → renderer additions → per-aura pass → crate experience).
Requires 7e deployed.

**This ships no production change.** Everything is gated on `import.meta.env.DEV` and dead-code
eliminated, exactly like `?simrun=1` and `?fixture=big`. If the production bundle comes out byte-
identical, no version bump and no deploy is needed; if it changes at all, `APP_VERSION` becomes
`7e.1` with SW cache `ascend-v7e.1` and the reason is reported.

## Environment

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`. Real build needs the `VITE_`
  env keys. eslint baseline 6 warnings, 116 unit tests.
- Git per `SETUP.md`: clean `git status`, tag `pre-gallery`, commit per part, **never push**.
- Localhost: sign in only with `TEST_EMAIL` / `TEST_PASSWORD` (chud). chud stays `test: true`,
  `lb: false`, no crew.
- Aura code: `src/auras/` (`catalog.js`, `AuraCanvas.jsx`, `anchors.js`). Don't undo save/sync,
  crash-safe workouts, offline boot, SW rules, lazy loading, workout credit, or anything in
  `docs/DECISIONS.md` if that file exists by now.
- IP rule: no real anime/manga names, series or art anywhere.

## Why

Tuning an aura currently means editing a spec, reloading, equipping it, and looking at one avatar.
The next two phases change nearly every aura and add twelve new image assets, so the bottleneck is
iteration speed. This builds the tool first.

---

## G1. The route

`?auras=1`, DEV only, unreachable in production. It replaces the normal app shell with the gallery
(no tab bar needed). It must never write to the account: no `setS`, no persist, no server calls.
All edits live in local component state. Equipping in the gallery is preview only.

## G2. Grid

Every aura from `AURAS`, rendered live through the existing `AuraCanvas` — **no second rendering
path, no static previews**. Each tile shows the aura's name, rarity and id.

Controls across the top:

- **Backdrop:** each of the 14 physique figures (by rank and body type), the letter avatar, and a
  local image the user picks with a file input (kept in memory, never uploaded, never saved).
- **Theme:** dark, light, zesty, custom.
- **Size:** the real sizes auras appear at — 32 (board row), 76 (profile avatar), 88 (studio tile),
  160 (crate reveal), and a large inspect size.
- **Reduced motion:** a toggle that simulates `prefers-reduced-motion` without changing OS settings.
- **Anchors overlay:** draws the landmarks from `anchors.js` on the avatar — head centre and
  half-width, shoulder line and half-width, torso centre — so placement can be checked against the
  figure that's actually showing.

Only animate tiles that are on screen (the existing `IntersectionObserver` pause), so a full grid
stays usable at 4× throttle.

## G3. Inspector

Click a tile to open it large with its spec beside it:

- Every numeric field in that aura's `AURA_FX` entry gets a slider with a sensible range, and every
  colour gets a colour input. Changes apply to the live canvas immediately.
- Image layers additionally expose x, y, scale, rotation and flip, so asset placement is tuned by
  dragging a slider rather than guessing numbers.
- **Copy spec** button: puts the edited entry on the clipboard as valid JS, formatted to paste
  straight back into `catalog.js` / `AURA_FX`.
- **Reset** returns the aura to its committed spec.

## G4. Round-trip guarantee

A spec copied out of the gallery and pasted into the source must render identically. Add a unit test
that takes a spec, runs it through the gallery's serializer, parses it back, and asserts deep
equality with the original — for every aura in the catalog, not just one.

## G5. Performance HUD

Small readout in a corner: current frame time (avg and p95 over the last ~5 s), number of live
canvases, and how many aura images are loaded. This is how the next phases get judged, so it should
be trustworthy enough to compare runs.

---

## Checkpoint

1. **Production is unchanged:** build and compare the output to 7e — report whether `index-*.js` is
   byte-identical. Grep `dist/assets` for `auras=1`, the gallery component names and any gallery-only
   strings: zero matches. If the bundle did change, say exactly why, bump `APP_VERSION` to `7e.1` and
   SW cache to `ascend-v7e.1`.
2. eslint 6 warnings (same six); 116+ unit tests pass including the round-trip test; `madge` zero
   cycles; harness chud 4× and 6×, 100/100, `fallbackCount` 0.
3. Gallery works at 4× and 6× CPU throttle: the full grid scrolls, offscreen tiles pause, and the HUD
   reports frame time. Report frame time for the full grid and for a single large aura.
4. Every aura in the catalog renders in the grid, on a physique figure and on a picked photo, in all
   four themes. Screenshot the grid in dark and light.
5. The anchors overlay lines up with the figure that's showing — screenshot it on an E figure and an
   SS female figure.
6. Reduced-motion toggle: Bonewright shows no flash; the flash rate cap is not bypassed anywhere in
   the gallery.
7. Confirm the gallery never mutates the account: with the gallery open, edit specs, then reload and
   show the account state is untouched (no equip change, no persist, no server write).
8. Commit; report the hash, `git diff --stat`, and a "noticed" list. **Don't push.**
