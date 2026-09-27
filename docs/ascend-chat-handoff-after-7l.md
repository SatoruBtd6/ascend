# Ascend — chat handoff (end of 7l, September 2026)

Paste this into a new Claude chat to carry the project forward.

---

## The project

**Ascend** is a leveling-style gym tracker owned by Brodan (Austin, TX), live at
`https://www.ascendfit.site`, shared with his cousins and heading toward a wider release. React 18 +
Vite + Tailwind, Supabase for auth/storage, Vercel for hosting (every push to `main` deploys live).
Repo `github.com/SatoruBtd6/ascend`; workspace `C:\Users\rms76\ascend` on Windows.

Brodan is the owner and sole decision-maker, and is not a professional developer:
- Explain things in plain words, spell out commands, keep replies short, and never assume a step
  will be inferred.
- He reviews auras visually in the gallery and gives notes in plain words.
- He wants auras to feel **insane** (vibrant, detailed, eye-catching, like Sol's RNG on Roblox).
- The **profile photo (ring/avatar) view is the most important view**, always.

**Coding agent:** Devin Local (the renamed Windsurf app). It reads `AGENTS.md` in the repo root
automatically on every message. Cursor may come back; Claude Code on the web ($100 credit) is an
option for code-only phases (it only sees GitHub, pushes a branch, and has limited network).

## How this chat works

Claude writes phase docs and reviews Devin's reports. It does not write app code.

1. Claude writes a phase doc (markdown) with parts, stops and a checklist. Brodan saves it in `docs/`
   and commits it. **Not via GitHub's upload button**; that caused a diverged `main` once.
2. Brodan sends: "Read docs/<doc> and do Part N only."
3. Devin stops after each part and reports. Brodan pastes the report here.
4. Claude reviews it critically, then drafts the next message as a ready-to-paste code block, with a
   `[my notes]` slot where Brodan adds his visual feedback.
5. **Brodan pushes and tags. Devin never pushes.**

Prompt style:
- `AGENTS.md` covers the standing rules, so prompts only need task specifics.
- **Restate the key decisions for each task anyway.** Devin guesses when a brief is silent.
- Letter each item (A, B, C…) and require "report on every item separately"; Devin has silently
  skipped items before.
- Combining a review round, fixes and the next batch into one message saves round trips.
- Tell Brodan to start a **fresh Devin chat** each phase or whenever the thread gets long (long
  chats make Devin slow and forgetful). Close the gallery tab while Devin measures, and restart the
  PC if orphaned node/Chrome processes pile up.

## Reviewing reports: what has gone wrong before

Ask for evidence **in the same message as the work**: exact numbers with what each measures, test
names with what they assert, commit hashes, and screenshots. Ask for a diagnosis before a fix, and
a proposal before anything non-trivial.

**Claims that slipped through or nearly did:**
- "Zero differing pixels" that weren't. Early diffs compared only the last frame, and a rays bug
  and a Black Sun bug hid in mid-run frames. The trusted diff is now multi-frame, multi-size, with
  a fresh page per aura.
- **Tests that check values, not effects.** Always ask for proof that the visible result changed.
- **Harness measurement bugs**, repeatedly:
  - cold moment paths;
  - a shared RNG stream;
  - wall-clock flash budget;
  - a noisy `p95` from 0.1 ms timer quantization;
  - screenshots taken before lazy images loaded (the empty-cache bug in W).
- **Stress numbers drift up to ±3 ms between sessions.** To attribute a change, run old and new
  **alternating in one session**.
- **Rule creep:** Devin twice relabelled clipped objects as "sanctioned debris". Only small sparks
  (≤3 px) may touch the edge. Ask for the largest object touching the edge, with its size.
- **Invented constraints:** "identity-locked colours" was Devin's own idea. Colours were never locked.
- **Items silently dropped from lists** (Carve, Wyrm, Magma and Brandmark vanished from a plan).
- **Unasked `APP_VERSION` bumps.** It went 7k → 7k.1 → 7k.2 before being told to stop.
- **A wrong command in the old `AGENTS.md`** (madge without `mjs`) caused repeated "179 files"
  reports. Fixed.
- **Things outside the canvas are invisible to the diff and perf tools.** Ascended's DOM wings went
  unmeasured until they were moved onto the canvas.
- **The gallery doesn't mount `App`.** Anything defined only in `App.jsx` (like CSS keyframes) won't
  run there.

**Context worth knowing:**
- The standard avatar `/avatars/E.webp` is a **full-body photo clipped to a circle**, so ring
  evidence looks like the figure. Also ask for an opaque square photo when it matters.
- "lit%" saturates on the glow disc (about 63% at glow 0.75 or more), so it can't separate tiers.
  Use glow-disabled lit% if needed.
- **Stale dev-server state:** if the gallery looks wrong right after a change, press
  **Ctrl + Shift + R**.

## Rules that must not be undone (`docs/DECISIONS.md`, `AGENTS.md`, `docs/aura-style-guide.md`)

- **Flash rule (seizure safety):** every flash, flare or lightning wash goes through
  `noteStrikeFlash`, with a page-wide maximum of 3 per second and none under reduced motion. No
  whole-aura brightness swings faster than 3 per second; staggered twinkles are fine. Explain it to
  Brodan as seizure safety, not a style limit. A single massive strike is fine.
- **Edges:** nothing is cut off by the canvas edge at any size. Only ≤3 px sparks are exempt. Use the
  opt-in fits: `bolts.fit`, `rays.fit`, `inward.fit`, `sweep.fit`, burst `fit`.
- **Per-aura perf policy (7l, see `docs/TESTING.md`):**
  - **FAIL rule = the A/B regression guard.** `npm run aura:perf -- --ab` measures current vs the
    pinned baseline in one session, alternating, with 5 runs. An aura fails only if it's more than
    15% AND more than 0.05 ms slower, and fails again on an automatic re-run.
  - **New/reworked aura budget = WARN only (provisional).** The budget is 1.3x the same-session
    median of the reference aura `stormstep` (about 0.6 ms). Revisit it after cross-day data.
  - **Grandfathered ceilings** (pre-rule protected auras + the 13 untouched): info only.
  - Absolute ms numbers swing 10-40% between sessions on Brodan's PC, so never judge perf from one
    absolute number.
- **Stress:** the fixed set is `atlas forge fallenlight ossuary ironbound standardbearer ascended
  bonewright nullpoint inferno` (board-32, circle mode, 4x CPU, moments forced), plus a Ledger-swap
  set. After every aura batch, also run the **revamp stress** (the 10 heaviest revamped auras). `p95`
  must stay under 16 ms; aim to keep the fixed-set median at or under 12 ms.
- **Bonewright** stays pixel-identical with identical `flashTimes` (`scripts/aura-7j-flashtimes.mjs`).
- **View overrides:** `body:` and `circle:` merge one level deep.
- **Never rename saved ids without a migration.**
- **IP rule (Brodan's own):** original designs only. No character names, series names or copied art.
  Decline resemblance requests briefly and offer an original version with the same energy.
- **Ring view first:** every aura and moment is designed for the profile photo first. Anything a
  moment shows on the figure needs a ring equivalent (behind the photo and around its edge).
- **Every aura has its own palette and signature,** instantly tellable apart at ring size. Evidence
  includes a strip against its closest look-alikes.
- **Moment bursts are individual:** built from the aura's own motifs, with washes tinted to the aura.
  No generic white shockring.
- **`APP_VERSION`** is bumped only in the final part of a phase. The SW cache name is
  `ascend-v{APP_VERSION}`.

## Current state

**7l (tooling) is complete** at commit `4e9ad95`. It made no app changes, so `APP_VERSION` stays
"7k.2" (correctly not bumped). Tags: `v7k` = `7f0c6ba`. Brodan was about to push and tag `v7l`
(`git tag v7l 4e9ad95`, then `git push origin v7l`). Confirm he did.

Baselines:
- `npm test` **218**;
- `npx eslint src` **5** warnings (never `eslint .`);
- `npx madge --circular --extensions js,jsx,mjs src` **188 files, 0 cycles**.

Stress (p95 medians, 7l): fixed **~11 ms**, Ledger **~10.4 ms**, revamp **10.1 ms**. The revamp
set was re-frozen in 7l as the 10 heaviest revamped auras that are NOT in the fixed or Ledger sets:
carve, wyrm, wanderer, vendetta, void, ninetail, sand, glassfire, stormborn, dawn (in
`scripts/aura-sets.mjs`; changing it needs a proposal).

The baseline worktree is pinned at `v7k` (`npm run aura:baseline -- <ref>` re-pins it).

### 7j (headroom + shapes)
- Real render speed-up of about 2.8 ms; the rest of the measured gain was harness fixes.
- 10 new particle shapes: comet, sparkle, orb, crystal, wisp, rune, zap (renamed from `bolt`), moth,
  lantern, sparkburst. 7k added `glyphring` (a whole ring of eyes/gems in one sprite) and `sliver`.

### 7k (aura revamp)
- **38 auras revamped** in three tiers. Tiers are separated by ring particle size, glow, layers and
  signature. `docs/aura-style-guide.md` holds the ladder and the recipe.
- **Untouched (13):** bonewright, blacksun, champion, eclipseheart, godray, halo, huntersmoon,
  inferno, ironbound, redline, standardbearer, and the two "soon" placeholders.
- **New moments:** abyss (black hole), void (starfield portal), vendetta (flying skull with red eyes
  spewing fire), stormborn (clouds + teal lightning strike), wanderer (footprints across the photo),
  smolder (flare-up), ascended (wings expand, eyes spin to a blur, golden blast), wheel (spin-up +
  brake-disc heat), brandmark (sigil sear), carve (zig-zag slashes + pink blast).
- **Ring-view fixes** for the protected moments (atlas, forge, fallenlight, ledger, ossuary): the
  circle view only, with individual bursts. Their figure views are byte-identical.
- **Ascended:**
  - its wings moved from DOM onto the canvas (`AURA_ART.ophanim`);
  - its body canvas was restored to the standard box;
  - the ornate ring becomes a halo behind the head in body views.
- **Ninetail:** nine fire-fox tails in a tight upright bunch (variant C).
- **Nullpoint:** edge fix via `inward.fit`.

### Art in `public/aura/` (added in 7k)
- `foxtail.webp` (256×128, horizontal, pointing +X);
- `vendetta-skull.webp` (256², transparent mouth);
- `wheel-eye.webp` (256²);
- `ascended-ring.webp` (512², centered on the hole: inner radius 0.672, band 0.85, spikes 0.98 of the
  half-width).

### 7l (tooling)
- 8 named commands replace about 100 one-off scripts (95 retired; recoverable from `e9b03d5^`). They
  are documented in `docs/TESTING.md` and `AGENTS.md`.
- Harnesses use `playwright-core` with system Chrome (`CHROME_PATH` overrides it).
- The ember parity test proved the new `aura:diff` gives identical per-frame counts to the old one.
- **The 7k final perf table was wrong:** it forced moments only twice in 400 frames and timed the
  whole loop, so moment auras measured calm. Real numbers are higher. Atlas, Fallen Light and
  Nullpoint are over 0.6 but grandfathered. **Carve and Wyrm (revamped in 7k) are over the budget:
  trim them in the next aura phase.**

### Tools
- **Gallery:** run `npm.cmd run dev`, then open `http://localhost:5174/?auras=1`.
  - Views: 76 profile, 88 studio, 160 crate, inspect.
  - Features: Play moment, scoped editing, Copy spec, reduced motion, "Show shapes".
- **Named commands** (`npm.cmd run <name>`; each self-serves on ports 5180/5181 and writes to
  `evidence/<command>/<timestamp>/`, gitignored):
  - `check`: tests + eslint + madge;
  - `aura:diff` (`-- --only a,b`): the multi-size, multi-frame pixel diff vs the baseline;
  - `aura:perf` (`-- --only`, `-- --ab`);
  - `aura:stress` (`-- --set fixed|ledger|revamp`, `-- --ab`);
  - `aura:shots` (`-- --only`, `-- --strip a,b,c` for the look-alike strip);
  - `aura:flash`: Bonewright pixels + flashTimes;
  - `aura:contact`: a contact sheet of all auras;
  - `aura:baseline -- <ref>`: re-pins the baseline worktree.
- Measurement changes need a proposal first (`DECISIONS.md`).

### Asset workflow
1. Claude writes a very specific Gemini prompt:
   - ONLY the object, with a wide margin and nothing touching the edges;
   - a flat `#00B140` background;
   - **no green in the subject** (aquamarine gems failed; sapphire worked);
   - square, high resolution.
2. Brodan generates the image on his **PC** (phone downloads flatten to JPEG) and uploads it here.
3. Claude keys it with a colour-difference key, un-mixes the colour, and despills, with an extra fix
   for warm fringes on fire.
4. Claude exports a transparent WebP at the size and orientation Devin specifies. Ask Devin for draw
   sizes first; it sizes from the *old* design, so correct it when the design grows.
5. Brodan saves the file into `public/aura/`.

Gemini handles single objects well (tail, skull, eye, ring) and struggles with "a fragment of X".

### Git notes
- If `git push` is rejected: run `git fetch` and `git log --oneline main..origin/main`, inspect the
  commit, then `git pull --no-rebase --no-edit`. Merge, don't rebase, so the hashes in reports stay
  valid.
- Never force-push.
- The CRLF warnings on Windows are harmless.

## What's next

1. **Next aura phase: brightness pass + perf trims.**
   - Brighten the dim protected auras: Forge, Ironbound, Fallen Light and Standard-Bearer (Ledger
     and Nullpoint are dark by design). Brightness only, following the style guide.
   - Trim Carve and Wyrm under the budget without changing their look.
   - Rerun stress (all four dim auras are in the fixed set). Collect cross-day perf data to settle
     the provisional ratio budget.
2. (Tooling is done: 7l.)
3. **Aura Spin upgrade:**
   - 5× spins (cost 5) and 10× spins (cost 9);
   - show the **rarest** pull, not the last;
   - reveals scale with rarity;
   - full showcases for mythic, gilded and secret pulls, rendered through `AuraCanvas`;
   - a showcase is skippable only after that tier has been seen once; a secret always plays in full;
   - flash rules apply.
4. **Quick wins:**
   - "Reset my account" in Settings, as its own careful phase: it touches the save path, server rows
     and device copies in a specific order.
   - Extend `UndoToast` (currently only set deletion) to exercises, workouts and meals.
   - Verify aura anchors on a cousin's real account.
5. **Foundations 4:** trim Supabase, the biggest piece of the first download at 221 KB.

### Ideas Brodan liked, to introduce slowly
- **Top three:** an aura index with silhouettes and drop rates, global pull announcements, and a
  rank-up cutscene.
- **Aura mechanics:** aura levels, shiny variants, dupes adding stars, and moments playing on a PR.
- **Earned auras:** Phoenix (comebacks), Dawn/Moon (time-of-day workouts), Windrunner (GPS
  distance), and seasonal auras.
- **Aura designs:** Afterimage and Colossus.
- **Training:** a muscle heatmap, PR detection, a weekly recap card, a rest timer, and program
  templates.
- **Social:** rivals and friend challenges.
- **Safety:** sanity checks on logged lifts, which matter because Atlas unlocks from volume.

### Known minor items
- Replaying the tutorial may still write a weight entry through `logTutorialWeight`.
- A sustained 10 m/s GPS reading leaked about 30 m past the speed cap.
- The `rejects` counter only counts GPS jumps, not speed-cap rejections.
- Carve and Wyrm are over the per-aura budget (KNOWN_OVER); Cursed Ember (glassfire) is borderline.
- Pre-existing dead gallery controls:
  - Ledger's robeTop@figure and robeRise@ring are **visible** but do nothing;
  - Forge has hidden `moment.flash.*` fields that crash with a NaN colour;
  - other dead fields are hidden.
- Chrome's rasterization of rotated WebPs can differ between headless launches (a harness flake, not
  a code bug).
