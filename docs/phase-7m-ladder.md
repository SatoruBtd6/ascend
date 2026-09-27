# Phase 7m — aura ladder rework (revised)

**Replaces `docs/phase-7m-rework.md`, which replaced `docs/phase-7m.md`.** Both earlier
docs are reference only; their Parts are void. The Part 1 reports and the round-2 addendum
stand as findings and are cited throughout.

Owner: Brodan. Agent: Devin Local. `AGENTS.md` applies in full.

---

## What this phase does

Define a rarity-ordered loudness ladder, assign every aura a rung, prove the ladder on a
six-aura pilot spanning R2 to R5, then roll it out in later phases.

Brodan's direction, recorded: commons should still look cool; each rarity step up should
look clearly crazier; earned and pulled auras share one ladder, ordered by how hard the
aura is to get.

## Findings that shape it (from Part 1 and the round-2 addendum)

- No aura had ever been assigned a tier. The guide's Tier 3 was a paper spec nothing
  reached.
- Loudness did not track rarity: boss median 0.478 ms sat under feat 0.542 ms; the two
  dimmest auras, standardbearer 0.148 ms and ironbound 0.217 ms, were the two cheapest in
  the library.
- Glow does **not** saturate at 1.3. Measured on ember at the 141 px ring, band luminance
  rises linearly from 17.5 at glow 0.78 to 33.2 at 1.7. The gradient's peak alpha clips at
  glow × breathe ≈ 1.82, so **1.8 is the real ceiling** and numbers above it are dead
  weight.
- Small canvases are real user views: crew rows 52 px, leaderboard rows 59 px, duel rows
  67 px, studio 88 px, profile 141 px, crate preview 160 px. The renderer's unit floor
  makes particles **35% larger relative to the tile** below 110 px, deliberately, for
  readability — which is exactly why big particles clip there.
- Consequence: under today's renderer a soft-sprite hero caps at about sz 4.0 on **every**
  rung. The particle axis is nearly flat across the ladder, and growth has to come from
  rx-scaled sprites, glyphrings, rings and hard-path shapes. **Part 2 tests whether that
  constraint is worth removing.**
- `blacksun` violates the no-clipping rule on main today: `AURA_ART.blacksun`'s orbiting
  eclipse disc reaches ≈1.97·rx against a frame half of ≈1.72·rx, exiting by up to ~12 px
  at ring, fully opaque, across multiple seconds of each 21 s orbit. Pre-existing, not
  caused by this phase.

---

## The ladder

Membership is decided. Numbers below are **under today's renderer** and are revised once
Part 2 settles small-canvas sizing.

| | R1 quiet | R2 charged | R3 heavy | R4 showcase | R5 spectacle |
| --- | --- | --- | --- | --- | --- |
| glow | 0.70–0.85 | 1.00–1.15 | 1.15–1.25 | 1.35–1.50 | 1.55–1.75 |
| soft hero sz (K≈5.2) | ≤3.5 | ≤4.0 | ≤4.0 | ≤4.0 | ≤4.0 |
| hard hero sz (K≤3.5) | ≤3.5 | ≤4.5 | ≤5.5 | ≤6.0 | ≤6.5 |
| img sprite hero (×rx) | none | ≤0.5, behind-photo only | ≤0.7 | ≤0.9 | ≤1.2 |
| glyphring radius (×rx) | none | none | ≤0.4 | ≤0.5 | ≤0.5 |
| ring particles N | 10–25 | 20–35 | 25–45 | 35–60 | 40–80 |
| spec layers | 3–4 | 4–5 | 5–6 | 5–7 | ≥6 |
| signatures | none | ONE | signature + accent; **no new moments, no sweeps** | ≥2 + moment + art | unrestricted; moment + art |

Glow hard ceiling 1.8 at every rung — above it the gradient clips and the number does
nothing.

**Ceilings vs minimums.** For existing auras these rows are permitted ceilings: an aura may
sit below its rung, never above it. For any aura built or reworked to a rung — the six
pilots, and everything in later rollout phases — the rows are minimums as well. Grandfathered
exceptions, by name: `iaidraw` (sweep at R1), `steadybreath` (rings at R1), `nullpoint`
(no moment at R4), `yogurt` (no signature at R5).

### Membership

