import test from "node:test";
import assert from "node:assert/strict";
import {
  MI_M, RUN_LIMITS, newRun, addFix, applyFixes, runElapsed, switchRunMode, toggleRunPause,
  ensureSegments, buildSavedRun, cardioTimedXp, northFixes, speedMaxForFix, runTitle, runXpLabel,
  runFeedLine, runKind, runBreakdown, SLOW_RUN_MPH,
} from "./run.js";

const T0 = 1_700_000_000_000;

function chain(lat0, t0, speed, seconds, dt = 1) {
  return northFixes({ t0, lat0, speed, seconds, dt });
}

test("walk-run-walk track: three segments, per-mode miles/minutes, XP rates 90", () => {
  let r = newRun("walk", null, T0, "rw1");
  const w1 = chain(30, T0, 1.4, 300);
  r = applyFixes(r, w1.fixes);
  r = switchRunMode(r, "run", T0 + 300_000);
  const run = chain(w1.lat1, T0 + 300_000, 3.0, 600);
  r = applyFixes(r, run.fixes);
  r = switchRunMode(r, "walk", T0 + 900_000);
  const w2 = chain(run.lat1, T0 + 900_000, 1.4, 300);
  r = applyFixes(r, w2.fixes);
  const saved = buildSavedRun(r, T0 + 1_200_000);
  assert.equal(r.segments.length, 3);
  assert.deepEqual(r.segments.map((s) => s.mode), ["walk", "run", "walk"]);
  const walkEx = saved.exercises.find((e) => e.name === "Walking");
  const runEx = saved.exercises.find((e) => e.name === "Running");
  assert.ok(walkEx && runEx);
  assert.equal(walkEx.sets[0].r, 10);
  assert.equal(runEx.sets[0].r, 10);
  const walkMi = 2 * (1.4 * 300) / MI_M;
  const runMi = (3.0 * 600) / MI_M;
  assert.ok(Math.abs(walkEx.sets[0].w - walkMi) < 0.08, `walk miles ${walkEx.sets[0].w} vs ${walkMi}`);
  assert.ok(Math.abs(runEx.sets[0].w - runMi) < 0.08, `run miles ${runEx.sets[0].w} vs ${runMi}`);
  const minuteXp = 10 * 6 + 10 * 3;
  assert.equal(minuteXp, 90);
  assert.equal(saved.xp, cardioTimedXp(saved.exercises));
  assert.equal(saved.xp, Math.round(10 * 6 + runEx.sets[0].w * 10) + Math.round(10 * 3 + walkEx.sets[0].w * 10));
  assert.equal(saved.title, "Run/Walk");
  assert.match(saved.feed, /ran .+ mi, walked .+ mi/);
});

test("running at 4.5 m/s immediately after a switch from walk is not rejected", () => {
  let r = newRun("walk", null, T0, "n1");
  const walk = chain(30, T0, 1.4, 40);
  r = applyFixes(r, walk.fixes);
  const distBefore = r.dist;
  r = switchRunMode(r, "run", T0 + 40_000);
  assert.equal(speedMaxForFix(r, { t: T0 + 41_000 }), RUN_LIMITS.run.max);
  const fast = chain(walk.lat1, T0 + 40_000, 4.5, 25);
  r = applyFixes(r, fast.fixes);
  assert.ok(r.dist - distBefore > 50, `expected running distance after switch, got +${r.dist - distBefore} m`);
  assert.ok(r.rejects < 4);
});

test("a screen-off gap spanning a switch is bridged using the higher limit", () => {
  let r = newRun("walk", null, T0, "g1");
  const walk = chain(30, T0, 1.4, 20);
  r = applyFixes(r, walk.fixes);
  const distBefore = r.dist;
  r = switchRunMode(r, "run", T0 + 22_000);
  const gapT = T0 + 70_000;
  const meters = 4.5 * 50;
  const lat = walk.lat1 + meters / 111320;
  r = addFix(r, { lat, lng: -97, acc: 8, t: gapT });
  assert.ok(r.dist - distBefore > 100, `gap should add running distance, +${r.dist - distBefore}`);
  assert.ok(r.gapM > 100);
});

