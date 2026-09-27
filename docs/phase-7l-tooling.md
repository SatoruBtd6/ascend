# Phase 7l — Tooling

**Goal:** turn the pile of phase-named scripts into a small set of named commands that anyone
(Brodan, Devin, a future agent) can run without remembering flags, write `docs/TESTING.md` so every
kind of change has a known set of checks, and re-pin the baseline worktree to `v7k`.

**Nothing the user sees changes in this phase.** No app code, no art, no version bump.

Do one part at a time. Stop at every **STOP** and report.

---

## Key decisions (apply to every part)

1. **No app changes.** Nothing under `src/`, `public/`, `index.html` or `vite.config.*` is committed
   in this phase. Temporary edits for negative controls (Parts 2 and 3) are allowed only when the
   part says so, must stay uncommitted, and must be reverted before the part ends. At every STOP,
   paste the output of `git diff --stat v7k -- src public index.html vite.config.js` (it must be
   empty; adjust the vite config filename if it differs and say so).
2. **No `APP_VERSION` bump.** It stays `"7k.2"`. This phase ships nothing to users, and a bump would
   needlessly reset everyone's service-worker cache.
3. **Wrap, don't rewrite.** The measurement logic in the existing scripts is trusted only because of
   many fixes (multi-frame and multi-size diffs, a fresh page per aura, separate RNG streams, warm
   moment paths, frame-count flash budget, waiting for lazy images). You may change: argument
   parsing, defaults, file names, exit codes, header/summary lines, where evidence is written, and
   process cleanup. Anything that changes **how frames are captured, timed, compared, or which
   pages/sizes/frames are used** needs a written proposal first. Stop and wait.
4. **Windows first.** Brodan runs everything as `npm.cmd run <name>` in PowerShell. No bash-only
   syntax in `package.json` (no `VAR=value cmd`, no `rm -rf`, no single-quoted args). Any command
   with more than one step lives in a `.mjs` file that `package.json` calls.
5. **Every command reports like a check.** It prints each rule as `PASS` / `FAIL` / `WARN` with the
   measured number *and* the limit, prints where its evidence went, and exits non-zero if any rule
   fails.
6. **The rules don't change.** Limits come from `docs/DECISIONS.md` and `AGENTS.md`, exactly as
   written. Don't add tolerances, don't tighten limits, don't invent new rules. If a rule looks wrong,
   say so in the report; don't encode your own version.
7. **No new dependencies** without asking first. If you think one is needed, propose it, with its
   name and size.
8. **Old phase docs stay as written.** They are history, even where they mention old script names.
9. **Commit, never push.** Commit at the end of each part and report the hash. Brodan pushes and
   tags.
10. **Don't delete the old baseline worktree** (`C:\Users\rms76\ascend-7k-base`). Brodan removes it
    after the phase.

## Report format (every part)

- Report on **every lettered item separately**, in order, under its letter. If you skipped an item
  or couldn't finish it, say so under that letter. Never drop an item silently.
- Every number comes with what it measures and the exact command that produced it.
- Every PASS/FAIL claim comes with the output lines that show it.
- The commit hash, `git status` (must be clean), and the no-app-change diff from decision 1.

---

## Before Part 1 (Brodan)

