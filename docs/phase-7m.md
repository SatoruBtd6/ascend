# Phase 7m — brightness pass + perf trims

Owner: Brodan. Agent: Devin Local. `AGENTS.md` still applies in full; this doc adds the
task specifics and restates the decisions that matter here.

**Scope of this phase**

1. Brighten four dim protected auras: **forge, ironbound, fallenlight, standardbearer**.
2. Trim **carve** and **wyrm** back under the per-aura budget with no visible change.
3. Re-run stress and collect cross-day perf data.
4. Bump `APP_VERSION` to `7m` (last part only).

**Out of scope.** Nothing else. No new auras, no new shapes, no moment redesigns, no
tooling changes, no refactors you happen to notice are needed. If you think something
outside this list must change, stop and propose it.

---

## Standing rules that apply to this phase

Restated because a silent brief invites guessing:

- **Ring view first.** Every judgement is made on the profile-photo (circle) view first.
  Body/studio views must not regress, but the ring is what decides.
- **Flash rule (seizure safety).** Every flash, flare or lightning wash goes through
  `noteStrikeFlash`. Page-wide maximum 3 per second, none under reduced motion. No
  whole-aura brightness swing faster than 3 per second. Staggered twinkles are fine.
  **Brightening must not add a single new flash event.** If a brighter look tempts you
  toward a pulse, don't — raise steady output instead.
- **Edges.** Nothing is cut off by the canvas edge at any size. Only sparks of 3 px or
  less may touch the edge. Use the opt-in fits (`bolts.fit`, `rays.fit`, `inward.fit`,
  `sweep.fit`, burst `fit`). Bigger glow discs are the classic way brightness breaks
  this, so check it. Do **not** relabel a clipped object as sanctioned debris.
- **Palettes and signatures.** Each aura keeps its own palette and signature and stays
  instantly tellable apart at ring size. Colours are **not** locked — you may adjust a
  colour if brightness genuinely needs it — but the aura must still read as itself.
- **Bonewright** stays pixel-identical with identical `flashTimes`.
- **Never rename saved ids.**
- **`APP_VERSION`** is bumped only in the final part, to `7m`. The SW cache name is
  `ascend-v{APP_VERSION}`. Do not bump it earlier, and do not bump it twice.
- **Ledger and Nullpoint are dark by design.** Do not brighten them.
- **Measurement changes need a proposal first** (`DECISIONS.md`). Do not "fix" a harness
  mid-phase without asking.
- **You never push.** Brodan pushes and tags.

## Reporting rules

- Stop at the end of every part and report. Do not roll into the next part.
- Every item is lettered. **Report on every item separately, by letter**, including items
  where the answer is "no change" or "couldn't measure". Do not drop items.
- Give evidence in the same message as the work: exact numbers with what each number
  measures, test names with what they assert, the commit hash of `HEAD`, and screenshots.
- Diagnosis before fix. Proposal before anything non-trivial.
- Absolute ms numbers swing 10–40% between sessions on this PC. Never argue a change from
  a single absolute number. To attribute a change, run old and new **alternating in one
  session** (`--ab`).
- `lit%` saturates on the glow disc (about 63% at glow ≥ 0.75), so it cannot separate
  tiers. Use **glow-disabled lit%** for brightness comparisons and say which one each
  number is.
- The standard avatar `/avatars/E.webp` is a full-body photo clipped to a circle, so ring
  screenshots look like the figure. When ring evidence matters, also provide a shot
  against an **opaque square photo**.
- Evidence lands in `evidence/<command>/<timestamp>/` (gitignored). Give the paths.

---

## Part 1 — measure and propose. No code changes.

This part changes no source files. If you find yourself editing `src/`, stop.

**A. Confirm the starting point.** Report `HEAD` (hash and subject) and confirm it is
`4e9ad95` or a descendant. Run `npm.cmd run check` and report: test count, eslint warning
count (`npx eslint src`, never `eslint .`), and madge files/cycles. Expected baseline:
218 tests, 5 warnings, 188 files, 0 cycles. Flag any difference.

**B. Brightness, measured.** For each of **forge, ironbound, fallenlight, standardbearer**,
in the ring/circle view: glow-disabled lit%, and the same number for the reference aura
**stormstep** and for one clearly bright aura of your choice, so there's a scale. State
exactly what the number measures and at what size. Put all of it in one table.

**C. Brightness, seen.** `npm.cmd run aura:shots -- --only forge,ironbound,fallenlight,standardbearer`
plus a look-alike strip for each of the four (`-- --strip …`) against its closest
neighbours. Include the opaque-square-photo version for each of the four. Give the
evidence paths.

**D. Why each one reads dim.** For each of the four, a short diagnosis in plain words:
what is actually holding the brightness down (particle count, alpha, glow radius, layer
count, palette value, blend mode, something else). Name the fields and files.

**E. Carve and Wyrm, measured.** `npm.cmd run aura:perf -- --only carve,wyrm,stormstep`
in one session. Report each aura's median, the same-session stormstep median, the
resulting budget (1.3 × stormstep), and how far over each one is. Say how many runs.

**F. Where the cost is.** For carve and wyrm, a diagnosis before any fix: which layers,
particle counts, shapes or per-frame work dominate. Numbers, not intuition. Remember that
anything outside the canvas is invisible to the perf and diff tools — say explicitly
whether either aura draws anything outside the canvas.

