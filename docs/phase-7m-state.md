# Phase 7m — running state

Read this at the start of every part, alongside `docs/phase-7m-ladder.md`.
The ladder doc is the plan. **This doc is what has actually happened.**

Last updated: end of Part 7 — the phase is complete. Next: Brodan pushes
and tags v7m, then the baseline re-pins.

---

## Status

Parts 1–7 complete. All seven pilot auras approved by Brodan.

`APP_VERSION = "7m"`, SW cache `ascend-v7m`, committed but **not pushed or
tagged** — Brodan does both. After the tag: re-pin `ascend-baseline` to v7m,
record the seven pilots' new medians as their `GRANDFATHERED` ceilings,
retire `P7M_FAIL_EXEMPT`, and re-freeze the `ring` stress set by ring-size
medians.

## Part 7 results

- **Full diff** (`aura:diff --expect blacksun,fallenlight,huntersmoon,forge,
  standardbearer,ironbound`): **45 pass, 6 expected-diff, 0 fail**, zero
  harness flags. `eclipseheart` is byte-identical (its approval state was
  already in the baseline); `blacksun` differs at board32 only (the approved
  `small: { treatRim }` wing rim, `ac3b39f`); `fallenlight` figure160 stayed
  frozen-clean. Evidence: `evidence/aura-diff/2026-09-29-03-01-04`.
- **Stress, 7 runs each** (median/min/max/spread of per-run p95):
  fixed 13.5/12.5/14.7/2.2 ms (WARN >12; one run touched the 14.5 pause
  line), ledger 11.8/11.0/13.1/2.1, revamp 12.1/11.2/14.2/3.0, spectacle
  13.4/13.2/15.8/2.6, ring@141 11.7/10.2/13.5/3.3 — all under the 16 ms
  gate. Evidence: `evidence/aura-stress/2026-09-29-03-03-48`,
  `-03-05-21` (ring).
- **stress --ab**: fixed B−A +0.9 ms (the four reworked members' real added
  cost), ledger +0.0, revamp +0.2 — `evidence/aura-stress/2026-09-29-03-22-09`.
- **perf --ab carve** (the only renderer change this part): −0.033 ms
  (−4.7%), session valid — `evidence/aura-perf/2026-09-29-03-23-03`.
- **aura:flash**: bonewright pixel-identical, flashTimes identical —
  `evidence/aura-flash/2026-09-29-03-23-26`.
- **Per-rung budgets live** (see `RUNG_RATIO_BUDGET`). Warners under the new
  lines: `atlas` at board-32 (1.84x vs R3 1.7x — already costlier than the
  proven R3 recipe); `carve`/`wyrm` keep KNOWN_OVER. Ring series: zero
  warns. Full sweeps: `evidence/aura-perf/2026-09-29-03-15-15` (board),
  `-03-18-58` (ring).
- **Checks**: 228 tests, 0 lint errors (5 baseline warnings), 0 cycles,
  `npm.cmd run check` passed.
- **chain-heavy.webp kept** — see DECISIONS.md.

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

