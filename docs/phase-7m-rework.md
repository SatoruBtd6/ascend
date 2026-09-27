# Phase 7m — aura ladder rework

**Supersedes `docs/phase-7m.md`.** That doc's Part 1 was completed and its report stands
as reference. **Parts 2, 3 and 4 of that doc are void** — the brightness-bump proposal is
withdrawn and the carve/wyrm trims are dropped from this phase (see "Dropped" below).

Owner: Brodan. Agent: Devin Local. `AGENTS.md` applies in full; this doc adds the task
specifics and restates the decisions that matter here.

---

## Why this phase changed shape

The Part 1 report established three things:

1. **No aura has ever been assigned a tier.** `docs/aura-style-guide.md` names ember and
   stormstep as anchors and describes a three-rung ladder, but assigns no members. The
   four dim auras were never slotted anywhere.
2. **The top rung was never built.** The guide's Tier 3 wants glow 1.3–1.55 and hero
   particles 4.5–6.5 px. The loudest aura in the codebase is void at glow 1.2; the
   showpieces eclipseheart and blacksun run 0.96. Tier 3 is a paper spec.
3. **Loudness does not track rarity.** Per-aura cost is flat through the middle of the
   library (boss median 0.478 ms sits under feat 0.542 ms; epic 0.470 under legendary
   0.561), and the two dimmest auras — standardbearer 0.148 ms and ironbound 0.217 ms —
   are the two cheapest in the whole set.

So this is not a brightness pass. It is: define a rarity-ordered ladder, prove it on a
pilot that spans the rungs, then roll it out in later phases.

## Brodan's direction (recorded)

- Commons should still look cool. Each rarity step up should look clearly crazier.
- Earned and pulled auras share one ladder; loudness tracks **how hard the aura is to
  get**.
- Rank-up auras scale across the whole ladder: ember at the bottom, godray at the top.
- No feat aura sits at the bottom rung — they are all decently hard to earn.
- Boss auras are mid-to-high.
- Special auras are top-of-the-line standouts, alongside gilded and secret.

---

## The rung map (assignment is decided; numbers are not)

| Rung | Feel | Members |
| --- | --- | --- |
| **R1** quiet but cool | clean particle ring, no signature | crate uncommon (sigil, steadybreath, iaidraw); rank 1–2 (ember, tide) |
| **R2** charged | one signature | crate epic (glassfire, stormstep, zeropoint, ninetail, ironbound); rank 3 (storm) |
| **R3** heavy | signature + accent | all feat (smolder, stormborn, dawn, wanderer, atlas, forge, standardbearer); all boss (wyrm, frost, abyss, chud, rust, thunder, hollow, deep, magma, plague, sand, void); crate legendary (ledger, ossuary, redline, bonewright); rank 4 (inferno) |
| **R4** showcase | multiple signatures + moment | crate mythic (nullpoint, carve, brandmark, fallenlight); rank 5 (halo) |
| **R5** spectacle | everything, unmistakable across the room | special (yogurt, vendetta, ascended, wheel, champion, huntersmoon); crate gilded (eclipseheart); crate secret (blacksun); rank 6 (godray) |

`ember` stays the R1 anchor and is not changed this phase. `soon_throne` and
`soon_seraphim` are placeholders — unassigned, untouched.

**Open with Brodan:** R5 currently holds nine auras. Some specials may drop to R4. Do not
act on R5 assignments beyond the two pilot members until that is settled.

## Rules that must not be undone

Restated because a silent brief invites guessing:

- **Flash rule (seizure safety).** Every flash, flare or lightning wash goes through
  `noteStrikeFlash`. Page-wide maximum 3 per second, none under reduced motion. No
  whole-aura brightness swing faster than 3 per second; staggered twinkles are fine; one
  massive strike is fine. A louder ladder does **not** buy more flashes. This is a
  medical constraint, not a style limit.
- **Edges.** Nothing is cut off by the canvas edge at any size. See the edge-rule item in
  Part 1 — bigger particles make this the main risk of the whole phase.
- **Ring view first.** Every aura is judged on the profile-photo (circle) view first.
  Anything a moment shows on the figure needs a ring equivalent.
- **Identity.** Every aura keeps its own palette and signature and stays instantly
  tellable apart at ring size, including from its rung-mates. Colours are not locked.
- **IP rule.** Original designs only. No character names, series names or copied art.
- **Bonewright** stays pixel-identical with identical `flashTimes`.
- **Never rename saved ids.**
- **`APP_VERSION`** bumps to `7m` in the final part only. SW cache is `ascend-v{APP_VERSION}`.
- **Measurement changes need a written proposal first** (`DECISIONS.md`).
- **You never push.** Brodan pushes and tags.