- `v7k` is pushed and tagged, and `main` on GitHub is at `7f0c6ba` or later.
- This doc is committed in `docs/` (via git, not GitHub's upload button).
- Start a **fresh Devin chat**. Close the gallery tab while Devin measures.

---

## Part 1 — Inventory and proposal (read-only: change no files)

**A. Pre-flight.** Show:
- `git status` (clean);
- `git rev-parse v7k` (must be `7f0c6ba…`);
- `git fetch`, then `git rev-parse HEAD origin/main`;
- the current `APP_VERSION` value and the file it lives in.

**B. Baselines.** Run and report:
- `npm test`: test count (expected **218**). Also say whether `npm test` runs once or stays in
  watch mode, since `check` must run once and exit;
- `npx eslint src`: warning count (expected **5**), with rule and file for each;
- `npx madge --circular --extensions js,jsx,mjs src`: file count and cycles (expected **188 files,
  0 cycles**).

**C. Script inventory.** Every file in `scripts/`, including helper modules. First the total count,
with the command that counted it. Then one row per file:
- name;
- what it does, in one line;
- flags it accepts;
- what it outputs, and where;
- what references it (`package.json`, `AGENTS.md`, other scripts);
- other scripts it imports.

The number of rows must equal the file count.

**D. Current `package.json` scripts,** verbatim.

**E. Proposal per script:** keep as a named command / keep as a helper / retire.
- For **retire**: why it's safe (what replaces it, or what one-off job it did).
- For **keep**: its new generic name, with no phase numbers (e.g. `scripts/aura-diff.mjs`).

**F. Proposed command table:** name → what it runs → default arguments → pass/fail rules → exit
code → evidence folder. It must include these commands (Parts 2 and 3 describe each):

| Command | Job |
|---|---|
| `check` | tests + eslint + madge |
| `aura:baseline` | re-pin the baseline worktree to a tag or commit |
| `aura:diff` | the trusted multi-frame, multi-size pixel diff against the baseline |
| `aura:stress` | fixed set, Ledger-swap set, revamp set |
| `aura:perf` | per-aura 0.6 ms budget |
| `aura:shots` | evidence grid |
| `aura:flash` | Bonewright pixel-identical + identical `flashTimes` |

If `f-contact.mjs` is worth keeping, propose `aura:contact` too. If anything in this table doesn't
fit how the scripts actually work, say so.

**G. Edge check.** Does any existing script report the **largest object touching the canvas edge,
with its size in px**? Name the script and flag. If none does, say "none". Don't build one in this
phase; list it as a future item.

**H. Baseline mechanics.** How does the current diff find its baseline (hard-coded path, flag,
env)? What does the baseline worktree need to run (`node_modules`, a dev-server port, anything
else)?

**I. Aura count.** The number of auras the diff covers, and the number the gallery shows. Explain
any difference.

**J. Risks and questions.**

**STOP.** No commit in this part (nothing changed).

---

## Part 2 — `check`, the baseline, and `aura:diff`

**A. `npm.cmd run check`.**
- Runs, in this order:
  1. the tests, **once**, not in watch mode;
  2. `npx eslint src --max-warnings 5` (never `eslint .`);
  3. `npx madge --circular --extensions js,jsx,mjs src`.
- Runs all three even if an earlier one fails, so the report always shows all three.
- Ends with a summary: test count, warning count, madge file count and cycle count, each with
  PASS/FAIL.
- Exits non-zero if any of the three fails.

`--max-warnings 5` pins today's baseline: a new warning fails `check`, and fixing an old one still
passes.

**B. Negative controls for `check`.** Temporary and uncommitted. Show each one failing, then revert.
1. Add a test that fails.
2. Add one new eslint warning in a `src` file.
3. Add a circular import between two `src` files.

For each, paste the summary lines and the exit code. Then revert all three, show `git status` clean,
and show a green run with exit code 0.

**C. New baseline worktree.** Create `C:\Users\rms76\ascend-baseline` at tag `v7k`, detached
(`git worktree add --detach ..\ascend-baseline v7k`), and install its dependencies (`npm.cmd ci`
inside it). Paste `git worktree list`. Leave `ascend-7k-base` where it is.

**D. One place for the baseline path.** A single helper module that every aura command imports:
- the default is `..\ascend-baseline`, next to the repo;
- the `ASCEND_BASELINE` environment variable overrides it.

No other file may hard-code a baseline path.

**E. `npm.cmd run aura:baseline -- <tag-or-commit>`.**
- Re-pins the baseline worktree: a detached checkout, then `npm.cmd ci` **only if**
  `package-lock.json` changed.
- Refuses, and exits non-zero, if the worktree has local changes.
- Prints the commit before and after.

Prove it: pin to `da967d0`, then back to `v7k`, and paste both outputs.

**F. `npm.cmd run aura:diff`.** Wraps the trusted `aura-7j-full-diff.mjs --fresh` behaviour
unchanged (decision 3).
- **First lines of output:** baseline path, baseline commit (and tag, if any), current commit, and
  whether the working tree is dirty.
- `--only <id,id>` limits the run to those auras.
- `--expect <id,id>` names the auras that are *supposed* to change.
- **FAIL** if any aura **not** in `--expect` differs. This protects untouched auras.
- **FAIL** if any aura **in** `--expect` shows **zero** difference. That catches changes that had
  no visible effect.
- Per aura: the frames and sizes compared, the differing-pixel count, and the verdict.

**G. Proof: full run against `v7k`.** Nothing in `src` changed, so every aura must show **zero
differing pixels**. Report:
- the number of auras compared (must match item I of Part 1);
- the frames × sizes per aura;
- the exit code.

**H. Negative controls for `aura:diff`.** Temporary and uncommitted.
1. Change one colour in one revamped aura's steady look (tell me which aura and which field).
   `aura:diff` must flag **only** that aura, with its differing-pixel count, and exit non-zero. Rerun
   with `--expect <that id>`: exit 0.
2. Change something that is visible **only mid-moment** (for example a moment burst colour) in a
   different aura. It must be caught. This is the mid-run-frame bug that hid the rays and Black Sun
   problems before.
3. Run `--expect <an aura you did not change>`. It must FAIL with "expected change, none found".

Revert everything and show `git status` clean.

Commit. **STOP.**

---

## Part 3 — `aura:stress`, `aura:perf`, `aura:shots`, `aura:flash`

**A. `npm.cmd run aura:stress`.**
- Settings are baked in: board-32, circle mode, 4x CPU, moments forced.
- By default it runs all three sets:
  - **fixed:** `atlas forge fallenlight ossuary ironbound standardbearer ascended bonewright
    nullpoint inferno`;
  - **Ledger-swap**;
  - **revamp:** the 10 heaviest revamped auras. Each set's list lives in **one** place; tell me
    where, and list the revamp set's ids in the report.
- `--set fixed|ledger|revamp` runs just one set.
- Per set: the number of runs and the median p95.
- Rules:
  - **FAIL** if any set's p95 median is **16 ms or more**;
  - **WARN** if the fixed-set median is over **12 ms** (a target, not a rule).

**B. `aura:stress -- --ab`.** Runs the baseline worktree (A) and the current tree (B) **alternating
in one session**: A B A B A B. It reports both medians and the difference. This is the only
trustworthy way to attribute a change, because numbers drift up to ±3 ms between sessions.
- If this is pure orchestration of the existing stress script, build it.
- If it needs changes to the harness itself, write the plan under this letter instead and **don't
  build it**. I'll decide.

**C. `npm.cmd run aura:perf`.**
- The per-aura budget: quiet `--perf`, 400 frames, moments forced, board-32, 4x CPU, median of 3.
- **FAIL** if any aura's average loop time is **over 0.6 ms**.
- p95 is printed as information only, never as a rule.
- Supports `--only <id,id>`.
- Note: Cursed Ember (glassfire) sits right at the line. Report its number as it is; don't add a
  tolerance.

**D. `npm.cmd run aura:shots`.**
- The evidence grid; supports `--only <id,id>`.
- Say how it makes sure lazy images have loaded before each screenshot.
- Say whether it can produce the look-alike strip (an aura next to its closest look-alikes). If it
  can't, say so; don't build it now.

**E. `npm.cmd run aura:flash`.** Bonewright must be pixel-identical to the baseline with identical
`flashTimes` (today's `aura-7j-flashtimes.mjs`). **FAIL** on any difference.

**F. Cleanup.** Every aura command closes the browser and any server it started, including when it
fails or is stopped with Ctrl+C.
- Evidence: node and Chrome process counts before a run, during it, and after stopping it with
  Ctrl+C partway through. The "after" count must match "before".

**G. Same code, same numbers.** For `aura:stress` (fixed set) and `aura:perf --only forge,inferno`,
run the **old script and the new command alternating in one session** (old, new, old, new, old,
new). Report both medians. They run the same code, so the numbers must match within noise.

**H. Evidence folders.**
- Each command writes to `evidence/<command>/<date-time>/` and prints that path at the end.
- `evidence/` stays gitignored. Show `git check-ignore -v evidence/x`.

Commit. **STOP.**

---

## Part 4 — Retire old scripts, update `AGENTS.md`, write `docs/TESTING.md`

Only the retirements and names I approved after Part 1.

**A. Renames.** Rename the kept scripts to their approved names with `git mv`, in a
**rename-only commit** (no content changes in that commit), so git history follows the files. Fix
the imports and `package.json` paths in a second commit.

**B. Retirements.** `git rm` the scripts approved for retirement. For each one, list the last
commit that contained it, so it can be recovered later with `git show <hash>:scripts/<name>`.

**C. No stale references.** Search the repo for every old script name, excluding old phase docs in
`docs/` and `evidence/`. Paste the search command and its result: **zero hits**. Separately, list
the old phase docs that mention old names; they are left as they are.

**D. `AGENTS.md`.** Replace the scripts list with the named-command table and a pointer to
`docs/TESTING.md`. **Nothing else in `AGENTS.md` changes.** Paste the full diff of `AGENTS.md`.

**E. `docs/TESTING.md`.** Write it with these sections, in this order:

1. **Quick start for Brodan**, in plain words: before every push, run `npm.cmd run check`. Say what
   a green run looks like, and what to do if it's red (paste the output to the agent, don't push).
2. **The commands:** the table from Part 1 F, as built, with each command's rules and limits.
3. **What to run for which change.** One row per kind of change:
   - **docs only:** `check` is optional;
   - **any code change:** `check`;
   - **one aura's look or moment:** `check`; `aura:diff --expect <id>`; `aura:perf --only <id>`;
     `aura:shots --only <id>` plus a strip against its closest look-alikes; the edge check from
     Part 1 G (or "manual: report the largest object touching the edge, with its size; only
     sparks of 3 px or less may touch");
   - **a batch of auras:** everything above, plus `aura:stress` (all three sets);
   - **shared aura code** (the renderer, `AuraCanvas`, shapes, the fits, `noteStrikeFlash`):
     a full `aura:diff` with an explicit `--expect`, `aura:stress -- --ab`, `aura:perf` for every
     aura, and `aura:flash`;
   - **anything that flashes:** `aura:flash`, plus how the flash rule is proven: every flash goes
     through `noteStrikeFlash`, at most 3 per second page-wide, none under reduced motion. If no
     tool proves this, say which parts are manual gallery checks. Don't invent a tool;
   - **the protected moments** (atlas, forge, fallenlight, ledger, ossuary): figure views must stay
     byte-identical, proven with `aura:diff`;
   - **app code outside auras** (screens, logging, settings): `check`, plus a click-through list
     the agent writes for that change;
   - **the save path, Supabase or account data:** `check`, plus a written test plan in the phase
     doc, run on a test account, never a cousin's;
   - **releases:** `APP_VERSION` is bumped only in the final part of a phase, and the SW cache name
     is `ascend-v{APP_VERSION}`;
   - **tooling:** `check`, a full `aura:diff` at zero, and a negative control proving the tool still
     catches changes.
4. **Why numbers lie** (measurement rules):
   - run old and new alternating in one session, never across sessions;
   - stress drifts ±3 ms between sessions;
   - use medians of 3;
   - close the gallery tab while measuring; restart the PC if orphaned node/Chrome processes pile
     up;
   - p95 is information only for the per-aura budget;
   - lit% saturates on the glow disc (about 63% at glow 0.75+); use glow-disabled lit% to compare
     tiers;
   - anything outside the canvas is invisible to the diff and perf tools;
   - the gallery doesn't mount `App`, so anything defined only in `App.jsx` won't run there;
   - `/avatars/E.webp` is a full-body photo clipped to a circle; use an opaque square photo when it
     matters;
   - press Ctrl + Shift + R if the gallery looks wrong right after a change;
   - ask for proof that the visible result changed, not just that a value changed.
5. **Current baselines,** with the date and commit they were measured at:
   - tests 218;
   - eslint 5;
   - madge 188 files, 0 cycles;
   - stress p95 medians: fixed, Ledger and revamp.

   Baselines are updated only in the final part of a phase, with the new numbers in that report.
6. **Re-pinning the baseline:** at the start of any phase that changes auras, pin to the last
   release tag with `npm.cmd run aura:baseline -- <tag>`.

**F. `docs/DECISIONS.md`.** Append exactly one entry, saying that the named commands in
`docs/TESTING.md` are the supported way to run checks, and that changes to measurement logic need a
proposal first. Paste the exact text. Nothing else in that file changes.

Commit(s). **STOP.**

---

## Part 5 — Final verification

**A. Clean run of every command,** in a fresh terminal. Report each result:
- `check`;
- a full `aura:diff` (zero differing pixels everywhere, exit 0);
- `aura:flash`;
- `aura:perf` for all auras (list any within 0.05 ms of the limit);
- `aura:stress` for all three sets. Compare against the end of 7k: fixed **11.0**, Ledger
  **11.3**, revamp **12.0** ms. A ±3 ms session drift is expected, and nothing in `src` changed.

**B. No app changes.** `git diff --stat v7k -- src public index.html vite.config.js` is empty, and
`APP_VERSION` is still `"7k.2"`.

**C. The phase's commits:** `git log --oneline v7k..HEAD`.

**D. Everything that changed:** `git diff --stat v7k`. Expect only `scripts/`, `package.json`,
`docs/` and `AGENTS.md` (and `.gitignore` if it had to change; say why). Confirm
`package-lock.json` is unchanged.

**E. Old worktree.** Search for `ascend-7k-base`: nothing may still reference it. Give Brodan the
exact command to remove it.

**STOP.** Brodan pushes and tags.

---

## After the phase (Brodan)

1. `git push`
2. `git tag v7l <final hash>`, then `git push origin v7l`
3. Remove the old worktree with the command from Part 5 E.

## Checklist

- [ ] Part 1: inventory, proposal and command table, approved
- [ ] Part 2: `check` and its negative controls; new baseline worktree; `aura:baseline`;
      `aura:diff` at zero; its three negative controls caught
- [ ] Part 3: `aura:stress` (with or without `--ab`), `aura:perf`, `aura:shots`, `aura:flash`;
      cleanup proven; old and new give the same numbers in one session
- [ ] Part 4: renames (rename-only commit), retirements with recovery hashes, zero stale
      references, `AGENTS.md` diff limited to the scripts section, `TESTING.md`, one
      `DECISIONS.md` entry
- [ ] Part 5: every command green; no app changes; `APP_VERSION` still 7k.2; lockfile unchanged
- [ ] Brodan: push, tag `v7l`, remove the old worktree

## Approved after Part 1

D1. Mapping approved.
- Commands: aura-7j-full-diff → aura-diff.mjs (aura:diff); aura-7h-stress → aura-stress.mjs (aura:stress); aura-7k-revamp-shots → aura-shots.mjs (aura:shots + aura:perf); aura-7j-flashtimes → aura-flash.mjs (aura:flash); new aura-baseline.mjs; new check.mjs.
- Helpers, also renamed with no phase numbers: aura-7k-ladder-current → aura-ladder.mjs; aura-7k-spec-probe → aura-spec-probe.mjs; aura-7i-asset-check → aura-asset-check.mjs; aura-7i-gallery-effects → gallery-effects.mjs; diag-harness stays.
- aura-7k-audit becomes aura:contact if item K confirms it makes an all-aura contact sheet.
- Everything else retires, per the exact list from item I.

D2. Pass rules are the documented rules only.
- check: FAIL on any failing test (the count is printed, not a rule, because it grows); eslint src --max-warnings 5; FAIL on any madge cycle (the file count is printed, not a rule). check runs `npm test` itself, so the test list stays in one place.
- aura:shots: the edge alpha scan is printed as INFO, never PASS/FAIL. The edge rule exempts sparks of 3 px or less, and an alpha sum can't tell a spark from a clipped object.
- aura:perf: FAIL if avg > 0.6 ms; p95 is info only.
- aura:stress: FAIL if p95 >= 16 ms in any set; WARN if the fixed-set median is over 12 ms.
- aura:diff and aura:flash: as written in Part 2 F and Part 3 E.

D3. aura:perf uses aura-shots' --perf --moment path. aura-7k-perf.mjs retires. If --perf already skips image work, don't add --no-shots. If it doesn't, --no-shots is allowed, but prove the numbers are the same with and without it, alternating in one session.

D4. Every aura command starts its own vite servers: the current tree on port 5180, the baseline worktree on 5181. Never use 5174 (Brodan's gallery). If a port is busy, stop with an error naming the process using it. Don't pick another port.

D5. ASCEND_BASELINE is the baseline worktree path, and only that. ASCEND_BASE keeps its current meaning in diag-harness (a URL). Don't reuse either name for anything else.

D6. aura:flash runs the flashTimes capture on both servers and compares the JSON. The Bonewright pixel check reuses aura-diff with --only bonewright. Nothing writes into src/ at runtime (drop the p3b temp-file approach).

D7. Approved exception to "no new dependencies": add the Playwright package that resolves today as a devDependency, pinned to that exact version. The %TEMP% copy can be wiped by Windows cleanup. Installing it must not download browsers. Part 5 D changes to: package-lock.json changes only for this.

D8. aura-ladder.mjs reads its aura ids from the catalog and its server from the shared helper, instead of the hardcoded 32 ids and port 5174 (do this in Part 4 with the renames).

D9. The committed old evidence (574 files) stays untouched this phase. It's a future item.