**Part 7 additions** (Brodan's Part 7 brief, recorded in `DECISIONS.md`):

13. **Per-rung ratio budgets** — `RUNG_RATIO_BUDGET` + `AURA_RUNG` in
    `aura-sets.mjs`; an aura warns only when it costs more than its rung's
    proven maximum. Board: 0.95/1.3/1.7/3.5/5.5x; ring: 1.3/1.3/2.7/3.6/4.5x.
    R1's line derives from the rung's existing max member (tide), since R1
    had no pilot.
14. **Session validity** — under `--ab`, if the pinned stormstep reference's
    own B−A delta crosses the FAIL threshold in either direction, every
    verdict prints INVALID and the run exits non-zero. Caveat: the reference
    is exempt from FAIL by position, so without this check a genuine
    stormstep regression could only print WARN and never gate.

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
- **Diff harness state accumulation** — the ninetail 7,219 px board32 blip
  (interior texels shifted in the tail region, silhouette identical, all four
  steady frames). Investigated in Part 7: in-cell renderer state was ruled
  out (seeded RNG, flash-clock reset, synchronous captures, fresh page per
  aura — 12/12 identical recaptures in fresh pages). The real vectors were
  in the harness: `newPage` leaked each aura's whole browser **context**
  (~50 live gallery canvases per leaked context, ~100 contexts per run), and
  moment-only `auraImage` calls (vendetta's skull) could register mid-cell,
  after the image wait. Harness hardened in Part 7: contexts now close per
  aura, the subject's moment is warmed once per page, and every cell records
  an image-state ledger — pending/late/mismatched image state marks the diff
  HARNESS-suspect instead of silently passing or failing. The exact
  mechanism was never caught live, so it is **narrowed, not proven** — a
  lone unexplained diff still warrants a rerun and investigation. The final
  full-grid run showed zero harness flags on all 51 auras.

## Open items — post-tag (Part 7 item I, Brodan's side)

1. Tag `v7m`, then `npm.cmd run aura:baseline -- v7m` to re-pin the worktree.
2. Record the seven pilots' v7m medians as their `GRANDFATHERED` ceilings and
   retire `P7M_FAIL_EXEMPT` — an edited aura is no longer untouched. Note the
   ring-size series separately: eclipseheart measured ~+51% and huntersmoon
   ~+65.5% over stormstep at ring size — both approved, both become ring
   ceilings at the re-pin.
3. Re-freeze the `ring` stress set by **ring-size medians**, not board — three
   of its four members were reworked this phase.
4. `spectacle` is already frozen: yogurt, vendetta, ascended, wheel, champion,
   eclipseheart, blacksun, godray.

## The stress answer (item J — read before planning rollout)

Measured 7 runs/set at board-32 (moments forced, 4x CPU) + the ring set at
141 px. All sets pass 16 ms today. But the rollout does **not** fit if every
remaining aura spends its rung ceiling:

- **fixed** (the binding set — 6 of its 10 members still pending, including
  ascended R5 and nullpoint R4) has ~1.0 ms of headroom to the 14.5 pause line
  and already crossed it once in 7 runs (max 14.7). Over 6 pending members
  that is roughly **+0.2 ms/aura net** — nothing like the R5 ceiling's
  ~2.7 ms. ascended alone, built anywhere near eclipseheart's recipe, puts
  fixed over the pause line by itself.
- **revamp** (all 10 members pending) has ~2.4 ms to 14.5 — about
  **+0.25 ms/aura** spread evenly.
- **ledger** ~2.7 ms headroom over 6 pending.
- **spectacle** and **ring** are final — their members are frozen at v7m and
  won't grow (13.4/11.7 medians).
- The Part 6 R3 rule (+0.15 ms/aura average) is compatible with this: 19 R3
  auras × +0.15 spread across sets lands under the pause line **if** the
  pending R4/R5 members (ascended, vendetta, nullpoint, carve, halo,
  brandmark) are built to near-zero net growth, not to their ceilings.

Bottom line: the gate fits, the ceilings don't. Plan batches around set
headroom, not rung budgets — and expect the pause rule to fire if the big
pending spectacles get their full recipes.

## Rollout, after v7m

44 auras remain. Rough shape: R1 has 5 (ember already anchors it), R2 has 5,
**R3 has 19 and is the perf risk**, R4 has 4, R5 has 5.

The **rollout stop rule**: after each batch, stress runs, and if fixed-set p95
exceeds 14.5 ms the rollout pauses and the remaining rungs get cheaper recipes.

Suggested order (cheapest gates first, so the pause rule fires late or never):
R1/R2 stragglers first (glassfire, zeropoint, ninetail, storm, tide, sigil,
steadybreath, iaidraw — most need little or nothing), then the 19 R3 members
at the +0.15 ms recipe, then R4, and the remaining R5s (ascended, vendetta)
**last and individually** — each one can eat an entire set's headroom.
`atlas` already warns over its R3 budget at board-32 and needs a trim, not a
raise. `carve`/`wyrm` stay in KNOWN_OVER — trimming them buys back real
headroom.

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
