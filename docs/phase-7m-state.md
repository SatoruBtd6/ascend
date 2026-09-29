# Phase 7m — running state

Read this at the start of every part, alongside `docs/phase-7m-ladder.md`.
The ladder doc is the plan. **This doc is what has actually happened.**

Last updated: end of Part 6 (all seven pilot auras approved). Next: Part 7.

---

## Status

Parts 1–6 complete. All seven pilot auras approved by Brodan. Part 7 (settle,
document, ship) is next and is the last part of the phase.

`APP_VERSION` has **not** been bumped. No tag. Nothing re-pinned to v7m yet.

## Approval pins

An approved aura is diffed against **its own approval commit**, never against
v7k. "Expected to differ" is not a reason a pixel change goes unexamined —
that rule exists because eclipseheart went unguarded for several commits after
approval.

| Aura | Rung | Approval commit |
| --- | --- | --- |
| eclipseheart | R5 | `5ffd2f3` |
| blacksun | R5 | `7dbceec` (re-pinned after the crate160 fix; earlier pins `d195d96`, `58931bd`) |
| fallenlight | R4 | Part 5 build |
| huntersmoon | R4 | Part 5 build, moment rebuilt after rejection |
| forge | R3 | `51f866b` |
| standardbearer | R3 | `f1a2092` |
| ironbound | R2 | `dd8e87c` |

Baseline worktree pinned at `58931bd`. Re-pins to v7m after Brodan tags.

## Amendments made during the phase

All approved by Brodan, all recorded in `DECISIONS.md`. These change the ladder
doc's rung table and must survive into the rollout phases.

1. **Signature-sprite allowance.** Each aura may designate one sprite asset as
   its signature (all img layers sharing that src count as one). The signature
   may exceed the rung's img-hero cap. Its ceiling is the edge rule itself, at
   all six sizes. Resolve order when it bites: **pull the orbit inward, then
   reduce wobble, then shrink — shrinking is the last resort, not the first.**
   `small:` may set the signature's sz independently of blanket scale.
   Rationale: shrinking signature sprites to fit fixed caps is what made
   standardbearer and ironbound worse; the sprite is the identity, the glow
   disc is filler.
2. **`treat: "rimlight"`** — edge catch without shadowfade's darkening, for
   bright sprites. Opt-in; non-opted sprites byte-identical.
3. **`treatRim` added to `SMALL_ALLOWED_KEYS`**, rim appearance only (colour,
   offset, alpha). A dark silhouette needs more rim at 52 px than at 141 px to
   read at all. Does not open `small:` to palette or shape changes.
4. **`wave: {strips, amp, period}`** — segmented cloth draw, a travelling wave
   down a sprite. ~+0.03 ms on one layer. Opt-in.
5. **`rotTracksOrbit`** — lays a sprite's long axis along the orbit tangent, so
   img particles read as a connected chain rather than floating links. Free.
   Opt-in.
6. **`large:` view block** (w ≥ 150) — merges after the view block exactly like
   `small:`. Added so blacksun's crate160 breach could be fixed without
   disturbing its frozen profile76/figure160 pixels. Opt-in.
7. **Budget reference pinned.** `aura:perf --ab` takes its WARN denominator
   from the baseline-side stormstep median, not the live one, so a louder
   stormstep cannot silently loosen every budget.
8. **Edge rule, measurable** — `edgeSoft` (alpha 0–0.30, always legal),
   `edgeHard` (≥0.30, must be 0 steady; transient burst debris must clear
   within 0.5 s and is reported), `edgeRun` (≤3 px legal at any time).
9. **Edge window widened** — 5 seeds × every frame 30–240 plus a forced-moment
   pass, at all six sizes. Was 3 seeds × 7 sampled frames. **Every edge PASS
   before this change was weaker evidence than it looked**, because transients
   could hide between sampled frames. Recorded alongside the change.
10. **Six evidence sizes, always:** crew52, board59, studio88, ring141,
    crate160, figure128×163 — plus light-mode cells. Both R5 auras passed
    review and then failed on Brodan's phone at small sizes, twice. An aura is
    not ready until its small-size cells are in the grid.
11. **FAIL-rule exemption**, scoped to the seven pilot ids, during 7m only.
    Expires when v7m is tagged and the baseline re-pins.
12. **`spectacle` stress set** and a **ring-size measurement pass** (`--size
    ring`, gating on a 4-aura ring set; other sets at ring size print INFO as
    synthetic worst cases).

## Standing rules that must not be undone

- **Flash rule (seizure safety).** Every flash through `noteStrikeFlash`.
  Page-wide max 3/second, none under reduced motion, no whole-aura brightness
  swing faster than 3/second. One big strike is fine; staggered twinkles are
  fine. A louder ladder does not buy more flashes. Medical constraint, not a
  style limit. Heartbeat-style pulses are built as continuous brightness
  swells, never as repeated flashes, and never routed through
  `noteStrikeFlash`.
- **Never rename saved ids.**
- **Bonewright** stays pixel-identical with identical `flashTimes`.
- **IP rule.** Original designs only.
- **Ring view first**, but every size must read — "washes out on white" is a
  build failure, not an observation.
- **Devin never pushes.** Brodan pushes and tags.
- Diagnosis before fix. Proposal before anything non-trivial. Stop at the end
  of every part. Report every lettered item separately, including ones answered
  "no change" or "couldn't measure".

## Known exceptions (scoped, recorded, not general)