**G. Proposal: brightness.** For each of the four, the exact edits you propose — file,
field, current value, proposed value, and one sentence on the expected visible effect.
Flag any edit that could grow the footprint toward the canvas edge. Confirm none of it
adds a flash event or touches `noteStrikeFlash` timing.

**H. Proposal: trims.** For carve and wyrm, the exact edits you propose, each with the
expected ms saving and why you believe the look is unchanged. The bar is pixel-identical,
so anything that changes visible output needs to be called out here, not discovered later.

**I. Risks.** Anything in the above you are unsure about, plus anything you noticed that
is out of scope. Note: Forge has hidden `moment.flash.*` fields that crash with a NaN
colour — leave them alone, and say if your proposal goes anywhere near them.

**Then stop.** Brodan reviews the screenshots and gives notes in plain words.

---

## Part 2 — brightness edits

Only the edits approved from G, plus Brodan's notes.

**A.** Make the approved edits. List every file and field you changed, with before/after
values.

**B.** Re-measure glow-disabled lit% for all four, same method and size as Part 1B, in one
table: before, after, and the stormstep reference for that session.

**C.** New `aura:shots` for all four, with look-alike strips and the opaque-square-photo
versions. These four are intentionally different from the pinned baseline now, so the
pixel diff will show differences for them — that is expected. What must **not** change is
any other aura.

**D.** `npm.cmd run aura:diff` across the full set. Every aura except the four must be
zero differing pixels, multi-frame and multi-size. Report the four's diff numbers too, as
information.

**E.** `npm.cmd run aura:flash` — Bonewright pixels and `flashTimes` unchanged.

**F.** Edge check at every size for the four: report the **largest object touching the
edge, with its size in px**, for each. Not "no clipping" — the number.

**G.** `npm.cmd run aura:perf -- --ab --only forge,ironbound,fallenlight,standardbearer`.
Brightness usually costs something; report it against the FAIL rule (more than 15% **and**
more than 0.05 ms slower, confirmed on the automatic re-run).

**H.** `npm.cmd run check`.

**Then stop and report.** Do not start Part 3.

---

## Part 3 — Carve and Wyrm trims

Only the edits approved from H in Part 1.

**A.** Make the trims. List every file and field, before/after.

**B.** `npm.cmd run aura:diff -- --only carve,wyrm`. **Target: zero differing pixels**,
multi-frame, multi-size, fresh page per aura. If it isn't zero, do not explain the
difference away — report the frames and sizes where it differs and stop.

**C.** `npm.cmd run aura:perf -- --ab --only carve,wyrm,stormstep`, 5 runs, alternating,
one session. Report each median, the same-session stormstep median, the budget, and
whether each aura is now under it.

**D.** If either is still over: say so plainly and propose the next step. Do not keep
trimming on your own initiative.

**E.** `npm.cmd run check`.

**Then stop and report.**

---

## Part 4 — stress, cross-day data, version bump

**A.** `npm.cmd run aura:stress -- --set fixed` (board-32, circle mode, 4× CPU, moments
forced). All four brightened auras are in this set. Report p95 and median. p95 must stay
under 16 ms; aim for the fixed-set median at or under 12 ms. 7l reference: fixed ≈ 11 ms.

**B.** `npm.cmd run aura:stress -- --set ledger`. 7l reference ≈ 10.4 ms.

**C.** `npm.cmd run aura:stress -- --set revamp`. 7l reference ≈ 10.1 ms. Carve and Wyrm
are in this set.

**D. Cross-day perf data.** In each session where you ran `aura:perf` this phase, report
the date, the stormstep same-session median, and the medians for carve, wyrm and the four
brightened auras. One table for the whole phase. This is the data that will settle whether
the provisional 1.3× ratio budget stays. Do not propose a new budget yet — just the table.

**E.** Update `docs/DECISIONS.md` and `docs/aura-style-guide.md` if anything in this phase
changed a stated rule or a recorded value. If nothing did, say so.

**F.** Remove carve and wyrm from `KNOWN_OVER` **only if** Part 3 proved them under budget.
Note the current state of Cursed Ember (glassfire), which was borderline — measurement
only, no edits.

**G.** Bump `APP_VERSION` to `7m`. Confirm the SW cache name reads `ascend-v7m`. This is
the only permitted bump in the phase.

**H.** `npm.cmd run check`, then a final summary: every file changed in 7m, the commit
hashes, and anything left open.

**Then stop.** Brodan pushes and tags `v7m`.

---

## Checklist

- [ ] Part 1: measurements, screenshots, diagnoses, proposals — no code changes
- [ ] Brodan's visual notes on the four dim auras
- [ ] Part 2: brightness edits, diff clean everywhere else, flash unchanged, edges numbered
- [ ] Part 3: carve + wyrm trims, zero-pixel diff, both under budget
- [ ] Part 4: three stress sets pass, cross-day table, docs updated, `APP_VERSION` → `7m`
- [ ] Brodan pushes and tags `v7m`

## Notes for Brodan

- Fresh Devin chat for this phase; start another one if the thread gets long.
- Close the gallery tab while Devin measures.
- If the gallery looks wrong right after a change: **Ctrl + Shift + R**.
- Restart the PC if orphaned node/Chrome processes pile up.
