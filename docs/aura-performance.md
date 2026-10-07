# Board aura performance — findings

2026-10-06 · written from Devin's investigation and Brodan's on-device runs.

## Question and answer

Could the Board take a more ambitious monthly aura? **Yes, with a lot of room.**
On real iPhones the aura work costs about 1–2 ms of a 16 ms frame, even on a
32-player board full of flagship auras.

## Real-device results

Production build (`vite preview`), DPR 3, `?boardsim` fixture at real board
geometry, IntersectionObserver gating intact.

| Device / run | Mounted | Ticking | tick ms med / p95 / max | gap p95 | dropped |
|---|---|---|---|---|---|
| iPhone 15 Pro, iOS 26.6.1 — real Board | 4 | 3 | 1 / 1 / 3 | 17 ms | 12 / 1817 |
| iPhone 15 Pro — boardsim=16 | 20 | 10–11 | 1 / 1 / 3 | 25 | 5 / 2351; 20 / 2766 (two runs) |
| iPhone 15 Pro — boardsim=32 | 36 | 10–11 | 1 / 2 / 3 | 17–25 | 4 / 1993; 18 / 2421 |
| iPhone 14 (Aidan) — boardsim=32 | 36 | 10–11 | 1 / 2 / 5 | 34 | 34 / 1260 |

Aidan's run caveat: Low Power Mode was on (battery icon yellow), which caps
Safari at 30 fps — a 34 ms gap is expected — and he had ~55 Safari tabs open. A
re-run with Low Power Mode off is pending. Not yet measured: Android and
desktop browsers on real hardware.

## What the desktop harness said, and why it was too pessimistic

`aura:stress` (board-32, 59 px canvases, circle, 4x CPU, moments forced): fixed
set **p95 12.4 ms** against the 14.5 ms policy pause line and 16 ms frame-drop
line. But it times only the synchronous script cost, ticks every mounted aura
at once, and force-fires every special moment simultaneously. Real phones
measured about 6x cheaper.

## Key findings

- Only ~10–14 auras tick at once even on a 32-player board — off-screen auras
  are skipped by IntersectionObserver, so a real board is a ~14-aura problem,
  not a 32-aura one.
- The renderer is already well optimised: shared animation loop (`AuraLoop`),
  cached glow/image sprites, static Path2Ds, alpha early-outs.
- Cost is command-submission-bound, not pixel-bound: DPR 2 and DPR 3 cost the
  same.
- Biggest per-frame costs: `drawImage` (~44% of canvas op time), fills,
  save/restore; about a third is pure JS (particle kinematics, keyframes).

## Options evaluated and the decision

| Option | Expected saving | Verdict |
|---|---|---|
| Bitmap bake of static/pulsed layers | ~0.5 ms on the set | Keep as shelf option — pixel-identical, cheap |
| OffscreenCanvas in a worker | ~85–90% of script cost off main thread | Keep as shelf option — medium-large effort, iOS 16.4+ |
| One shared board canvas | ~0.1 ms script | Not worth the layering complexity |
| WebGL | most of the canvas path | Rejected — full rewrite, breaks pixel-diff tooling |
| Transparent video loops | near-total script saving | Rejected — loses moments/state reactivity, can't be flash-audited |
| Fidelity trades (DPR clamp, lower fps, fewer particles) | — | Never |

**Decision: none of these are needed now.** Bitmap baking and the worker stay
on the shelf if a slow device ever shows a problem.

## Budget guidance for future auras

A flagship costs roughly 0.2–2 ms of script per aura on the test setups; real
iPhones have large headroom. The policy lines (14.5 ms pause, 16 ms fail) still
apply to the harness. Before shipping a new flagship aura, run `aura:stress`
and check it on the fixture on a real phone.

## How to re-run the measurement

Tooling lives on the local branch `scratch/aura-perf` (commit `98dba56`):
`src/perfOverlay.js` (the `?perf=1` overlay — build type, auras
ticking/mounted, tick ms, frame gap, dropped frames) and `src/boardSim.jsx`
(the `?boardsim=16|32` synthetic board — no sign-in, shared writes stubbed),
plus `scripts/_probe-auraperf.mjs` and `scripts/_probe-boardsim.mjs`.

```powershell
git checkout scratch/aura-perf
npm.cmd run build
npm.cmd run preview -- --host --port 4173
```

Then open `http://<PC LAN IP>:4173/?boardsim=32&perf=1` on the phone (allow
Node on Private networks if Windows Firewall asks). The branch is local only
and unpushed; `git checkout main` returns to normal.

## Open items

- Aidan's re-run with Low Power Mode off.
- An Android or older-iPhone run.
- Whether a November (or later) flagship should be added to the harness's
  `fixed` set before authoring starts.

## What this does not prove

The fixture measures aura drawing cost only — same renderer, real sizes,
placeholder rows — so it does not cover whole-page cost. The real-Board run on
the 15 Pro (4 auras, 1 ms tick, 0.7% dropped frames) is the whole-page check.