## Dropped from this phase

- Carve and wyrm trims. Carve is over by ~0.04 ms, which is inside session noise, and the
  only route to the saving changes pixels. Carve stays in `KNOWN_OVER`; record why.
- Hands off entirely: the `makeFlameTongues` clamp, carve's `rings` `#111111` entry,
  ironbound's under-photo chains.
- The `drawCarveSigil` `save()`/`restore()` imbalance is a real state leak and **is** in
  scope, but only as its own item in the final part, with its own diff result.

## Reporting rules

- Stop at the end of every part and report. Never roll into the next part.
- Every item is lettered. **Report on every item separately, by letter**, including items
  answered "no change" or "couldn't measure". Do not drop items.
- Evidence in the same message as the work: exact numbers with what each measures, test
  names with what they assert, the `HEAD` hash, screenshots, evidence paths.
- Diagnosis before fix. Proposal before anything non-trivial.
- Absolute ms swings 10–40% between sessions. Never argue a change from one absolute
  number; attribute with `--ab` in one session.
- Use glow-disabled lit% for brightness, and say which metric each number is.
- Ring evidence also needs the opaque-square-photo version.

---

## Part 1 — the numbers behind the ladder. No code changes.

**A. Rung values.** Propose the numeric definition of R1–R5: ambient glow, hero ring
particle size, total ring particle count, layer count, permitted signatures, permitted art
sprites. One table, one row per rung, monotonically increasing. Anchor R1 to ember's
measured values and R2 to stormstep's, so the two existing anchors stay valid. R3–R5 are
new territory: say what each number is extrapolated from.

**B. Edge math, per rung.** For each rung's hero particle size, compute the **drawn
footprint** (your Part 1 figure was roughly `sz × 1.15 × 5.2`) and the maximum orbit radius
that keeps the whole footprint inside the canvas at ring (141 px), board-32 and figure
sizes. If a rung's wanted hero size cannot fit at ring size, say so and propose how the
rung gets its loudness instead — inward orbit radii, opt-in fits, core-and-halo layering,
art sprites, or additive blending.

**C. Edge rule, made measurable.** The current rule says only sparks of 3 px or less may
touch the edge. Your forge finding — a 12 px soft sprite with a ~2.3 px bright core,
grazing at alpha ≤ 0.18 — shows "3 px" is undefined between core and drawn footprint.
Propose a definition the harness can check without judgement, covering both extent and
alpha, and write it as a `DECISIONS.md` proposal. Also propose how edge checking becomes
**worst-case rather than per-seed**: fallenlight measured 0 lit edge pixels at f90 but 245
under a different draw, so a single seed at a single frame proves nothing.

**D. Budget redefinition.** The per-aura warn line is currently 1.3× the **live**
same-session stormstep median. That breaks under this phase for two reasons: stormstep
itself gets louder as R2 rises, which silently loosens the budget for everything; and 19
of 51 auras already warn under it, so it is flagging a third of the library. Write a
`DECISIONS.md` proposal to measure the ratio against the **baseline-pinned** stormstep in
the `v7k` worktree, alternating in one session, instead of the live one. Session noise
still cancels; drift does not. State what the warn line would become and which auras would
warn under it today. Do not change any harness code yet.

**E. Stress headroom forecast.** The binding constraint on a louder ladder is the stress
ceiling: p95 under 16 ms, fixed-set median at or under 12 ms. Current fixed-set p95 is
about 11 ms. Four of the pilot six are in the fixed set. Using your per-technique cost
figures from item E of the addendum, estimate what the fixed, ledger and revamp sets cost
after the full rollout — not just the pilot — and say how much headroom the ceiling leaves.
If the forecast exceeds the ceiling, say which rungs have to be cheaper and why. An honest
range beats a confident single number.

**F. Cheap-loudness recipe per rung.** From your ranked technique list, say which
techniques each rung should spend its budget on. R5 should be the loudest thing in the app
and still cost less than it would naively: baked sprites over procedural paths, fewer and
bigger particles over many small, additive blending on dark, art sprites for signatures.
Name where each technique already works in the codebase.

**G. Pilot readiness.** For each of the six pilot auras — ironbound (R2), forge (R3),
standardbearer (R3), fallenlight (R4), eclipseheart (R5), blacksun (R5) — state its current
values against its target rung, what has to change, and the estimated cost delta. Flag any
aura whose current signature conflicts with its rung's permitted signatures. Note that
eclipseheart (1.383 ms) and blacksun (1.108 ms) are already the two most expensive auras
in the library before getting louder.

