# Ascend — handoff (Sept 2026, end of the 6v→7c chat)

Carry this into a new chat. It supersedes the Sept 20 handoff. Current as of the end of that chat.

## ⏳ Right now

**Cursor is mid-update on Phase 4 (run/walk segments, target `7c`).** The prompt
(`ascend-phase-4-run-walk.md`) was sent and **we're waiting on Cursor's report.** When it arrives,
review it against that doc's verification checklist before approving the upload.

Also pending:
- The cousin still needs to confirm **7b** in Settings and test Fuel's servings box (type a number,
  delete it fully — no stray 0).
- Not yet confirmed: the steps Shortcut returning ok after midnight (fixed in 6z.1), and whether the
  owner tagged gyms (Gold's before 2026-09-16, 24 Hour Fitness after, current = 24 Hour) and ran the
  duplicate-exercise cleanup on his main account.
- Not yet confirmed: the **public-repo security scan** — `.gitignore` lists `.env.local`/`.env*`,
  `dist`, `node_modules`; `SETUP.md` and `supabase.sql` contain no `service_role`, `sk-` or
  non-anon `eyJ…` keys. A leaked service-role or Claude key must be rotated (it stays in Git
  history).

## Who / what

Brodan (Austin, TX). **Ascend** is a leveling-style gym tracker shared with his cousins, prepping for
wider release. Live at `https://www.ascendfit.site` (same build as `ascend-ascend-6af9.vercel.app`).
Owner's main account state is ~59 KB; test account **chud** ~13 KB.

## Stack

React 18 + Vite + Tailwind + lucide-react. Almost everything in `src/App.jsx` (~10,500 lines).
Also `Auth.jsx`, `Boot.jsx` (new, boot/retry screen), `shims.js` (offline `window.storage` over
Supabase `kv`, Claude proxy), `supabase.js`, `main.jsx`, `index.css`, `math.js` (merge, normalizer,
PR rule, recount, floor), `math.test.mjs`, `diag.js` + `diag.test.mjs`, `devBigFixture.js` (dev
only), `eslint.config.js`, `vite.config.js` (precache plugin, ignores `dist/`), `public/sw.js`,
`scripts/diag-harness.mjs`, `tests/steps.test.mjs`. `/api`: `claude.js`, `support.js`, `steps.js`,
`route.js` — **only functions go in `api/`; every `.js`/`.mjs` there becomes a Vercel endpoint.**
Supabase: `kv(scope,key,value,updated_at,owner)` + RLS; `xp_logs` + `xp_replace`/`xp_summary`;
`step_tokens`, `ingest_steps_v2()`. Whole user state in one private key `ascend-state`.

## Development and deploy

- Windows, `C:\Users\rms76\ascend`. **`npm.cmd` / `npx.cmd`** (PowerShell blocks `npm`).
- `.env.local`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `TEST_EMAIL`, `TEST_PASSWORD`.
  Without the Vite vars the build falsely passes at ~148 KB; a real build is ~1,075 kB.
- **No Git installed.** Recommended as the first foundations item (see roadmap).
- Deploy: GitHub web UI upload to public repo `SatoruBtd6/ascend`, commit to main. Cursor now hands
  over **whole-project zips** — unzip and drag the *contents* into Add file → Upload files.
  **Never upload `dist/`.** Vercel fallback: Deployments → Create Deployment → main.
- Every release bumps **both** `APP_VERSION` and the SW cache name (`ascend-v<version>`) — phones
  won't fetch new code otherwise.
- Baselines: eslint **5** unused-var warnings; ~96 unit tests passing.

## Working agreement

- Ask clarifying questions before big changes. Prompts to Cursor are written documents, one phase
  at a time, with explicit verification checklists; Cursor stops and reports between parts.
- Say exactly which folder each file goes in; remind to clear old downloads.
- **Review Cursor's reports critically** — this chat caught several real problems in "passing"
  reports (see lessons below).
- **IP rule**: no character names, series names or copied art from real anime/manga anywhere.
  Auras are original designs in an anime idiom.

## Test-account and Cursor rules

- On localhost Cursor signs in **only** with `TEST_EMAIL`/`TEST_PASSWORD` (chud). The sign-in page
  once had the owner's real email pre-filled — never use it; dev talks to the real database.
- chud: `test: true`, `lb: false`, no crew, no real boss damage. Ghost toggle is behind a tester
  password. Restoring a backup on chud resets its name/settings (expected).
- **Test at phone speed**: Chrome device emulation, touch on, CPU throttle 4× and 6×. Desktop-speed
  tests missed every tap/input bug. `scripts/diag-harness.mjs` is the permanent tap/input harness —
  run it before every handover.
- Dev-only tools: `?fixture=big` (588 KB synthetic account, persistence off — too slow to boot at 6×,
  don't use it in the pass harness), `?simrun=1` GPS simulator (arriving in Phase 4).
- **On-device diagnostics**: Settings → tap the version line 5 times → Copy diagnostic log. No
  content, only event types/timings. Ask users for a log whenever a bug is reported.

## What shipped this chat

| Version | What |
|---|---|
| 6v | Train black screen: merge treated `null` as `{}` and rebuilt `active` without `exercises`. `normalizeState` (additive), `TabErrorBoundary` per tab, crate reveal black square (CSS containing block, not the aura canvas). |
| 6w | Lag + save holes: reference-based change detection, `active` urgent only on structural changes, memoised bests, Fuel search indexed (1 s → 10 ms/keystroke), sync `ascend-pending` safety copy, shims never silently drop queued ops. Settings diagnostic line. |
| 6x | Ghost crate sandbox (free opens, real roll code, never touches real crate/XP), pre-update backup + restore, exercise dedupe (`exKey`, approval UI, merge rewrites all name fields incl. `rankSnap`/`rankHist`), legacy assisted sets (before 2026-09-20) excluded from comparisons, per-gym history (`gyms`, `currentGym`, `gymSpecific`; Machine/Cable auto, ranks use current gym), silent `rankSnap` refresh so merges/gym changes never fake a rank-up. |
| 6y | New PR rule (weight PR + rep PR, each once per exercise per workout, history frozen at workout start; first-ever exercise = 1 PR). Retroactive recount for all accounts: only PR bonus swapped, set XP untouched, level floor stored as its own `floor_v3` record, achievements add-only. `XP_VERSION` 3. |
| 6z | Board: own row from live local state, card publish retries + publishes on load, 30 s refresh while open, `xpV` "not updated yet" marker. Settings and pending keys scoped per user. **Wipe bug** (failed read treated as a new account → default blob written over the server row): hydrate is read-only with a retry screen until a real read, no raw writes without a successful read, tripwire (only when the server has ≥3 workouts or ≥500 XP). Production SW kept on 6y's `skipWaiting`/`clients.claim`; DEV has no SW. |
| 6z.1 | Local copy stamped after a successful read (verified copy), visible "Couldn't load" + Retry, `/api/steps` treats empty steps as "no steps yet" (not 0). |
| 6z.2 | SW precaches hashed build assets at install (Vite plugin writes `dist/sw.js`; `public/sw.js` has `PRECACHE = []`; precache failure never blocks install). Inline 5 s boot watchdog in `index.html`. |
| 7a | Train declutter: set-number chip cycles W/D, one Add set + caret, merged target chips, collapsed past sessions, header ⋯ menu, compact footer, one-time hint, 40 px targets. |
| 7a.1 | Diagnostic log + throttled harness (diagnostics only). |
| 7b | Root-cause fixes: snapshot = exactly the acknowledged payload (persist no longer reverts checks/quantities), merge only when server rev is newer, numeric inputs are `type="text"` + `inputMode` with local string state (no forced 0), inline components hoisted, `touch-action: manipulation`, rest timer isolated in `RestDock`, crash-safe workouts (sync pending write per structural change + 3 s server debounce). Harness 100/100 taps, zero character errors. |

Known cosmetic bug: Settings shows `State 0 KB` on 7b — fixed as step 0 of Phase 4.

## Key behaviours to preserve

- Save path: three-way merge against the acknowledged snapshot; `ascend-pending:{userId}` written
  synchronously on hide, at persist start and on structural workout changes; verified local copy
  stamped with user id + server `rev`; tripwire; read-only hydrate on failed reads; `noQueue` for
  `ascend-state`.
- Offline launch works from a verified copy. On iPhone the home-screen app and Safari have
  separate storage — each needs one online open.
- Aura renderer: declarative specs + `AURA_ART` silhouettes, one canvas pair and one rAF loop,
  `over` pass on a second canvas above the photo, `auraImage` lazy cache. Nothing inside r = 1.05
  except deliberate `over` elements. Assets in `public/aura/` (WebP + PNG on purpose; generated art
  must be requested on solid green, never a transparency checkerboard).
- Anime Crate weights in `ANIME_CRATE_WEIGHTS` (`math.js`), pity every 40, Secret rolled first.

## Phase docs from this chat

`ascend-phase-0-hotfix.md`, `ascend-phase-1-lag-and-saves.md`, `ascend-phase-2-data-integrity.md`,
`ascend-phase-3.md`, `ascend-deep-debug-taps-inputs.md`, `ascend-phase-4-run-walk.md` (in
progress), `ascend-phase-5.md` (ready).

## Phase 4 — in progress (`7c`)

Run/walk segments: live Walking ⇄ Running toggle, per-segment pace, one Running and one Walking
exercise per session (XP 6/min run, 3/min walk — formula unchanged), higher GPS speed limit for
30 s after a switch, **slow-run guard** (running slower than 15:00/mi saved as walking, shown on
the summary — owner kept it), Run/Walk labels, detail-sheet timeline, dev GPS simulator, plus the
`State 0 KB` fix. Only the owner can do the real outdoor test.

## Phase 5 — written, not sent (`7d` / `7e`)

- **Part A — workout credit** replaces raw workout counts: lifting 30 min ≈ 0.8, 60 min = 1.0,
  2 h = 1.25 cap (effective minutes capped at 5 per working set); runs `min/60`, walks `min/120`,
  capped 0.75 per session. Weekly/monthly workout quests, board count, "Show Up" and new duels use
  credit. **Any session, however small (including a short walk), keeps a streak day.** New fixed
  weekly quest: 90 cardio minutes. Nothing earned is revoked.
- **Part B — Phase C auras**: Bonewright (yellow lightning via `bolts`, capped full-frame flash
  ≤ 3/s and off under reduced motion, green eyes in the `over` pass tied to strikes) and Brandmark
  (`brand.png` sigil replacing the red dot with its heartbeat, `cape.webp` behind, mirrored
  `pauldron.webp` in the `over` pass). **Open question:** does the owner still have the original
  Phase C document? If so, attach it with Phase 5.

## Roadmap (owner approved all of it)

Recommended order: **finish Phase 4 → foundations → Phase 5 → quick wins → bigger features.**
Foundations first because every later phase gets safer and faster with them. Phase 5's doc locates
code by name, so it stays valid after a module split.

**Foundations**
1. **Git for Windows** + local repo; snapshot before every phase so a bad edit is a one-command undo.
2. **Split `App.jsx` into modules** (tabs, save/sync, auras, quests, math) — the single 10k-line file
   is why fixes kept touching unrelated code.
3. **Code splitting** — lazy-load Fuel, Board, aura art, maps; first launch currently downloads
   ~1 MB+ before rendering.
4. Large-account boot performance (hydrate + normaliser + stringify) — not urgent; real accounts are
   ~10× smaller than where it bites.

**Quick wins**
5. **Automatic crash reports** — `TabErrorBoundary` and global errors post details (version, stack,
   no personal content) to a Supabase table.
6. **Undo toasts** for deleting a set, exercise, workout or meal.
7. **Kudos on feed posts** — thumbs up plus an emoji picker, with counts.
8. **Crew invite links.**

**Bigger features**
9. **Push notifications** (web push for home-screen apps): rest timer done with the screen off, raid
   ready-up, a crewmate beating your PR or overtaking you in a duel, quest about to expire. Keep them
   restrained — no nagging.
10. **Training plans** — choose a split; "today is Pull day" with targets prefilled from the existing
    suggestion logic.
11. **Weekly recap card** every Monday — credit, PRs, rank changes, shareable (covers the old
    "monthly recap" idea).
12. **User backups** — "Download my data" plus the last four weekly server snapshots kept
    automatically.

**Still on the original list:** e1RM/PR charts, kg support, deload reminder, Health/Strava import,
what's-new popup, AI usage cap, anti-cheat (sanity limits on logged weights), report/block,
delete account, leaderboard batch loading. (Error boundary, rest timer and plate calculator
already exist; raid rework and check-in flicker are done.)

Engagement principle agreed: make it sticky through real rewards — visible progress, friends
noticing, surprises like crates — not punishment (no shaming streaks, no nagging notifications).

## Lessons from this chat

- Scrutinise "passing" reports: this chat caught an unexplained blank-state overwrite, an
  unverified production SW behaviour change, a test file placed in `api/`, a precache list that
  could have blocked all updates, a crash-unsafe save deferral, and a handover that silently skipped
  requested work.
- Ask for the cause of anything odd before approving — "restored from backup and moved on" hid a
  data-wipe bug that already existed in production.
- Desktop tests hide phone bugs; diagnostics logs from real devices beat guessing.