- **fallenlight, figure128×163 only** — moment edge breach 23 px hard, 0.67 s.
  The figure view is frozen byte-identical, so it cannot be fixed without
  breaking the freeze. Also a steady 4 px hard at that size, at the boundary.
  Disposition: rollout.
- **fallenlight, multi-source flashes** — 4 flashes/moment from three paths
  (`moment.flash`, `flare`, `bolts.flashEvery`). Each path is gated, capped and
  reduce-safe. Recorded with its measured rate; any future increase is a
  regression and must fail loudly. The audit reports per-source counts; the
  strict equality stays as the gate. **Do not relax the audit to make it pass.**
- **eclipseheart, crew52/board59** — steady 3 px (rise:smoke), exactly at the
  rule boundary. Disposition: never, unless the rule tightens.
- **huntersmoon** — 1 px transients at all six sizes. Within rule. Disposition:
  never.
- **blacksun, ring141** — 2 px steady contact, 3 px run. Frozen by the
  zero-diff requirement against its approval pin. Recorded, not silently
  passed.
- **carve** stays in `KNOWN_OVER`: over by ~0.04 ms, inside session noise, and
  the only route to the saving changes pixels.

## Renderer traps found this phase

- **Shockring bursts default to `n ?? 8`** — eight identical additive ellipses
  stacked. Crimson at 8× clamps to pure magenta on a dark canvas. Only
  invisible on gold/white auras. Workaround is per-spec `n: 1`; the default was
  **not** changed, because that would move pixels on auras nobody has reviewed.
  **Every dark aura in the rollout will hit this.**
- **The crate mount was over-filled** — `CrateVault` mounted at 0.65 fill vs
  the tuned 0.579, so anything past ~1.5·rx clipped. Fixed (ringR 52→46, Studio
  28→25). The dev gallery's "160 crate" and "88 studio" cells were mislabelled
  and never reproduced the real mounts — also fixed.
- **`rnd()` call-order desync** — a centred-ring change that skipped an `rnd()`
  call silently altered ascended and wheel. Caught by the full diff. Any change
  touching draw order must keep `rnd()` consumption identical.
- **studio88 "empty hole"** is correct — that cell is the aura *picker* tile,
  which has no avatar by design.
- **Diff harness state accumulation** — ninetail showed a 7,219 px board32 diff
  once, then four consecutive clean runs. Never reproduced in isolation, only
  inside full-grid runs. Likeliest cause is module-level state accumulating
  across cells in one browser session. **Unresolved. The diff gate can produce
  false results in full-grid runs; treat a lone unexplained diff as worth a
  re-run and an investigation, not a shrug.**

## Open items for Part 7

1. **The stress number is the phase's real open question.** Fixed-set p95 has
   read 11.2, 13.1, 15.1, 13.5, 14.0, 12.5 ms across this batch — against a
   14.5 ms rollout-pause line and a 16 ms hard gate (the frame-drop threshold).
   Seven auras are done; **44 remain, 19 of them in R3, which lands in every
   stress set.** Part 7 must settle this with a proper multi-run measurement,
   not a single reading, and say plainly whether the remaining rollout fits
   inside the budget or whether the rungs need cheaper recipes.
2. **eclipseheart ring-size cost** +51% and **huntersmoon** +65.5% — both
   exempt this phase, both baked in as ceilings at the re-pin. Per-rung ratio
   budgets were proposed and not yet written; a single 1.3× line that every R5
   aura permanently violates is a dead signal.
3. **Session-validity check** (agreed for Part 7): when the pinned reference
   aura's self-delta exceeds the FAIL threshold, that session's verdicts are
   INVALID and a re-run is required. Currently the reference is exempted from
   FAIL, which means a genuine stormstep regression would print WARN and could
   not gate — that caveat is exactly why the session check is worth having.
4. **`drawCarveSigil` `save()`/`restore()` imbalance** — a real state leak, to
   be fixed as its own item with its own zero-pixel diff.
5. **`chain-heavy.webp`** is unreferenced in `public/aura/` after the ironbound
   revert. Decide whether it stays.
6. **Per-rung ratio budgets**, the `spectacle` set freeze, the ring-set re-rank
   by ring-size medians, and the baseline re-pin to v7m — all Part 7 items.

## Rollout, after v7m

44 auras remain. Rough shape: R1 has 5 (ember already anchors it), R2 has 5,
**R3 has 19 and is the perf risk**, R4 has 4, R5 has 5.

The **rollout stop rule**: after each batch, stress runs, and if fixed-set p95
exceeds 14.5 ms the rollout pauses and the remaining rungs get cheaper recipes.

Worth considering rather than going rung by rung: the 13 auras untouched in 7k
(inferno, halo, godray, champion, huntersmoon, redline, bonewright,
eclipseheart, blacksun, soon_throne, soon_seraphim, plus standardbearer and
ironbound — the last four now done) are where the visible payoff is.

## Working notes

- Dev aura gallery: `?auras=1` on the dev-server URL (e.g.
  `http://localhost:5173/?auras=1`). The check is in `src/Auth.jsx`. **Not**
  `?gallery=1`.
- Fresh Devin chat per part. A new chat cannot see previous chats — restate
  anything carried forward in full rather than referring to "my previous
  message".
- Design direction must be specific enough that the agent doesn't invent the
  look. Composition, motion, palette, feel — beat by beat for moments.
- Close the gallery tab while Devin measures. Ctrl+Shift+R if it looks stale.
- Brodan's app auto-deploys from `main` on push. Pushing ships to his cousins.