| Rung | Members |
| --- | --- |
| **R1** | crate uncommon: sigil, steadybreath, iaidraw · rank 1–2: ember, tide |
| **R2** | crate epic: glassfire, stormstep, zeropoint, ninetail, ironbound · rank 3: storm |
| **R3** | feat: smolder, stormborn, dawn, wanderer, atlas, forge, standardbearer · boss: wyrm, frost, abyss, chud, rust, thunder, hollow, deep, magma, plague, sand, void · crate legendary: ledger, ossuary, redline, bonewright · rank 4: inferno |
| **R4** | crate mythic: nullpoint, carve, brandmark, fallenlight · rank 5: halo · special: huntersmoon |
| **R5** | special: yogurt, vendetta, ascended, wheel, champion · crate gilded: eclipseheart · crate secret: blacksun · rank 6: godray |

`ember` anchors R1 and is not changed this phase. `stormstep` anchors R2 and is not changed
this phase — it is the perf reference. `soon_throne` and `soon_seraphim` are placeholders,
unassigned, untouched.

## Pilot

Six auras spanning four rungs: **ironbound** (R2), **forge** and **standardbearer** (R3),
**fallenlight** (R4), **eclipseheart** and **blacksun** (R5).

---

## The two R5 moments (Brodan-approved concepts, spec'd here)

Both are new. Both must read on the **ring** — where the photo covers the centre and only
the halo band around its edge is visible — not just on the figure. Both reuse their own
aura's existing motifs; no generic white shockwave. Each gets **exactly one** flash, routed
through `noteStrikeFlash`, and under reduced motion that flash is replaced by a slow
brighten with no flash at all.

### eclipseheart — "Totality"

| Beat | Time | What happens |
| --- | --- | --- |
| 1 | 0–0.5 s | Gem ring tightens inward and dims; rays retract; darkness creeps in from the outer rim |
| 2 | 0.5–1.1 s | Full dark — disc near-black, only a thin bright rim line survives, gems gone. **Hold.** The stillness is what sells the flare |
| 3 | 1.1–1.2 s | **One** corona flare: white-gold, bursting outward along the rim. The single flash |
| 4 | 1.2–2.4 s | Light floods back; gems re-ignite one at a time, staggered; rays fan out; settles to steady state |

Reuses: the existing sweep (beat 1 tighten), the rays, both rings (beat 2 rim line), the
gem orbit (beat 4 re-ignite). Staggered gem re-ignition is twinkle, not flash — it does not
count against the rate. Ring read: the band going black then blowing out is legible at 141 px
with the photo covering the centre. Reduced motion: beat 3 becomes a 0.4 s brighten.

### blacksun — "Umbra"

| Beat | Time | What happens |
| --- | --- | --- |
| 1 | 0–0.6 s | Colour-cycle ring desaturates to grey; shadow wisps thicken and spiral inward; wings fold in |
| 2 | 0.6–1.0 s | The dark disc expands and swallows the ring — near-total black, a thin inverted-colour rim |
| 3 | 1.0–1.15 s | Wings snap wide open; the disc's edge blows out in inverted colour. The single flash |
| 4 | 1.15–2.6 s | Colour-cycle returns, running inverted for ~1.5 s before settling to normal |

Reuses: the wings, the colorCycle ring, the shadow wisps, the dark disc. Ring read: wings
occupy the halo band left and right of the photo; the swallow reads as the band going black.
Reduced motion: wings open slowly, no flash. **The wings must come inside the R5 sprite cap
(≤1.2 rx; they are 1.75 rx today) and inside the edge rule** — see the blacksun fix below.

---

## Rules that must not be undone

- **Flash rule (seizure safety).** Every flash goes through `noteStrikeFlash`. Page-wide
  maximum 3 per second, none under reduced motion. No whole-aura brightness swing faster
  than 3/second. One big strike is fine; staggered twinkles are fine. A louder ladder does
  not buy more flashes. This is a medical constraint, not a style limit.
- **Edges.** Per the new measurable rule below. Bigger elements make this the main risk of
  the phase.
- **Ring view first.** Anything a moment shows on the figure needs a ring equivalent.
- **Identity.** Every aura stays instantly tellable apart at ring size, including from its
  rung-mates. Palettes are not locked.
- **IP rule.** Original designs only.
- **Bonewright** stays pixel-identical with identical `flashTimes`.
- **Never rename saved ids.**
- **`APP_VERSION`** bumps to `7m` in the final part only.
- **Measurement changes need a written `DECISIONS.md` proposal first.**
- **You never push.** Brodan pushes and tags.

## Approved proposals to implement (from the Part 1 rounds)

These were proposed and are accepted; implement them where the parts below say so, not
before.

