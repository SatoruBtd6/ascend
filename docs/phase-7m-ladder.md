# Phase 7m — aura ladder rework (revised, r2)

**Replaces `docs/phase-7m-ladder.md` r1, which replaced `docs/phase-7m-rework.md` and
`docs/phase-7m.md`.** Earlier docs are reference only; their Parts are void. The Part 1
reports and the Part 2 small-canvas report stand as findings and are cited throughout.

Owner: Brodan. Agent: Devin Local. `AGENTS.md` applies in full.

---

## What this phase does

Define a rarity-ordered loudness ladder, assign every aura a rung, build the renderer
support the top rungs need, prove the ladder on a seven-aura pilot spanning R2 to R5, then
roll it out in later phases.

Brodan's direction, recorded: commons should still look cool; each rarity step up should
look clearly crazier; earned and pulled auras share one ladder, ordered by how hard the
aura is to get.

## Findings that shape it

- No aura had ever been assigned a tier. The guide's Tier 3 was a paper spec nothing
  reached.
- Loudness did not track rarity: boss median 0.478 ms sat under feat 0.542 ms; the two
  dimmest auras, standardbearer 0.148 ms and ironbound 0.217 ms, were the two cheapest in
  the library.
- **Glow does not saturate at 1.3.** Measured on ember at 141 px, band luminance rises
  linearly from 17.5 at glow 0.78 to 33.2 at 1.7. The gradient clips at glow × breathe
  ≈ 1.82, so **1.8 is the real ceiling**.
- Small canvases are real user views: crew rows 52 px, leaderboard 59 px, duel 67 px,
  studio 88 px, profile 141 px, crate preview 160 px.
- One spec size serves all of them, so the 52 px crew row caps every rung: soft heroes
  flatten at sz ≈4.0 from R1 to R5. **Decided: add a `small:` view block** (Part 2 option
  3) so ring-size heroes can grow to ~42 px drawn against ~18 px today, opt-in, leaving
  untouched auras byte-identical. Lowering the unit floor globally was rejected — it
  rewrites all 51 auras at small sizes, invalidates the phase's zero-diff gates, and its
  regression falls hardest on soft-particle commons (ember and stormstep deflate; the
  sprite-driven eclipseheart, which needs it least, barely moves).
- `blacksun` violates the no-clipping rule on main today: `AURA_ART.blacksun`'s orbiting
  eclipse disc reaches ≈1.97·rx against a frame half of ≈1.72·rx, exiting by up to ~12 px
  at ring, fully opaque, across seconds of each 21 s orbit. Pre-existing.

---

## The ladder

Membership is decided. The hero rows below assume the `small:` block from Part 3; if Part 3
lands differently, they are revised there and nowhere else.

| | R1 quiet | R2 charged | R3 heavy | R4 showcase | R5 spectacle |
| --- | --- | --- | --- | --- | --- |
| glow | 0.70–0.85 | 1.00–1.15 | 1.15–1.25 | 1.35–1.50 | 1.55–1.75 |
| soft hero sz (≥110 px) | ≤4.5 | ≤5.5 | ≤6.5 | ≤8.0 | ≤9.5, orbit ≤1.2 |
| soft hero sz (`small:`) | ≤2.8 | ≤3.2 | ≤3.6 | ≤4.0 | ≤4.0 |
| hard hero sz (≥110 px) | ≤5 | ≤7 | ≤9 | ≤10.5 | ≤12 |
| hard hero sz (`small:`) | ≤4 | ≤5 | ≤5.5 | ≤6 | ≤6.5 |
| img sprite hero (×rx) | none | ≤0.5, behind-photo only | ≤0.7 | ≤0.9 | ≤1.2 |
| signature sprite | — one `img` asset per aura may exceed the rung's img cap; ceiling is the edge rule at all six sizes — |
| glyphring radius (×rx) | none | none | ≤0.4 | ≤0.5 | ≤0.5 |
| ring particles N | 10–25 | 20–35 | 25–45 | 35–60 | 40–80 |
| spec layers | 3–4 | 4–5 | 5–6 | 5–7 | ≥6 |
| signatures | none | ONE | signature + accent; **no new moments, no sweeps** | ≥2 + moment + art | unrestricted; moment + art |

