// Simulation tests for the pure math in math.js. Run with: node --test src
import test from "node:test";
import assert from "node:assert/strict";
import { pickNextGoal, usualTrainHour, workSets, crewQuestProgress, resolveWorldFirst, mergeState } from "./math.js";

test("usualTrainHour falls back to 8pm until there's enough history", () => {
  assert.equal(usualTrainHour([]), 20);
  assert.equal(usualTrainHour([6, 6, 7]), 20);
  assert.equal(usualTrainHour([6, 6, 7], { fallback: 18 }), 18);
});

test("usualTrainHour is the median of past start hours", () => {
  assert.equal(usualTrainHour([17, 18, 18, 19, 22]), 18);
  assert.equal(usualTrainHour([6, 7, 7, 8, 9, 10]), 8);
  assert.equal(usualTrainHour([5, 5, 5, 5, 5, 23, 23]), 5);
});

test("usualTrainHour ignores junk hours", () => {
  assert.equal(usualTrainHour([19, 19, 19, 19, 19, null, NaN, 99, -3]), 19);
  assert.equal(usualTrainHour([19, 19, null, NaN, 99, -3]), 20);
});

test("workSets drops warm-ups and keeps everything else", () => {
  const sets = [{ r: 5, warm: true }, { r: 8 }, { r: 8, drop: true }, null];
  assert.deepEqual(workSets(sets).map((st) => st.r), [8, 8]);
  assert.deepEqual(workSets([]), []);
  assert.deepEqual(workSets(undefined), []);
});

test("warm-up sets count for nothing in volume and reps", () => {
  const vol = (sets) => workSets(sets).reduce((a, st) => a + st.w * st.r, 0);
  const all = [{ w: 45, r: 10, warm: true }, { w: 135, r: 5, warm: true }, { w: 225, r: 5 }, { w: 225, r: 5 }];
  assert.equal(vol(all), 2250);
  assert.equal(vol(all.filter((st) => !st.warm)), vol(all));
});

test("crewQuestProgress pools the week and scales targets by member count", () => {
  const cards = [
    { wk: { key: "2026-09-13", workouts: 5, miles: 6, fuel: 3 } },
    { wk: { key: "2026-09-13", workouts: 4, miles: 10.5, fuel: 5 } },
  ];
  const { quests, members, done } = crewQuestProgress(cards, "2026-09-13", 2);
  assert.equal(members, 2);
  assert.deepEqual(quests.map((q) => [q.value, q.target, q.done]), [[9, 8, true], [16.5, 16, true], [8, 8, true]]);
  assert.equal(done, true);
});

test("crewQuestProgress ignores stale weeks and missing cards", () => {
  const cards = [
    { wk: { key: "2026-09-06", workouts: 9, miles: 40, fuel: 7 } },
    { wk: { key: "2026-09-13", workouts: 2, miles: 3, fuel: 1 } },
    {},
    null,
  ];
  const { quests, done } = crewQuestProgress(cards, "2026-09-13", 3);
  assert.deepEqual(quests.map((q) => [q.value, q.target]), [[2, 12], [3, 24], [1, 12]]);
  assert.equal(done, false);
});

test("resolveWorldFirst gives one winner: earliest blow, ties by id", () => {
  const a = { id: "bbb", t: 1000 }, b = { id: "aaa", t: 1000 }, c = { id: "ccc", t: 2000 };
  assert.equal(resolveWorldFirst([c, a, b]).id, "aaa");
  assert.equal(resolveWorldFirst([c, { id: "zzz", t: 999 }, a]).id, "zzz");
  assert.equal(resolveWorldFirst([{ id: "x", t: 5 }]).id, "x");
});

test("resolveWorldFirst skips malformed claims and empty sets", () => {
  assert.equal(resolveWorldFirst([]), null);
  assert.equal(resolveWorldFirst(null), null);
  assert.equal(resolveWorldFirst([{ id: "no-time" }, { t: 5 }, null]), null);
  assert.equal(resolveWorldFirst([{ id: "no-time" }, { id: "ok", t: 7 }]).id, "ok");
});

test("pickNextGoal takes the candidate closest to done", () => {
  const got = pickNextGoal([
    { id: "quest", value: 40, goal: 100, tie: 0 },
    { id: "weekly", value: 2, goal: 4, tie: 1 },
    { id: "bench", value: 188, goal: 200, tie: 2 },
  ]);
  assert.equal(got.id, "bench");
});