1. **Edge rule, measurable.** Border = outermost 1-px rows, all four edges, both canvases.
   Per frame report `edgeSoft` (alpha 0–0.30, always legal), `edgeHard` (alpha ≥ 0.30, must
   be 0 in steady state; transient burst debris must clear within 0.5 s and is reported),
   and `edgeRun` (widest connected run at alpha ≥ 0.50; ≤3 px legal at any time). Verdict is
   the **max over a worst-case grid**: ≥3 seeds × frames {60, 90, 120, 150, 180, 210, 240}
   plus a forced-moment pass, × sizes {crew 52, board 59, ring 141, figure 128×163}, fresh
   page per aura. Report names the largest object touching the edge with its size in px.
2. **Budget reference pinned.** `aura:perf --ab` takes its WARN denominator from
   `median(runsA["stormstep"])` — the baseline worktree — not the live tree. Non-`--ab` runs
   keep the live ref as a same-session approximation and say so.
3. **FAIL-rule exemption, scoped.** The `--ab` FAIL rule (>15% **and** >0.05 ms) does not
   apply to exactly these six ids — ironbound, forge, standardbearer, fallenlight,
   eclipseheart, blacksun — during 7m only. Every other aura still fails. Expires when v7m
   is tagged and the baseline re-pins.
4. **New `spectacle` stress set** in `scripts/aura-sets.mjs`: the R5 members — yogurt,
   vendetta, ascended, wheel, champion, eclipseheart, blacksun, godray. Same rules as the
   other sets, p95 < 16 ms. Rationale: the existing sets exclude the two loudest auras, so
   the gate would not cover the worst board after rollout. Freeze the id list at v7m.

## Dropped / out of scope

- Carve and wyrm trims. Carve is over by ~0.04 ms, inside session noise, and the only route
  to the saving changes pixels. Carve stays in `KNOWN_OVER`; record why.
- Hands off: the `makeFlameTongues` clamp, carve's `rings` `#111111` entry, ironbound's
  under-photo chains.
- The `drawCarveSigil` `save()`/`restore()` imbalance is in scope only as its own item in the
  final part, with its own zero-pixel diff.

## Reporting rules

Stop at the end of every part and report. Every item is lettered; **report on every item
separately, including any answered "no change" or "couldn't measure"**. Evidence in the same
message: exact numbers with what each measures, `HEAD` hash, screenshots, evidence paths.
Diagnosis before fix, proposal before anything non-trivial. Never argue a change from one
absolute ms number — attribute with `--ab` in one session. Use glow-disabled lit% for
brightness and say which metric each number is. Ring evidence needs the opaque-square-photo
version.

---

## Part 2 — small-canvas sizing. Decision before any build.

Today a soft-sprite hero caps around sz 4.0 on every rung because of the 52 px crew row, so
the ladder's particle axis is flat. This part decides whether that stays.

**A.** Cost the three options, each with what it changes, what it risks, and how many auras
would need edits:
   1. **Live with it** — growth comes only from rx-scaled sprites, glyphrings, rings and
      hard-path shapes.
   2. **Lower the small-canvas unit floor** so particles stop being enlarged on tiny tiles.
      Say exactly what the floor was protecting and what regresses.
   3. **Add a `small:` view block** to the spec format alongside `body:` and `circle:`,
      merging one level deep like they do. Say what it costs in renderer, spec-format and
      test changes.

**B.** Evidence for option 2: screenshots of three auras at 52 px and 59 px with the floor
at its current value and lowered, so the readability trade-off is visible rather than
argued. Ember, stormstep and eclipseheart.

**C.** If the floor changes or `small:` lands, give the revised R1–R5 hero rows — what the
ladder's particle axis could actually be.

**D.** Recommend one option and say why, including which one you would pick if the only goal
were the profile ring looking as good as possible.

**Then stop.** Brodan decides. No renderer or spec-format changes in this part.

---

## Part 3 — build the ceiling: eclipseheart and blacksun (R5)

The top rung is built first; every rung below is calibrated down from it.

**A.** Implement the edge rule (approved proposal 1) and the pinned budget reference
(proposal 2) in the harness, with the exemption (3) recorded. Report which auras warn under
the new line.

**B.** Fix the pre-existing `AURA_ART.blacksun` eclipse-disc clipping — clamp the orbit,
scale the disc to the canvas margin, or fade it inward before the border. Report it as a
**pre-existing bug fix**, with before/after worst-case edge numbers at all four sizes, not
folded into the rework narrative. Bring the wing sprite inside the R5 cap (≤1.2 rx) in the
same pass.

**C.** Build both auras to R5, including the two moments spec'd above. List every file and
field changed, before/after.

**D.** `aura:shots` for both: ring dark/light, board, figure, f90/f120, reduced motion, plus
the opaque-square-photo ring shot, plus a moment filmstrip — at least 6 frames spanning each
moment, at ring size, so the beats can be judged.

**E.** Glow-disabled lit% and band lit% for both, before and after, with reference auras for
scale.