Glow hard ceiling 1.8 at every rung. Soft-hero footprint ≈ sz × unit × 5.2; hard ≈ sz ×
unit × 3.5; img and glyphring scale with rx and are size-independent.

**Signature sprite (amendment, Brodan 2026-09-29).** One sprite *asset* per aura — all `img`
layers sharing a `src` — may exceed the img-hero cap; every other sprite stays capped. Its
ceiling is the edge rule itself: painted border alpha = 0 at all six sizes, steady and
moment, all seeds. If the painted sprite reaches the border, resolve in order: pull orbit
`r` inward, reduce bob/wobble amplitude, shrink — **shrinking a signature sprite is the
last resort, not the first**. `small:` may set the signature's `sz` independently of blanket
`scale` so it stays legible at crew52. Renderer support: `treat: "rimlight"` (opt-in) bakes
the edge catch without `shadowfade`'s darkening, for bright sprites.

**Ceilings vs minimums.** For existing auras these rows are permitted ceilings — an aura may
sit below its rung, never above it. For any aura built or reworked to a rung, the rows are
minimums as well. Grandfathered exceptions, by name: `iaidraw` (sweep at R1), `steadybreath`
(rings at R1), `nullpoint` (no moment at R4), `yogurt` (no signature at R5).

### Membership

| Rung | Members |
| --- | --- |
| **R1** | crate uncommon: sigil, steadybreath, iaidraw · rank 1–2: ember, tide |
| **R2** | crate epic: glassfire, stormstep, zeropoint, ninetail, ironbound · rank 3: storm |
| **R3** | feat: smolder, stormborn, dawn, wanderer, atlas, forge, standardbearer · boss: wyrm, frost, abyss, chud, rust, thunder, hollow, deep, magma, plague, sand, void · crate legendary: ledger, ossuary, redline, bonewright · rank 4: inferno |
| **R4** | crate mythic: nullpoint, carve, brandmark, fallenlight · rank 5: halo · special: huntersmoon |
| **R5** | special: yogurt, vendetta, ascended, wheel, champion · crate gilded: eclipseheart · crate secret: blacksun · rank 6: godray |

`ember` anchors R1 and `stormstep` anchors R2 — neither changes this phase; stormstep is the
perf reference. `soon_throne` and `soon_seraphim` are placeholders, unassigned, untouched.

### Pilot

**ironbound** (R2), **forge** and **standardbearer** (R3), **fallenlight** and **huntersmoon**
(R4), **eclipseheart** and **blacksun** (R5).

---

## The two R5 moments (approved concepts, spec'd)

Both are new. Both must read on the **ring**, where the photo covers the centre and only the
halo band is visible — not just on the figure. Both reuse their own aura's motifs; no generic
white shockwave. Each gets **exactly one** flash through `noteStrikeFlash`; under reduced
motion that flash becomes a slow brighten with no flash at all.

### eclipseheart — "Totality"

| Beat | Time | What happens |
| --- | --- | --- |
| 1 | 0–0.5 s | Gem ring tightens inward and dims; rays retract; darkness creeps in from the outer rim |
| 2 | 0.5–1.1 s | Full dark — disc near-black, only a thin bright rim line survives, gems gone. **Hold.** The stillness sells the flare |
| 3 | 1.1–1.2 s | **One** corona flare: white-gold, bursting outward along the rim. The single flash |
| 4 | 1.2–2.4 s | Light floods back; gems re-ignite one at a time, staggered; rays fan out; settles |

Reuses the existing sweep (beat 1), rays, both rings (beat 2 rim line), gem orbit (beat 4).
Staggered re-ignition is twinkle, not flash. Reduced motion: beat 3 becomes a 0.4 s brighten.

### blacksun — "Umbra"

| Beat | Time | What happens |
| --- | --- | --- |
| 1 | 0–0.6 s | Colour-cycle ring desaturates to grey; shadow wisps thicken and spiral inward; wings fold in |
| 2 | 0.6–1.0 s | The dark disc expands and swallows the ring — near-total black, a thin inverted-colour rim |
| 3 | 1.0–1.15 s | Wings snap wide open; the disc's edge blows out in inverted colour. The single flash |
| 4 | 1.15–2.6 s | Colour-cycle returns, running inverted for ~1.5 s before settling to normal |