**Then stop.** Brodan approves the numbers before anything is built.

---

## Part 2 — build the ceiling: eclipseheart and blacksun (R5)

The top rung is built first, because every rung below is calibrated down from it.

**A.** Build both to the approved R5 values. List every file and field changed, with
before/after values.

**B.** `aura:shots` for both: ring dark/light, board, figure, f90/f120, reduced motion,
plus the opaque-square-photo ring shot. Look-alike strips against their nearest neighbours.

**C.** Glow-disabled lit% and band lit% for both, before and after, same method as the
Part 1 report, with the reference auras for scale.

**D.** Edge check under the new rule from Part 1C, worst-case across seeds and frames, at
every size. Report the largest object touching the edge with its size in px — the number,
not "no clipping".

**E.** Flash audit: every flash path in both auras, the page-wide rate under forced
moments, and confirmation that reduced motion suppresses all of them. If either aura
gained a flash, say so explicitly.

**F.** `aura:diff` across the full set. Everything except these two must be zero differing
pixels. `aura:flash` for bonewright.

**G.** `aura:perf -- --ab --only eclipseheart,blacksun,stormstep` and the fixed stress set,
since the ceiling is what the ceiling costs.

**H.** `npm.cmd run check`.

**Then stop and report.** Brodan gives visual notes. Expect iteration here — this rung
defines "insane", and it is worth getting wrong twice.

---

## Part 3 — fallenlight (R4)

Same structure as Part 2, items A–H, for fallenlight alone, built to R4 and judged against
the now-built R5 pair: it must read as clearly a step below them and clearly above
everything at R3. Include a strip against eclipseheart and blacksun as well as its
look-alikes.

**Then stop and report.**

---

## Part 4 — forge, standardbearer (R3) and ironbound (R2)

Same structure, items A–H, for all three. These three carry the "commons should still look
cool, and the steps should be obvious" test:

- forge must no longer read as the same picture as smolder;
- standardbearer and forge share a rung and must still be instantly tellable apart;
- ironbound sits one rung below them and must read as a clear step down from forge while
  still looking good on its own.

Include a five-way strip: ironbound, forge, standardbearer, fallenlight, eclipseheart —
the ladder in one image, which is the real test of the whole phase.

**Then stop and report.**

---

## Part 5 — settle, document, ship

**A.** Full `aura:diff`: only the six pilot auras differ from baseline.

**B.** Stress, all three sets: `fixed`, `ledger`, `revamp`. p95 under 16 ms; fixed-set
median at or under 12 ms. 7l references: fixed ≈ 11 ms, ledger ≈ 10.4 ms, revamp ≈ 10.1 ms.

**C.** Cross-day perf table: every session this phase, with date, baseline-pinned stormstep
median, and the six pilot auras' medians. This is the data that settles the budget.

**D.** Apply the approved budget redefinition from Part 1D to the harness, and report which
auras warn under the new line.

**E.** Write the ladder into `docs/aura-style-guide.md`: the five rungs with their numbers,
and the full member assignment. Record in `docs/DECISIONS.md`: the rung map, the edge-rule
definition, the budget change, and why carve stays in `KNOWN_OVER`.

**F.** Fix the `drawCarveSigil` `save()`/`restore()` imbalance. Its own item, its own
`aura:diff --only carve` result, which must be zero differing pixels.

**G.** Bump `APP_VERSION` to `7m`; confirm the SW cache reads `ascend-v7m`. Only bump here.

**H.** `npm.cmd run check`, then a final summary: every file changed, commit hashes,
anything left open, and the recommended rollout order for the remaining 45 auras.

**Then stop.** Brodan pushes and tags `v7m`.

---

## Checklist

- [ ] Part 1: rung numbers, edge math, edge rule, budget proposal, stress forecast — no code
- [ ] Brodan approves the numbers
- [ ] Part 2: eclipseheart + blacksun built, ceiling proven, notes taken
- [ ] Part 3: fallenlight one clear step below
- [ ] Part 4: forge, standardbearer, ironbound — the five-way ladder strip
- [ ] Part 5: stress passes, docs written, `APP_VERSION` → `7m`
- [ ] Brodan pushes and tags `v7m`

## Notes for Brodan

- Fresh Devin chat per part from here — these parts are long.
- Close the gallery tab while Devin measures.
- If the gallery looks wrong right after a change: **Ctrl + Shift + R**.
- Restart the PC if orphaned node/Chrome processes pile up.
- Still to decide: whether any special auras drop from R5 to R4.
