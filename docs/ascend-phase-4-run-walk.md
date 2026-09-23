# Ascend — Phase 4: Run/walk segments

**Target version: `7c`** (SW cache `ascend-v7c`).

Let a user switch between running and walking during a single session, with pace and XP computed
separately per segment. Plus one small fix carried over from 7b.

Locate code by name: `newRun`, `addFix`, `withSplits`, `runElapsed`, `currentPace`, `RUN_LIMITS`,
the live-run component's `save`, `RunHub`, the run detail sheet, `xpFromRecords`.

## Environment reminders

- Workspace `C:\Users\rms76\ascend`, Windows, `npm.cmd` / `npx.cmd`, real build needs the `VITE_`
  env keys, eslint baseline 5, **no Git**, never hand over `dist/`.
- Localhost: sign in only with `TEST_EMAIL` / `TEST_PASSWORD` from `.env.local` (chud). chud stays
  `test: true`, `lb: false`, no crew, no boss damage.
- Don't undo: Phase 1 memoisation, error boundaries, 6z offline/boot/SW precache, the 7b save and
  input fixes, the diagnostic log. Run the 7b harness before handover and confirm it still passes.

---

## 0. Carry-over: Settings state size shows 0 KB

On 7b the Settings diagnostic line reads `State 0 KB` even after an acknowledged save — the 7b save
refactor removed its data source. Show the current state size from the moment the app loads (not
only after the first save of a session), and update it on every acknowledged save. Keep "last save
… ms" working too.

---

## 1. How runs work today

- `newRun(mode)` fixes `mode` (`"run"` or `"walk"`) for the whole session, chosen on the start
  sheet.
- `addFix` reads `RUN_LIMITS[r.mode].max` — **7.5 m/s for run, 3.2 m/s for walk** — to reject GPS
  teleports and to decide whether a screen-off gap can be bridged.
- `save` writes one exercise, `Running` or `Walking`, with one set `{ w: miles, r: minutes }`.
  XP comes from `workoutXp` as a timed exercise: **Running 6 XP/min, Walking 3 XP/min**. Miles on the
  set feed achievements and boss damage.
- `runInfo.mode` is read in several places: the workout title, `gainXp` label, feed text, the
  `RunHub` history icon, the run detail sheet, the share receipt, and `xpFromRecords`' label.

## 2. Segments

Add `segments` to the run state: `[{ mode, start, pausedTotal, dist, splits? }]`, one open segment
at a time. `r.mode` always equals the current segment's mode, so existing readers keep working
during the session.

- **Switching** closes the current segment at the current elapsed time and opens a new one. A
  segment shorter than ~5 seconds is merged into its neighbour (accidental double-tap).
- **Distance:** every metre `addFix` adds is attributed to the open segment, including bridged
  screen-off gaps.
- **Time:** each segment's duration excludes paused time; pausing and resuming stays within the
  current segment.
- **Limits:** `addFix` uses the current segment's `RUN_LIMITS`. For ~30 seconds after a switch, and
  for any screen-off gap that spans a switch, use the **higher** of the two limits — otherwise a legit
  running stretch right after switching from walk (3.2 m/s cap) would have its distance rejected.
- **Recovery:** the unfinished-run save (`saveLive`) and resume must persist and restore segments
  exactly.

## 3. Live screen

- A large, easy-to-hit **Walking ⇄ Running** segmented control on the live run screen (at least
  ~48 px tall — it gets tapped mid-stride), with `touch-action: manipulation`.
- On switch: a short sound, and if voice cues are on, a brief spoken cue ("Walking" / "Running").
- Show the current segment's pace and elapsed time alongside the session totals. Mile splits stay
  session-wide, as today.
- The start sheet still chooses the starting mode.

## 4. Saving

On save, group segments by mode and write **one exercise per mode used** into the same workout:

- `Running` with `{ w: runMiles, r: runMinutes }` and/or `Walking` with
  `{ w: walkMiles, r: walkMinutes }`, rounded as today. Omit a mode with under ~0.1 minute.
- XP is still `workoutXp` over those exercises — so each segment earns its own mode's rate, and
  miles still feed achievements and boss damage. **No change to the XP formula itself.**
- **Slow-run guard:** a `run` segment whose average speed is below **4.0 mph (15:00 /mi)** is saved
  as walking, since a jog is faster than that. Otherwise toggling "Running" while walking would
  double the XP. Tell the user on the summary screen when this happens ("0.4 mi logged as walking —
  pace was below jogging speed").
- `runInfo` keeps `mode` for compatibility — `"run"` if any running was saved, else `"walk"` — and
  adds `segments: [{ mode, secs, miles, pace }]`, `runMiles`, `walkMiles`.
- Title, `gainXp` label and feed text: "Run", "Walk", or "Run/Walk" when both were saved, e.g.
  "ran 2.1 mi, walked 0.6 mi".

## 5. History and detail views

- Run detail sheet: per-mode breakdown ("Run 2.1 mi · 9:30 /mi — Walk 0.6 mi · 17:10 /mi") and the
  segment sequence as a simple timeline bar. Old runs without `segments` render exactly as before.
- `RunHub` history icon and share receipt handle "Run/Walk".
- `xpFromRecords`' label uses the same Run / Walk / Run/Walk wording.

## 6. Dev-only GPS simulator

Add `?simrun=1`, gated on `import.meta.env.DEV` and dead-code-eliminated from production, that
feeds synthetic GPS fixes into the live run at a chosen speed with realistic accuracy noise, with
controls to change speed, pause, and simulate a screen-off gap. Persistence stays normal on chud so
a simulated run can be saved and inspected. It must never be reachable in production.

---

## Verification checklist

1. eslint baseline (5); real build; all unit tests pass; the 7b tap/input harness still passes.
2. Unit tests on `addFix`/segments with synthetic tracks:
   - 5 min walk at 1.4 m/s → 10 min run at 3.0 m/s → 5 min walk: three segments, correct
     per-mode miles and minutes; XP = 10 × 6 + 10 × 3 = 90.
   - Running at 3.0 m/s immediately after a switch from walk is **not** rejected.
   - A screen-off gap spanning a switch is bridged using the higher limit.
   - Pause inside a segment excludes the paused time from that segment only.
   - A sub-5-second segment merges into its neighbour.
   - A run segment averaging 3.5 mph is saved as walking and flagged on the summary.
   - Resume after an unfinished run restores segments exactly.
   - An old single-mode run saves and displays exactly as before.
3. Simulator on chud: a walk → run → walk session saved; workout shows two exercises; detail sheet
   shows the breakdown and timeline; history icon and receipt read "Run/Walk".
4. Settings shows the real state size on load and after a save.
5. New live controls and detail sheet in dark, light, zesty and custom, at ~380 px.
6. chud rules hold; `APP_VERSION` is `7c`, SW cache `ascend-v7c`.

Hand over the files with their folders (never `dist/`) and stop.