Reuses the wings, colorCycle ring, shadow wisps, dark disc. Ring read: wings occupy the halo
band left and right of the photo; the swallow reads as the band going black. Reduced motion:
wings open slowly, no flash. **The wings must come inside the R5 sprite cap (≤1.2 rx; 1.75 rx
today) and inside the edge rule.** *(Amended pending approval — rebuilt blacksun keeps the
restored `wing.webp` at 1.75 rx plus the iron ring at ≈1.45 rx; proposed wording and edge-rule
evidence are in DECISIONS.md "pending cap amendment".)*

---

## Rules that must not be undone

- **Flash rule (seizure safety).** Every flash through `noteStrikeFlash`. Page-wide maximum
  3 per second, none under reduced motion, no whole-aura brightness swing faster than
  3/second. One big strike is fine; staggered twinkles are fine. A louder ladder does not buy
  more flashes. Medical constraint, not a style limit.
- **Edges.** Per the measurable rule below.
- **Ring view first.** Anything a moment shows on the figure needs a ring equivalent.
- **Identity.** Every aura stays instantly tellable apart at ring size, including from its
  rung-mates. Palettes are not locked.
- **IP rule.** Original designs only.
- **Bonewright** stays pixel-identical with identical `flashTimes`.
- **Never rename saved ids.**
- **`APP_VERSION`** bumps to `7m` in the final part only.
- **Measurement changes need a written `DECISIONS.md` proposal first.**
- **You never push.** Brodan pushes and tags.

## Approved proposals to implement

Accepted; implement where the parts below say, not before.

1. **Edge rule, measurable.** Border = outermost 1-px rows, all four edges, both canvases.
   Per frame report `edgeSoft` (alpha 0–0.30, always legal), `edgeHard` (alpha ≥ 0.30, must
   be 0 in steady state; transient burst debris must clear within 0.5 s and is reported), and
   `edgeRun` (widest connected run at alpha ≥ 0.50; ≤3 px legal at any time). Verdict is the
   **max over a worst-case grid**: ≥3 seeds × frames {60, 90, 120, 150, 180, 210, 240} plus a
   forced-moment pass, × sizes {crew 52, board 59, ring 141, figure 128×163}, fresh page per
   aura. Report names the largest object touching the edge with its size in px.
2. **Budget reference pinned.** `aura:perf --ab` takes its WARN denominator from
   `median(runsA["stormstep"])` — the baseline worktree — not the live tree. Non-`--ab` runs
   keep the live ref as a same-session approximation and say so.
3. **FAIL-rule exemption, scoped.** The `--ab` FAIL rule (>15% **and** >0.05 ms) does not
   apply to exactly these seven ids — ironbound, forge, standardbearer, fallenlight,
   huntersmoon, eclipseheart, blacksun — during 7m only. Every other aura still fails.
   Expires when v7m is tagged and the baseline re-pins.
4. **New `spectacle` stress set** in `scripts/aura-sets.mjs`: yogurt, vendetta, ascended,
   wheel, champion, eclipseheart, blacksun, godray. Same rules as the other sets, p95 < 16 ms.
   The existing sets exclude the two loudest auras, so the gate would not cover the worst
   board after rollout. Freeze the id list at v7m.

## Dropped / out of scope

- Carve and wyrm trims. Carve is over by ~0.04 ms, inside session noise, and the only route
  to the saving changes pixels. Carve stays in `KNOWN_OVER`; record why.
- Hands off: the `makeFlameTongues` clamp, carve's `rings` `#111111` entry, ironbound's
  under-photo chains.
- Lowering the unit floor globally (Part 2 option 2) — rejected, reasons recorded above.
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

## Part 3 — build the `small:` view block

No aura changes in this part. Nothing should look different anywhere when it ends.

**A. Semantics, pinned in `DECISIONS.md` before coding.** Write and get approval for:
threshold (`w < 110`, matching the existing unit floor); merge order
(base → circle → `small`, most specific last, so circle edits still apply at small sizes);
whether `small:` applies in body mode (**decided, Brodan 2026-09-27: orthogonal** — a size
scope on top of the active view block, base → `body` → `small`, so a body-mode render at
≥110 px is byte-identical today, and a future <110 px figure canvas inherits `small:`
automatically); and the three amendments below.

