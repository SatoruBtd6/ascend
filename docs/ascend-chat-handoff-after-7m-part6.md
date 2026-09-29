# Ascend — chat handoff, end of phase 7m Part 6

For a fresh Claude chat picking up this work cold. Brodan will paste this in
first, the way he pasted the 7l handoff at the start of the last one.

---

## Who and what

Brodan builds **Ascend**, a levelling-style gym tracker he shares with his
cousins. Live on Vercel + Supabase, **auto-deploys from `main` on push** — so
pushing ships it to real users. The repo is at `C:\Users\rms76\ascend` on
Windows, PowerShell.

**Auras** are the animated cosmetic rings that render around a user's profile
photo. 51 of them. They are the collection/status system of the app — the thing
people grind for.

## The working setup

Three parties:

- **Brodan** — owns the product and every look decision. Runs git commands and
  moves files. Non-technical: explain plainly, never assume he'll read code.
  He's the only one who can approve how something looks.
- **Devin Local** — a coding agent running on Brodan's PC. Does all the
  building and measuring. Never pushes.
- **Claude (you)** — writes the phase docs, reviews Devin's reports critically,
  and drafts the messages Brodan pastes to Devin.

**Your actual job is the review.** Devin is capable and mostly honest, but the
failure mode this project keeps hitting is a claim that sounds rigorous and
isn't: a metric that can't see what it claims to measure, a gate quietly read
in the permissive direction, "expected to differ" waving through an unexamined
change, an explanation restated instead of a requested change implemented.
Several of the phase's most valuable findings came from pushing on exactly
those. Push, but fairly — he has also self-corrected well when pressed, and
he's caught real bugs nobody asked him to look for.

**Devin gets a fresh chat per part and cannot see previous chats.** Never write
"as in my previous message" — restate anything carried forward in full. This
has already cost real time.

**Write design direction specifically enough that he doesn't invent the look.**
Composition, motion, palette, feel; beat-by-beat for moments. Vague briefs come
back as his guess, and Brodan rejects them. When you don't know what Brodan
wants, ask him for it in plain terms — where does it sit, what's it doing, what
does it feel like — and turn his answer into the spec.

## What phase 7m is

Brodan wanted Sol's-RNG-grade auras: commons that still look cool, each rarity
step clearly crazier, rare ones genuinely eye-catching.

Investigation found there was no ladder to raise — no aura had ever been
assigned a tier, the style guide's top tier was a paper spec nothing reached,
and loudness didn't track rarity at all. So 7m is: **define a five-rung
rarity-ordered ladder, assign every aura, prove it on a seven-aura pilot, then
roll out in later phases.**

The pilot is complete and approved: eclipseheart and blacksun (R5), fallenlight
and huntersmoon (R4), forge and standardbearer (R3), ironbound (R2).

**Read `docs/phase-7m-ladder.md` for the plan and `docs/phase-7m-state.md` for
everything that has actually happened** — approval pins, the twelve amendments
made mid-phase, known exceptions, renderer traps, open items. The state doc is
the important one; don't work from the plan alone.

## Where things stand

Part 7 is next and is the last part: full stress across all sets, docs and
`DECISIONS.md` writing, `APP_VERSION` → `7m`, the carve save/restore fix, the
baseline re-pin. Then Brodan pushes and tags `v7m`.

**The one genuinely open question** is perf. Fixed-set stress p95 has read
anywhere from 11.2 to 15.1 ms across the batch, against a 14.5 ms pause line
and a 16 ms hard gate (where frames start dropping). Seven auras are done and
44 remain, 19 of them in R3, which appears in every stress set. Part 7 has to
answer this with a proper multi-run measurement and say plainly whether the
rollout fits — otherwise it starts without knowing it can finish.

## Things worth knowing that aren't in the docs

- The **flash rule** (max 3/second page-wide, none under reduced motion, all
  routed through `noteStrikeFlash`) is seizure safety, not style. Brodan asked
  once whether it could be dropped; the answer was no, and it turned out not to
  be what was limiting the look anyway. Red pulses are the highest-risk pattern
  — build them as continuous brightness swells, never repeated flashes.
- **Brodan's eye is the gate that works.** Both R5 auras passed every automated
  check and then failed when he looked at them on his phone — twice, at small
  sizes. The six-size evidence requirement exists because of that.
- **He generates image assets himself** (the gothic ring, the heavy chain) with
  Gemini, on a flat magenta background, and Devin keys them. Prompts need
  "one uniform flat magenta colour, no gradient, no checkerboard" or the model
  paints a transparency checkerboard as artwork.
- Moving files into the repo has gone wrong repeatedly — Windows saves with
  spaces instead of underscores, and File Explorer drags silently don't take.
  `move -Force` from PowerShell is reliable; verify with `dir` before telling
  him to commit.
- The dev gallery is `?auras=1`, not `?gallery=1`.
- **Ironbound took four passes.** Three of them chased a fix that didn't match
  what he'd asked for, including a new heavy-gauge asset that made the strand
  narrower. The version he approved was going back to the original art at full
  thickness. When a design note isn't landing, re-read what he actually said
  before proposing something cleverer.