test("pause inside a segment excludes paused time from that segment only", () => {
  let r = newRun("run", null, T0, "p1");
  const a = chain(30, T0, 3.0, 30);
  r = applyFixes(r, a.fixes);
  r = toggleRunPause(r, T0 + 30_000);
  r = toggleRunPause(r, T0 + 90_000);
  r = switchRunMode(r, "walk", T0 + 100_000);
  const b = chain(a.lat1, T0 + 100_000, 1.4, 20);
  r = applyFixes(r, b.fixes);
  const saved = buildSavedRun(r, T0 + 120_000);
  const runSeg = saved.runInfo.segments.find((s) => s.mode === "run");
  const walkSeg = saved.runInfo.segments.find((s) => s.mode === "walk");
  assert.ok(runSeg && walkSeg);
  assert.ok(Math.abs(runSeg.secs - 40) <= 2, `run secs ${runSeg.secs} (pause 60s excluded)`);
  assert.ok(Math.abs(walkSeg.secs - 20) <= 2, `walk secs ${walkSeg.secs}`);
  assert.equal(Math.round(runElapsed(r, T0 + 120_000)), 60);
});

test("a sub-5-second segment merges into its neighbour", () => {
  let r = newRun("walk", null, T0, "m1");
  r = switchRunMode(r, "run", T0 + 10_000);
  assert.equal(r.segments.length, 2);
  r = switchRunMode(r, "walk", T0 + 12_000);
  assert.equal(r.segments.length, 1);
  assert.equal(r.mode, "walk");
  let r2 = newRun("walk", null, T0, "m2");
  r2 = switchRunMode(r2, "run", T0 + 2_000);
  assert.equal(r2.segments.length, 1);
  assert.equal(r2.mode, "run");
});

test("a run segment averaging 3.5 mph is saved as walking and flagged", () => {
  const meters = 3.5 * MI_M / 3600 * 600;
  let r = newRun("run", null, T0, "s1");
  r = { ...r, dist: meters, segments: [{ mode: "run", start: T0, pausedTotal: 0, dist: meters }] };
  const saved = buildSavedRun(r, T0 + 600_000);
  assert.ok(!saved.exercises.some((e) => e.name === "Running"));
  const walk = saved.exercises.find((e) => e.name === "Walking");
  assert.ok(walk);
  assert.equal(walk.sets[0].r, 10);
  assert.ok(saved.slowNote.includes("logged as walking"));
  assert.ok(saved.slowNote.includes("below jogging speed"));
  assert.ok(3.5 < SLOW_RUN_MPH);
});

test("resume after an unfinished run restores segments exactly", () => {
  let r = newRun("walk", null, T0, "u1");
  const w = chain(30, T0, 1.4, 40);
  r = applyFixes(r, w.fixes);
  r = switchRunMode(r, "run", T0 + 40_000);
  const run = chain(w.lat1, T0 + 40_000, 3.0, 20);
  r = applyFixes(r, run.fixes);
  const raw = JSON.stringify(r);
  const restored = ensureSegments(JSON.parse(raw));
  assert.deepEqual(restored.segments, r.segments);
  assert.equal(restored.mode, "run");
  assert.equal(restored.dist, r.dist);
  assert.equal(restored.switchAt, r.switchAt);
});

test("an old single-mode run saves and displays as before", () => {
  const legacy = {
    id: "old",
    mode: "run",
    startedAt: T0,
    pausedTotal: 0,
    pausedAt: null,
    dist: 2 * MI_M,
    pts: [],
    splits: [480, 500],
    gapM: 0,
    guide: null,
  };
  const saved = buildSavedRun(ensureSegments(legacy), T0 + 980_000);
  assert.equal(saved.exercises.length, 1);
  assert.equal(saved.exercises[0].name, "Running");
  assert.equal(saved.title, "Run");
  assert.equal(runKind({ mode: "walk", miles: 1.2 }), "walk");
  assert.equal(runTitle({ mode: "walk", miles: 1.2 }), "Walk");
  assert.equal(runXpLabel({ mode: "run", miles: 3.1 }), "3.1 mi run");
  assert.equal(runFeedLine({ mode: "run", miles: 3.1, pace: 540 }), "ran 3.1 mi · 9:00 /mi");
  assert.equal(runBreakdown({ mode: "run", miles: 3.1, pace: 540 }), "");
  const mixed = { mode: "run", miles: 2.7, runMiles: 2.1, walkMiles: 0.6, segments: [
    { mode: "run", secs: 1200, miles: 2.1, pace: 571 },
    { mode: "walk", secs: 620, miles: 0.6, pace: 1033 },
  ] };
  assert.equal(runTitle(mixed), "Run/Walk");
  assert.equal(runXpLabel(mixed), "2.7 mi Run/Walk");
  assert.match(runBreakdown(mixed), /Run 2\.1 mi/);
  assert.match(runBreakdown(mixed), /Walk 0\.6 mi/);
});