**B. Amendment 1 — opt in with one number.** `small:` must support a scale multiplier
(e.g. `small: { scale: 0.45 }`) that scales particle size and count, as well as the explicit
per-field form. An aura should be able to opt in with a single number rather than maintaining
a second full recipe forever. If a multiplier cannot express what the explicit form can, say
exactly where it falls short.

**C. Amendment 2 — `small:` may only change size, count and speed.** Never palette, shapes,
signatures or art selection. An aura must be recognisably the same aura on a leaderboard row
as on a profile. Enforce it in the spec validator, with a test that a disallowed key under
`small:` is rejected.

**D. Amendment 3 — the perf gate must see the loud version.** `aura:perf` and `aura:stress`
run at board-32, which is exactly the size `small:` shrinks — so after this lands, the gate
measures the quiet version of every opted aura. Propose a ring-size measurement pass (a
`--size ring` flag on `aura:perf`, or a ring-size stress set) as a `DECISIONS.md` proposal,
and implement it here. State the new numbers' relationship to the existing budgets: they are
a separate series, not comparable to board-32 medians.

**E. Implement:** renderer (`makeAura`, `mergeViewLayer`), `specFormat.js` (`VIEW_BLOCKS`,
`scopedPath`, `VIEW_LOCKED_LAYER_KEYS`), and the tooling touchpoints — `gallery-effects.mjs`
`hiddenFields` (it filters on `path[2] === "circle"|"body"` and would mislabel `small` fields),
and the dev editor's scope picker or a documented note that `small:` is hand-edited.

**F. Prove it is inert.** `aura:diff` full set: **every one of the 51 auras must be zero
differing pixels at every size**, because no aura opts in yet. This is the whole safety
argument for choosing this option — if it is not zero, stop and report.

**G. Tests** for merge order, the multiplier, the disallowed-key rejection, and the threshold
boundary (109 px vs 110 px).

**H.** `aura:perf --ab` full set to confirm no cost when unused, plus `npm.cmd run check`.

**Then stop and report.**

---

## Part 4 — build the ceiling: eclipseheart and blacksun (R5)

**A.** Implement the edge rule (proposal 1) and the pinned budget reference (proposal 2) in
the harness; record the exemption (3). Report which auras warn under the new line.

**B.** Fix the pre-existing `AURA_ART.blacksun` eclipse-disc clipping — clamp the orbit, scale
the disc to the canvas margin, or fade it inward before the border. Report as a **pre-existing
bug fix** with before/after worst-case edge numbers at all four sizes, not folded into the
rework narrative. Bring the wing sprite inside the R5 cap in the same pass.

**C.** Build both to R5, including the two moments spec'd above. List every file and field
changed, before/after. Use `small:` where the ring wants more than a small tile can hold.

**D.** `aura:shots` for both: ring dark/light, board, figure, f90/f120, reduced motion, the
opaque-square-photo ring shot, **crew 52 px and leaderboard 59 px shots** (new — these are what
`small:` governs), and a moment filmstrip of at least 6 frames spanning each moment at ring
size.

**E.** Glow-disabled lit% and band lit% for both, before and after, with reference auras.

**F.** Edge check under the new rule, worst-case grid, all four sizes. The largest object
touching the edge with its size in px — the number, not "no clipping".

**G.** Flash audit: every flash path, the page-wide rate under forced moments, confirmation
each moment fires exactly one flash and reduced motion suppresses both.

**H.** `aura:diff` full set — everything except these two is zero. `aura:flash` for bonewright.

**I.** `aura:perf -- --ab --only eclipseheart,blacksun,stormstep` at board-32 **and at ring
size**, plus the `fixed` and `spectacle` stress sets.

**J.** `npm.cmd run check`.

**Then stop and report.** Expect iteration — this rung defines "insane", and it is worth
getting wrong twice.

---

## Part 5 — fallenlight and huntersmoon (R4)

Items C–J as in Part 4, for both. They must read as clearly a step below the R5 pair and
clearly above R3. Include a strip against eclipseheart and blacksun.

fallenlight carries the known edge instability — 0 lit border pixels at one seed, 245 at
another — so it most needs the worst-case grid.

**Then stop and report.**

---