**F.** Edge check under the new rule, worst-case grid, all four sizes. The largest object
touching the edge with its size in px — the number, not "no clipping".

**G.** Flash audit: every flash path in both auras, the page-wide rate under forced moments,
confirmation that each moment fires exactly one flash, and that reduced motion suppresses
both.

**H.** `aura:diff` full set — everything except these two is zero differing pixels.
`aura:flash` for bonewright.

**I.** `aura:perf -- --ab --only eclipseheart,blacksun,stormstep`, plus the fixed stress set
and the new `spectacle` set.

**J.** `npm.cmd run check`.

**Then stop and report.** Expect iteration here — this rung defines "insane", and it is
worth getting wrong twice.

---

## Part 4 — fallenlight (R4) and huntersmoon (R4)

Same structure as Part 3 items C–J, for both. They must read as clearly a step below the R5
pair and clearly above R3. Include a strip against eclipseheart and blacksun.

fallenlight carries the known edge instability — 0 lit border pixels at one seed, 245 at
another — so it is the aura that most needs the worst-case grid.

**Then stop and report.**

---

## Part 5 — forge, standardbearer (R3) and ironbound (R2)

Same structure, items C–J, for all three. These carry the "commons still look cool, and the
steps are obvious" test:

- forge must no longer read as the same picture as smolder;
- standardbearer and forge share a rung and must still be instantly tellable apart;
- ironbound sits a rung below them and must read as a clear step down from forge while
  still looking good on its own.

Include a **six-way ladder strip**: ironbound, forge, standardbearer, fallenlight,
eclipseheart, blacksun — the ladder in one image. That strip is the real test of the phase.

R3's average bump must stay at or under +0.15 ms per aura. If forge or standardbearer cannot
reach R3's feel within that, say so plainly rather than spending the rollout's headroom.

**Then stop and report.**

---

## Part 6 — settle, document, ship

**A.** Full `aura:diff`: only the seven reworked auras differ from baseline.

**B.** Stress: `fixed`, `ledger`, `revamp`, `spectacle`. p95 under 16 ms each. Note that the
≤12 ms fixed-set WARN target is forecast to be exceeded at full rollout (~13–14 ms); report
the number, do not relax the target here.

**C. Rollout stop rule.** Record in `DECISIONS.md`: after each later rollout batch, stress
runs, and **if fixed-set p95 exceeds 14.5 ms the rollout pauses** and the remaining rungs get
cheaper recipes. The 16 ms gate is the line where frames start dropping; 14.5 is the margin
that keeps session noise from eating it.

**D.** Cross-day perf table: every session this phase, with date, baseline-pinned stormstep
median, and the seven reworked auras' medians.

**E.** Write the ladder into `docs/aura-style-guide.md` — five rungs, numbers, full member
assignment, ceilings-vs-minimums rule, grandfathered exceptions. Record in `DECISIONS.md`:
the rung map, the edge rule, the budget reference change, the FAIL exemption and its expiry,
the `spectacle` set, the rollout stop rule, the blacksun pre-existing bug, and why carve
stays in `KNOWN_OVER`.

**F.** Fix the `drawCarveSigil` `save()`/`restore()` imbalance. Own item, own
`aura:diff --only carve`, zero differing pixels.

**G.** Bump `APP_VERSION` to `7m`; confirm the SW cache reads `ascend-v7m`.

**H.** `npm.cmd run check`, then a final summary: every file changed, commit hashes, anything
left open, and the recommended rollout order for the remaining auras.

**I.** After Brodan tags v7m: re-pin the baseline worktree to v7m, record the seven reworked
auras' new medians as their ceilings in `aura-sets.mjs`, and retire their `GRANDFATHERED`
entries — an edited aura is no longer untouched.

**Then stop.** Brodan pushes and tags `v7m`.

---

## Checklist

- [ ] Part 2: small-canvas options costed, Brodan decides
- [ ] Part 3: edge rule + budget ref implemented; blacksun bug fixed; both R5 auras built with moments
- [ ] Brodan's notes on the ceiling — iterate until it's right
- [ ] Part 4: fallenlight + huntersmoon, one clear step below
- [ ] Part 5: forge, standardbearer, ironbound — the six-way ladder strip
- [ ] Part 6: stress passes, docs written, `APP_VERSION` → `7m`
- [ ] Brodan pushes and tags `v7m`; baseline re-pins to v7m

## Notes for Brodan

- Fresh Devin chat per part — these are long.
- Close the gallery tab while Devin measures.
- Gallery looks wrong right after a change: **Ctrl + Shift + R**.
- Restart the PC if orphaned node/Chrome processes pile up.