test("pickNextGoal ignores finished, empty and malformed candidates", () => {
  const got = pickNextGoal([
    { id: "done", value: 4, goal: 4, tie: 0 },
    { id: "over", value: 9, goal: 4, tie: 0 },
    { id: "nogoal", value: 3, goal: 0, tie: 0 },
    null,
    { id: "live", value: 3, goal: 10, tie: 1 },
  ]);
  assert.equal(got.id, "live");
});

test("pickNextGoal breaks ties with the tie order", () => {
  const got = pickNextGoal([
    { id: "lift", value: 5, goal: 10, tie: 2 },
    { id: "quest", value: 50, goal: 100, tie: 0 },
    { id: "weekly", value: 1, goal: 2, tie: 1 },
  ]);
  assert.equal(got.id, "quest");
});

test("pickNextGoal skips barely-started goals but still falls back to one with progress", () => {
  const barely = [{ id: "cold", value: 1, goal: 100, tie: 0 }];
  assert.equal(pickNextGoal(barely).id, "cold");
  const mixed = [
    { id: "cold", value: 1, goal: 100, tie: 0 },
    { id: "warm", value: 30, goal: 100, tie: 1 },
  ];
  assert.equal(pickNextGoal(mixed).id, "warm");
});

test("pickNextGoal hides when nothing has been started", () => {
  assert.equal(pickNextGoal([{ id: "a", value: 0, goal: 100, tie: 0 }]), null);
  assert.equal(pickNextGoal([]), null);
  assert.equal(pickNextGoal(null), null);
});

const snap = {
  rev: 1, xp: 100, crateSpent: 0,
  meals: { "2026-09-18": [{ id: "a", name: "bun", cal: 120 }] },
  workouts: [{ id: "w1", title: "Push" }],
  weightLog: { "2026-09-18": 180 },
  profile: { name: "Finn", weight: 180, look: { aura: "ember" } },
};

test("mergeState keeps other device XP when this device did not earn any", () => {
  const local = { ...snap, meals: { ...snap.meals, "2026-09-18": [...snap.meals["2026-09-18"], { id: "b", name: "patty", cal: 250 }] } };
  const server = { ...snap, xp: 140, crateSpent: 250 };
  const got = mergeState(local, server, snap);
  assert.equal(got.xp, 140);
  assert.equal(got.crateSpent, 250);
  assert.equal(got.meals["2026-09-18"].length, 2);
});

test("mergeState keeps local XP when this device earned it", () => {
  const local = { ...snap, xp: 160 };
  const server = { ...snap, xp: 140, crateSpent: 250 };
  const got = mergeState(local, server, snap);
  assert.equal(got.xp, 160);
  assert.equal(got.crateSpent, 250);
});

test("mergeState keeps foods added on both devices and local qty edits", () => {
  const local = { ...snap, meals: { "2026-09-18": [{ id: "a", name: "bun", cal: 120, qty: 2 }] } };
  const server = { ...snap, meals: { "2026-09-18": [{ id: "a", name: "bun", cal: 120, qty: 1 }, { id: "c", name: "patty", cal: 250 }] } };
  const got = mergeState(local, server, snap);
  const names = got.meals["2026-09-18"].map((m) => m.name + ":" + (m.qty || 1));
  assert.deepEqual(names, ["bun:2", "patty:1"]);
});

test("mergeState does not resurrect a deleted meal or weightLog key", () => {
  const local = { ...snap, meals: { "2026-09-18": [] }, weightLog: {} };
  const server = { ...snap };
  const got = mergeState(local, server, snap);
  assert.deepEqual(got.meals["2026-09-18"], []);
  assert.equal(got.weightLog["2026-09-18"], undefined);
});

test("mergeState keeps a server-only workout this device never saw", () => {
  const local = { ...snap };
  const server = { ...snap, workouts: [...snap.workouts, { id: "w2", title: "Pull" }] };
  const got = mergeState(local, server, snap);
  assert.deepEqual(got.workouts.map((w) => w.id), ["w1", "w2"]);
});

test("mergeState merges nested profile: local weight, server look", () => {
  const local = { ...snap, profile: { ...snap.profile, weight: 182 } };
  const server = { ...snap, profile: { ...snap.profile, look: { aura: "tide" } } };
  const got = mergeState(local, server, snap);
  assert.equal(got.profile.weight, 182);
  assert.equal(got.profile.look.aura, "tide");
  assert.equal(got.profile.name, "Finn");
});