## Part 6 — forge, standardbearer (R3) and ironbound (R2)

Items C–J, for all three. These carry the "commons still look cool, and the steps are obvious"
test:

- forge must no longer read as the same picture as smolder;
- standardbearer and forge share a rung and must still be instantly tellable apart;
- ironbound sits a rung below them and must read as a clear step down from forge while still
  looking good on its own.

Include a **seven-way ladder strip** at ring size: ironbound, forge, standardbearer,
fallenlight, huntersmoon, eclipseheart, blacksun — the ladder in one image. That strip is the
real test of the phase. Include the same strip at crew 52 px, which is where `small:` has to
prove it kept the ladder legible.

R3's average bump must stay at or under +0.15 ms per aura. If forge or standardbearer cannot
reach R3's feel within that, say so plainly rather than spending the rollout's headroom.

**Then stop and report.**

---

## Part 7 — settle, document, ship

**A.** Full `aura:diff`: only the seven reworked auras differ from baseline.

**B.** Stress: `fixed`, `ledger`, `revamp`, `spectacle`, plus the ring-size pass from Part 3D.
p95 under 16 ms each. The ≤12 ms fixed-set WARN target is forecast to be exceeded at full
rollout (~13–14 ms); report the number, do not relax the target here.

**C. Rollout stop rule**, recorded in `DECISIONS.md`: after each later rollout batch, stress
runs, and **if fixed-set p95 exceeds 14.5 ms the rollout pauses** and the remaining rungs get
cheaper recipes. 16 ms is where frames start dropping; 14.5 is the margin that keeps session
noise from eating it.

**D.** Cross-day perf table: every session this phase, with date, baseline-pinned stormstep
median, and the seven reworked auras' medians at both board-32 and ring size.

**E.** Write the ladder into `docs/aura-style-guide.md` — five rungs, numbers, full member
assignment, ceilings-vs-minimums rule, grandfathered exceptions, and how `small:` is used.
Record in `DECISIONS.md`: the rung map, the edge rule, the budget reference change, the FAIL
exemption and its expiry, the `spectacle` set, the ring-size pass, the rollout stop rule, the
`small:` semantics and its three amendments, the blacksun pre-existing bug, why the unit floor
was not lowered, and why carve stays in `KNOWN_OVER`.

**F.** Fix the `drawCarveSigil` `save()`/`restore()` imbalance. Own item, own
`aura:diff --only carve`, zero differing pixels.

**G.** Bump `APP_VERSION` to `7m`; confirm the SW cache reads `ascend-v7m`.

**H.** `npm.cmd run check`, then a final summary: every file changed, commit hashes, anything
left open, and the recommended rollout order for the remaining auras.

**I.** After Brodan tags v7m: re-pin the baseline worktree to v7m, record the seven reworked
auras' new medians as their ceilings in `aura-sets.mjs`, and retire their `GRANDFATHERED`
entries — an edited aura is no longer untouched. The ring stress set re-freezes at v7m
alongside the others, ranked by **ring-size medians** (`aura:stress --size ring`), not
board-32 medians — three of its four members (eclipseheart, blacksun, huntersmoon) are
being reworked this phase, so its membership has to be re-proven at the size it actually
gates. (Added in Part 4 per Brodan.)

**Then stop.** Brodan pushes and tags `v7m`.

---

## Checklist

- [ ] Part 3: `small:` block built, three amendments in, all 51 auras still byte-identical
- [ ] Part 4: edge rule + budget ref implemented; blacksun bug fixed; both R5 auras built with moments
- [ ] Brodan's notes on the ceiling — iterate until it's right
- [ ] Part 5: fallenlight + huntersmoon, one clear step below
- [ ] Part 6: forge, standardbearer, ironbound — the seven-way ladder strip
- [ ] Part 7: stress passes, docs written, `APP_VERSION` → `7m`
- [ ] Brodan pushes and tags `v7m`; baseline re-pins to v7m

## Notes for Brodan

- Fresh Devin chat per part — these are long.
- Close the gallery tab while Devin measures.
- Gallery looks wrong right after a change: **Ctrl + Shift + R**.
- Restart the PC if orphaned node/Chrome processes pile up.
- Part 3 has nothing to look at. The first pretty pictures arrive at the end of Part 4.
