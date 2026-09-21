// Simulation tests for the pure math in math.js. Run with: node --test src
import test from "node:test";
import assert from "node:assert/strict";
import { pickNextGoal, usualTrainHour, workSets, crewQuestProgress, resolveWorldFirst, mergeState, normalizeState, shouldSkipSave, stateKeysChanged, activeShape, activeIsUrgent, saveIsUrgent, saveDelayMs, haversineMeters, inGymRadius, presenceActive, prunePresence, pingActive, checkGymPin, canProposeRaid, canReadyUp, applyRaidAction, reconcileRaid, tickRaid, raidActive, RAID_NEED, RAID_MS, RAID_COUNTDOWN_MS, PRESENCE_MS, GYM_RADIUS_M, thresholds, targets, applyBodyType, FEMALE_GROUP_SCALE, FEMALE_REP_SCALE, bodySex, ANIME_CRATE_WEIGHTS, ANIME_RARITY_ORDER, ANIME_PITY_AT, rollAnimeRarity, migrateAnimeCrateState, exKey, isLegacyAssisted, isGymSpecific, inGymBucket, workoutGym, tagWorkouts, pickPreferredExercise, duplicateExerciseGroups, rewriteExerciseNames, applyExerciseMerge, EXERCISE_NAME_FIELDS, LEGACY_ASSISTED_CUTOFF, rankUpCeremony, withSilentRankSnap, PR_BONUS, scoreExercisePrs, recountPrBonuses, dryRunPrRecount, nextXpFloor, xpAtLevelStart, levelFromXp, unionAchievements, effW, gymSpecificNamesIn, retaggedWorkouts } from "./math.js";

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

test("mergeState keeps local nulling of active instead of resurrecting a partial session", () => {
  const base = { ...snap, active: { start: 1, title: "Push", exercises: [{ name: "Bench", sets: [] }] } };
  const local = { ...base, active: null };
  const got = mergeState(local, base, base);
  assert.equal(got.active, null);
});

test("normalizeState fills missing active.exercises without dropping extra keys", () => {
  const s = { active: { start: 1, title: "Push", extra: true }, mystery: 9, workouts: [{ id: "w1", title: "Push" }] };
  const n = normalizeState(s);
  assert.deepEqual(n.active.exercises, []);
  assert.equal(n.active.extra, true);
  assert.equal(n.mystery, 9);
  assert.deepEqual(n.workouts[0].exercises, []);
  assert.equal(n.workouts[0].title, "Push");
});

test("normalizeState is additive and identity-stable when already valid", () => {
  const filled = normalizeState({ xp: 10, mystery: { keep: true } });
  assert.equal(filled.mystery.keep, true);
  assert.deepEqual(filled.workouts, []);
  assert.equal(normalizeState(filled), filled);
});

test("a save does not re-trigger itself when s is the just-written object", () => {
  const s = { xp: 1, meals: {} };
  assert.equal(shouldSkipSave(s, s), true);
  assert.equal(shouldSkipSave({ ...s }, s), false);
  assert.equal(shouldSkipSave(s, null), false);
  assert.equal(stateKeysChanged(s, s), false);
  assert.equal(stateKeysChanged({ ...s, xp: 2 }, s), true);
  assert.equal(stateKeysChanged({ ...s, meals: s.meals }, s), false);
});

test("active typing is not urgent; structural active changes are", () => {
  const sess = { start: 1, title: "Push", exercises: [{ name: "Bench", sets: [{ w: "135", r: "5", done: false }] }] };
  assert.equal(activeIsUrgent(sess, { ...sess, title: "Legs" }), false);
  assert.equal(activeIsUrgent(sess, { ...sess, exercises: [{ name: "Bench", sets: [{ w: "185", r: "5", done: false }] }] }), false);
  assert.equal(activeIsUrgent(sess, { ...sess, exercises: [{ name: "Bench", sets: [{ w: "135", r: "5", done: true }] }] }), true);
  assert.equal(activeIsUrgent(sess, { ...sess, exercises: [{ name: "Bench", sets: [{ w: "135", r: "5", done: false }, { w: "", r: "", done: false }] }] }), true);
  assert.equal(activeIsUrgent(sess, { ...sess, exercises: [...sess.exercises, { name: "Squat", sets: [] }] }), true);
  assert.equal(activeIsUrgent(sess, null), true);
  assert.equal(activeIsUrgent(null, sess), true);
  assert.equal(activeShape(sess), activeShape({ ...sess, title: "x", exercises: [{ name: "Bench", sets: [{ w: "9", r: "1", done: false }] }] }));
  const prev = { active: sess, meals: { a: 1 } };
  const typed = { ...prev, active: { ...sess, title: "P" } };
  assert.equal(saveIsUrgent(prev, typed, ["meals", "workouts"]), false);
  assert.equal(saveDelayMs(false, prev, typed), 1000);
  const checked = { ...prev, active: { ...sess, exercises: [{ name: "Bench", sets: [{ w: "135", r: "5", done: true }] }] } };
  assert.equal(saveIsUrgent(prev, checked, ["meals", "workouts"]), true);
  assert.equal(saveDelayMs(true, prev, checked), 0);
});

test("pending recovery keeps a local meal and a concurrent server-side meal", () => {
  const snap = { meals: { "2026-09-20": [{ id: "a", name: "oats", cal: 150, qty: 1 }] }, workouts: [{ id: "w1", title: "Push" }], profile: { name: "Chud" } };
  const local = { ...snap, meals: { "2026-09-20": [{ id: "a", name: "oats", cal: 150, qty: 1 }, { id: "b", name: "chicken", cal: 230, qty: 1 }] } };
  const server = { ...snap, meals: { "2026-09-20": [{ id: "a", name: "oats", cal: 150, qty: 1 }, { id: "c", name: "rice", cal: 200, qty: 1 }] } };
  const got = normalizeState(mergeState(local, server, snap));
  const names = got.meals["2026-09-20"].map((m) => m.name).sort();
  assert.deepEqual(names, ["chicken", "oats", "rice"]);
});

const gym = { lat: 0, lng: 0 };
const at = (ids, t = 0) => Object.fromEntries(ids.map((id) => [id, t]));
const propose = (now = 0, n = 4) => applyRaidAction(null, "propose", { playerId: "h", memberCount: n, now }).raid;

test("haversine / 150 m gym radius", () => {
  assert.equal(inGymRadius({ lat: 0, lng: 0 }, gym), true);
  assert.ok(haversineMeters({ lat: 0.001, lng: 0 }, gym) < GYM_RADIUS_M);
  assert.equal(inGymRadius({ lat: 0.001, lng: 0 }, gym), true);
  assert.ok(haversineMeters({ lat: 0.002, lng: 0 }, gym) > GYM_RADIUS_M);
  assert.equal(inGymRadius({ lat: 0.002, lng: 0 }, gym), false);
  assert.equal(checkGymPin({ lat: 0, lng: 0 }, gym).ok, true);
  assert.equal(checkGymPin({ lat: 0.002, lng: 0 }, gym).reason, "too-far");
  assert.equal(checkGymPin({ lat: 0, lng: 0 }, null).reason, "no-gym");
});

test("presence lasts 90 minutes and refreshes", () => {
  assert.equal(presenceActive(0, PRESENCE_MS - 1), true);
  assert.equal(presenceActive(0, PRESENCE_MS), false);
  assert.equal(presenceActive(100, 100 + PRESENCE_MS - 1), true);
  const pruned = prunePresence({ a: 0, b: 1 }, PRESENCE_MS);
  assert.equal(pruned.a, undefined);
  assert.equal(pruned.b, 1);
});

test("spot ping stays live for 90 minutes including for the sender", () => {
  const ping = { by: "me", name: "Chud", t: 0 };
  assert.equal(pingActive(ping, 0), true);
  assert.equal(pingActive(ping, PRESENCE_MS - 1), true);
  assert.equal(pingActive(ping, PRESENCE_MS), false);
  assert.equal(pingActive(null, 0), false);
});

test("ready-up rules: count, crew size, must be at gym", () => {
  assert.equal(canProposeRaid(2), false);
  assert.equal(canProposeRaid(RAID_NEED), true);
  assert.equal(canReadyUp({ atGym: true, memberCount: 2 }), false);
  assert.equal(canReadyUp({ atGym: false, memberCount: 4, phase: "lobby" }), false);
  assert.equal(canReadyUp({ atGym: true, memberCount: 4, phase: "lobby" }), true);
  assert.equal(applyRaidAction(null, "propose", { playerId: "h", memberCount: 2, now: 0 }).reason, "crew-size");
  const lobby = propose();
  const noGym = applyRaidAction(lobby, "ready", { playerId: "a", presence: {}, now: 1, memberCount: 4 });
  assert.equal(noGym.ok, false);
  assert.equal(noGym.reason, "not-at-gym");
  const ok = applyRaidAction(lobby, "ready", { playerId: "a", presence: at(["a"]), now: 1, memberCount: 4 });
  assert.equal(ok.ok, true);
  assert.ok(ok.raid.ready.a);
});

test("3rd ready starts a 3-2-1 countdown then a 3-hour live window", () => {
  let r = propose();
  const pres = at(["a", "b", "c"]);
  r = applyRaidAction(r, "ready", { playerId: "a", presence: pres, now: 10 }).raid;
  r = applyRaidAction(r, "ready", { playerId: "b", presence: pres, now: 11 }).raid;
  assert.equal(r.countdownAt, null);
  r = applyRaidAction(r, "ready", { playerId: "c", presence: pres, now: 12 }).raid;
  assert.equal(r.countdownAt, 12);
  assert.equal(r.phase, "lobby");
  const live = tickRaid(r, { now: 12 + RAID_COUNTDOWN_MS, presence: pres });
  assert.equal(live.phase, "live");
  assert.equal(live.end - live.start, RAID_MS);
  assert.equal(raidActive(live, 12 + RAID_COUNTDOWN_MS), true);
});

test("leaving GPS range drops ready and aborts countdown", () => {
  let r = propose();
  const pres = at(["a", "b", "c"]);
  r = applyRaidAction(r, "ready", { playerId: "a", presence: pres, now: 1 }).raid;
  r = applyRaidAction(r, "ready", { playerId: "b", presence: pres, now: 2 }).raid;
  r = applyRaidAction(r, "ready", { playerId: "c", presence: pres, now: 3 }).raid;
  assert.ok(r.countdownAt);
  r = applyRaidAction(r, "drop", { playerId: "c", presence: at(["a", "b"]), now: 4 }).raid;
  assert.equal(r.ready.c, undefined);
  assert.equal(r.countdownAt, null);
  const gone = tickRaid(r, { now: 5, presence: at(["a", "b"]) });
  assert.equal(gone.ready.c, undefined);
});

test("host leaving the lobby transfers host and does not cancel others", () => {
  let r = propose();
  const pres = at(["h", "a"]);
  r = applyRaidAction(r, "ready", { playerId: "h", presence: pres, now: 1 }).raid;
  r = applyRaidAction(r, "ready", { playerId: "a", presence: pres, now: 2 }).raid;
  const left = applyRaidAction(r, "leave", { playerId: "h", presence: pres, now: 3 });
  assert.equal(left.ok, true);
  assert.equal(left.raid.by, "a");
  assert.ok(left.raid.ready.a);
  assert.equal(left.raid.cancelled, false);
  assert.equal(left.raid.phase, "lobby");
});

test("cancel before clear awards nothing; hits after cancel do not land", () => {
  let r = propose();
  const pres = at(["h", "a", "b"]);
  r = applyRaidAction(r, "ready", { playerId: "h", presence: pres, now: 1 }).raid;
  r = applyRaidAction(r, "ready", { playerId: "a", presence: pres, now: 2 }).raid;
  r = applyRaidAction(r, "ready", { playerId: "b", presence: pres, now: 3 }).raid;
  r = tickRaid(r, { now: 3 + RAID_COUNTDOWN_MS, presence: pres });
  const cancelled = applyRaidAction(r, "cancel", { playerId: "h", presence: pres, now: 4 + RAID_COUNTDOWN_MS });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.raid.cleared, false);
  const hit = applyRaidAction(cancelled.raid, "hit", { playerId: "a", presence: pres, now: 5 + RAID_COUNTDOWN_MS, workout: { volume: 1000 } });
  assert.equal(hit.ok, false);
  assert.equal(hit.raid.cleared, false);
  assert.equal(Object.keys(hit.raid.hits || {}).length, 0);
});

test("simultaneous ready-ups keep both players; only one live raid starts", () => {
  const lobby = propose();
  const pres = at(["a", "b", "c"]);
  const fromA = applyRaidAction(lobby, "ready", { playerId: "a", presence: pres, now: 5 }).raid;
  const fromB = applyRaidAction(lobby, "ready", { playerId: "b", presence: pres, now: 5 }).raid;
  const merged = reconcileRaid(fromA, fromB);
  assert.ok(merged.ready.a && merged.ready.b);
  const withC = applyRaidAction(merged, "ready", { playerId: "c", presence: pres, now: 6 }).raid;
  const liveA = tickRaid(withC, { now: 6 + RAID_COUNTDOWN_MS, presence: pres });
  const liveB = tickRaid(withC, { now: 6 + RAID_COUNTDOWN_MS, presence: pres });
  const one = reconcileRaid(liveA, liveB);
  assert.equal(one.phase, "live");
  assert.equal(liveA.start, liveB.start);
  assert.equal(one.start, liveA.start);
  const second = applyRaidAction(one, "propose", { playerId: "h", memberCount: 4, now: one.start + 1, presence: pres });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "active");
});

test("raid hits only count at the gym; 3 at-gym logs clear", () => {
  let r = propose();
  const pres = at(["a", "b", "c"]);
  ["a", "b", "c"].forEach((id, i) => { r = applyRaidAction(r, "ready", { playerId: id, presence: pres, now: i + 1 }).raid; });
  r = tickRaid(r, { now: 10 + RAID_COUNTDOWN_MS, presence: pres });
  const miss = applyRaidAction(r, "hit", { playerId: "a", presence: {}, now: 11 + RAID_COUNTDOWN_MS, workout: { volume: 9 } });
  assert.equal(miss.ok, false);
  r = applyRaidAction(r, "hit", { playerId: "a", presence: pres, now: 11 + RAID_COUNTDOWN_MS, workout: { volume: 9 } }).raid;
  r = applyRaidAction(r, "hit", { playerId: "b", presence: pres, now: 12 + RAID_COUNTDOWN_MS, workout: { volume: 9 } }).raid;
  assert.equal(r.cleared, false);
  r = applyRaidAction(r, "hit", { playerId: "c", presence: pres, now: 13 + RAID_COUNTDOWN_MS, workout: { volume: 9 } }).raid;
  assert.equal(r.cleared, true);
});

const REF = { weight: 170, height: 70, age: 25, sex: "m", activity: 1.55, goal: "lean" };
const benchEx = { type: "weighted", group: "Chest", factor: 1 };
const squatEx = { type: "weighted", group: "Legs", factor: 1.25 };
const pullEx = { type: "bodyweight", group: "Back", reps: 0.85 };

test("female rank lines are group-scaled vs the same male inputs", () => {
  const mBench = thresholds(benchEx, REF);
  const fBench = thresholds(benchEx, { ...REF, sex: "f" });
  const mSquat = thresholds(squatEx, REF);
  const fSquat = thresholds(squatEx, { ...REF, sex: "f" });
  const mPull = thresholds(pullEx, REF);
  const fPull = thresholds(pullEx, { ...REF, sex: "f" });
  assert.ok(fBench[4] < mBench[4]);
  assert.ok(fSquat[4] < mSquat[4]);
  assert.ok(Math.abs(fBench[4] / mBench[4] - FEMALE_GROUP_SCALE.Chest) < 0.03);
  assert.ok(Math.abs(fSquat[4] / mSquat[4] - FEMALE_GROUP_SCALE.Legs) < 0.03);
  assert.ok(fPull[4] < mPull[4]);
  assert.ok(Math.abs(fPull[4] / mPull[4] - FEMALE_REP_SCALE) < 0.08);
  assert.deepEqual(thresholds(benchEx, { ...REF, sex: "x" }), mBench);
});

test("female calorie targets use Mifflin-St Jeor −161 on the same stats", () => {
  const m = targets(REF);
  const f = targets({ ...REF, sex: "f" });
  assert.ok(f.cal < m.cal);
  assert.ok(f.tdee < m.tdee);
  assert.equal(f.protein, m.protein);
  const kg = REF.weight * 0.4536, cm = REF.height * 2.54;
  const bmrM = 10 * kg + 6.25 * cm - 5 * REF.age + 5;
  const bmrF = 10 * kg + 6.25 * cm - 5 * REF.age - 161;
  assert.equal(m.tdee, Math.round(bmrM * REF.activity));
  assert.equal(f.tdee, Math.round(bmrF * REF.activity));
  assert.equal(targets({ ...REF, sex: undefined }).cal, m.cal);
});

test("switching body type does not remove achievements, XP, titles, or cosmetics", () => {
  const s = {
    profile: { ...REF, title: "iron", look: { aura: "ember" } },
    ach: { "rank-s": 1, "bench-2": 1, "yogurt-0": 1 },
    xp: 8400,
    loot: { wyrm: true },
    crateUnlocks: { sigil: 1 },
    seasonBadges: { "2026-S1": "gold" },
    auraUnlocks: { ember: "2026-01-01" },
  };
  const f = applyBodyType(s, "f");
  const m = applyBodyType(f, "m");
  assert.equal(bodySex(f.profile), "f");
  assert.equal(bodySex(m.profile), "m");
  assert.deepEqual(f.ach, s.ach);
  assert.deepEqual(m.ach, s.ach);
  assert.equal(f.xp, 8400);
  assert.equal(m.xp, 8400);
  assert.deepEqual(f.loot, s.loot);
  assert.equal(f.profile.title, "iron");
  assert.equal(f.profile.look.aura, "ember");
  assert.deepEqual(f.crateUnlocks, s.crateUnlocks);
  assert.deepEqual(f.seasonBadges, s.seasonBadges);
  assert.deepEqual(f.auraUnlocks, s.auraUnlocks);
});

test("Anime Crate rarity weights sum to exactly 1.0", () => {
  assert.equal(ANIME_RARITY_ORDER.reduce((sum, rarity) => sum + ANIME_CRATE_WEIGHTS[rarity], 0), 1);
});

test("Anime Crate 200k base pulls stay within published tolerances", () => {
  let seed = 0x51a7c0de;
  const rng = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const n = 200000;
  const counts = Object.fromEntries(ANIME_RARITY_ORDER.map((r) => [r, 0]));
  for (let i = 0; i < n; i++) counts[rollAnimeRarity(0, rng, { pity: false }).rarity]++;
  ANIME_RARITY_ORDER.forEach((rarity) => {
    const actual = counts[rarity] / n, expected = ANIME_CRATE_WEIGHTS[rarity];
    const tolerance = rarity === "secret" ? 0.0003 : Math.max(0.001, expected * 0.025);
    assert.ok(Math.abs(actual - expected) <= tolerance, `${rarity}: ${actual} vs ${expected}`);
  });
});

test("Anime Crate pity guarantees Legendary-or-better on pull 40", () => {
  let pity = 0;
  for (let i = 1; i <= ANIME_PITY_AT; i++) {
    const got = rollAnimeRarity(pity, () => 0.5);
    if (i < ANIME_PITY_AT) assert.equal(["legendary", "mythic", "gilded"].includes(got.rarity), false);
    else {
      assert.equal(got.forced, true);
      assert.equal(["legendary", "mythic", "gilded"].includes(got.rarity), true);
      assert.equal(got.pity, 0);
    }
    pity = got.pity;
  }
});

test("Secret is one in 1000 and does not touch pity", () => {
  assert.deepEqual(rollAnimeRarity(17, () => 0.0005), { rarity: "secret", pity: 17, draw: 0.0005 });
  let secret = 0;
  for (let i = 0; i < 100000; i++) if (rollAnimeRarity(0, () => (i + 0.5) / 100000, { pity: false }).rarity === "secret") secret++;
  assert.equal(secret, 100);
});

test("Anime Crate migration preserves legacy ownership and equipped cosmetics", () => {
  const s = {
    cratePity: { rare: 12, legendary: 27 },
    crateUnlocks: { chud: "2026-01-01", relic: "2026-01-02", sigil: "2026-01-03", glassfire: "2026-01-04", crownfall: "2026-01-05", eclipseheart: "2026-01-06" },
    crateLog: [{ id: "sigil", kind: "aura" }],
    profile: { title: "chud", look: { border: "relic", aura: "crownfall" } },
  };
  const got = migrateAnimeCrateState(s);
  assert.equal(got.cratePity, 27);
  assert.equal(got.crateLog[0].type, "aura");
  assert.deepEqual(got.crateUnlocks, s.crateUnlocks);
  assert.deepEqual(got.profile, s.profile);
});

test("exKey normalises case, punctuation and a trailing s", () => {
  assert.equal(exKey("Lat Pull-down"), exKey("lat pulldown"));
  assert.equal(exKey("Lat Pulldowns"), exKey("Lat Pull-down"));
  assert.equal(exKey("Bench Press"), "benchpres");
  assert.equal(exKey("Dip"), exKey("Dips"));
  assert.equal(exKey(""), "");
});

test("pickPreferredExercise prefers history, then catalog, then custom, then community", () => {
  const catalog = { name: "Lat Pulldown", group: "Back", type: "weighted" };
  const custom = { name: "Lat Pull-down", group: "Back", type: "weighted", custom: true };
  const community = { name: "Lat Pulldowns", group: "Back", type: "weighted", community: true };
  const group = [
    { ex: catalog, source: "catalog" },
    { ex: custom, source: "custom" },
    { ex: community, source: "community" },
  ];
  const hist = pickPreferredExercise(group, new Map([["Lat Pull-down", 3]]));
  assert.equal(hist.name, "Lat Pull-down");
  assert.equal(hist.group, "Back");
  const noHist = pickPreferredExercise(group, new Map());
  assert.equal(noHist.name, "Lat Pulldown");
  assert.equal(pickPreferredExercise([{ ex: custom, source: "custom" }, { ex: community, source: "community" }], new Map()).name, "Lat Pull-down");
  const comm = pickPreferredExercise([{ ex: community, source: "community" }], new Map());
  assert.equal(comm.name, "Lat Pulldowns");
  assert.equal(comm.community, true);
});

test("rewriteExerciseNames covers every stored exercise-name field", () => {
  assert.deepEqual([...EXERCISE_NAME_FIELDS], [
    "workouts[].exercises[].name",
    "workouts[].lines[].name",
    "active.exercises[].name",
    "presets[].exercises[].name",
    "custom[].name",
    "lastSummary.prNames[]",
    "lastSummary.suggestions[].name",
    "lastSummary.recap.lifts[].name",
    "gymSpecific",
    "rankSnap.lifts",
    "rankHist[*].lifts",
  ]);
  const s = {
    workouts: [{ id: 1, exercises: [{ name: "lat pulldown", sets: [] }], lines: [{ name: "lat pulldown", xp: 1 }] }],
    active: { exercises: [{ name: "lat pulldown", sets: [] }] },
    presets: [{ id: "p", name: "Pull", exercises: [{ name: "lat pulldown", sets: 3 }] }],
    custom: [{ name: "lat pulldown", group: "Back" }, { name: "Lat Pulldown", group: "Back" }],
    lastSummary: { prNames: ["lat pulldown"], suggestions: [{ name: "lat pulldown", next: { w: 1 } }], recap: { lifts: [{ name: "lat pulldown" }] } },
    gymSpecific: { "lat pulldown": true },
    rankSnap: { overall: 1, lifts: { "lat pulldown": 2, "Lat Pulldown": 3 } },
    rankHist: { w1: { lifts: { "lat pulldown": 4, "Lat Pulldown": 1 } } },
    dayTemplates: [{ id: "d", name: "Meals", items: [{ name: "Chicken" }] }],
  };
  const got = rewriteExerciseNames(s, { "lat pulldown": "Lat Pulldown" });
  assert.equal(got.workouts[0].exercises[0].name, "Lat Pulldown");
  assert.equal(got.workouts[0].lines[0].name, "Lat Pulldown");
  assert.equal(got.active.exercises[0].name, "Lat Pulldown");
  assert.equal(got.presets[0].exercises[0].name, "Lat Pulldown");
  assert.equal(got.custom.some((c) => c.name === "lat pulldown"), false);
  assert.equal(got.custom.some((c) => c.name === "Lat Pulldown"), true);
  assert.deepEqual(got.lastSummary.prNames, ["Lat Pulldown"]);
  assert.equal(got.lastSummary.suggestions[0].name, "Lat Pulldown");
  assert.equal(got.lastSummary.recap.lifts[0].name, "Lat Pulldown");
  assert.equal(got.gymSpecific["Lat Pulldown"], true);
  assert.equal(got.gymSpecific["lat pulldown"], undefined);
  assert.equal(got.rankSnap.lifts["Lat Pulldown"], 3);
  assert.equal(got.rankSnap.lifts["lat pulldown"], undefined);
  assert.equal(got.rankHist.w1.lifts["Lat Pulldown"], 4);
  assert.equal(got.rankHist.w1.lifts["lat pulldown"], undefined);
  assert.equal(got.dayTemplates[0].items[0].name, "Chicken");
  const groups = duplicateExerciseGroups({
    workouts: [{ id: 1, exercises: [{ name: "Lat Pull-down" }, { name: "Lat Pulldowns" }] }],
  }, ["Lat Pulldown"]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, exKey("Lat Pulldown"));
  const merged = applyExerciseMerge(s, [{ names: ["lat pulldown", "Lat Pulldown"], canonical: "Lat Pulldown" }]);
  assert.equal(merged.workouts[0].exercises[0].name, "Lat Pulldown");
});

test("isLegacyAssisted uses one cutoff and only assisted exercises", () => {
  const def = { type: "assisted", name: "Assisted Dip Machine" };
  assert.equal(isLegacyAssisted({ date: "2026-09-19" }, def), true);
  assert.equal(isLegacyAssisted({ date: LEGACY_ASSISTED_CUTOFF }, def), false);
  assert.equal(isLegacyAssisted({ date: "2026-09-21" }, def), false);
  assert.equal(isLegacyAssisted({ date: "2026-09-19" }, { type: "weighted" }), false);
});

test("isGymSpecific auto-matches Machine/Cable and honours per-exercise override", () => {
  assert.equal(isGymSpecific({}, { name: "Chest Press Machine" }), true);
  assert.equal(isGymSpecific({}, { name: "Cable Crossover" }), true);
  assert.equal(isGymSpecific({}, { name: "Bench Press" }), false);
  assert.equal(isGymSpecific({ gymSpecific: { "Bench Press": true } }, { name: "Bench Press" }), true);
  assert.equal(isGymSpecific({ gymSpecific: { "Chest Press Machine": false } }, { name: "Chest Press Machine" }), false);
});

test("gym buckets filter gym-specific work and leave a no-gym account unchanged", () => {
  const s = { currentGym: "g1", gymSpecific: {} };
  const machine = { name: "Crunch Machine", type: "weighted" };
  const bench = { name: "Bench Press", type: "weighted" };
  assert.equal(inGymBucket(s, { gym: "g1" }, machine), true);
  assert.equal(inGymBucket(s, { gym: "g2" }, machine), false);
  assert.equal(inGymBucket(s, {}, machine), false);
  assert.equal(inGymBucket(s, { gym: "g2" }, bench), true);
  const none = { currentGym: null };
  assert.equal(inGymBucket(none, {}, machine), true);
  assert.equal(inGymBucket(none, { gym: "g1" }, machine), false);
  assert.equal(workoutGym({}), null);
  const tagged = tagWorkouts({ workouts: [{ id: 1, date: "2026-01-01" }, { id: 2, date: "2026-09-01", source: "import" }] }, { gymId: "home", untaggedOnly: true });
  assert.equal(tagged.workouts[0].gym, "home");
  assert.equal(tagged.workouts[1].gym, undefined);
  const before = tagWorkouts({ workouts: [{ id: 1, date: "2026-01-01" }, { id: 2, date: "2026-06-01" }] }, { gymId: "home", before: "2026-03-01" });
  assert.equal(before.workouts[0].gym, "home");
  assert.equal(before.workouts[1].gym, undefined);
});

test("merge produces no ceremony", () => {
  const prev = { overall: 1, od: 3, lifts: { "lat pulldown": 2 } };
  const s = {
    workouts: [{ id: 1, exercises: [{ name: "lat pulldown" }, { name: "Lat Pulldown" }] }],
    rankSnap: prev,
    rankHist: { w1: { lifts: { "lat pulldown": 2 } } },
  };
  const merged = applyExerciseMerge(s, [{ names: ["lat pulldown", "Lat Pulldown"], canonical: "Lat Pulldown" }]);
  assert.deepEqual(merged.rankSnap.lifts, { "Lat Pulldown": 2 });
  assert.equal(rankUpCeremony(prev, { overall: 1, od: 3, lifts: { "Lat Pulldown": 2 } }).kind, "lift");
  const raised = { overall: 2, od: 6, lifts: { "Lat Pulldown": 3 } };
  const silent = withSilentRankSnap(merged, raised);
  assert.equal(rankUpCeremony(silent.rankSnap, raised), null);
});

test("switching gyms produces no ceremony", () => {
  const prev = { overall: 1, od: 3, lifts: { "Crunch Machine": 1, "Bench Press": 2 } };
  const afterGym = { overall: 2, od: 6, lifts: { "Crunch Machine": 4, "Bench Press": 2 } };
  assert.equal(rankUpCeremony(prev, afterGym).kind, "overall");
  const next = withSilentRankSnap({ currentGym: "g2", rankSnap: prev }, afterGym);
  assert.equal(next.currentGym, "g2");
  assert.equal(rankUpCeremony(next.rankSnap, afterGym), null);
});

function testFindEx(_s, name) {
  const table = {
    "Bench Press": { name: "Bench Press", type: "weighted", perHand: false, group: "Chest" },
    "Dumbbell Press": { name: "Dumbbell Press", type: "weighted", perHand: true, group: "Chest" },
    "Chest Press Machine": { name: "Chest Press Machine", type: "weighted", group: "Chest" },
    "Push-up": { name: "Push-up", type: "bodyweight", group: "Chest" },
    "Assisted Dip Machine": { name: "Assisted Dip Machine", type: "assisted", rankAs: "Dip", group: "Chest" },
    "Plank": { name: "Plank", type: "timed", group: "Core" },
    "New Lift": { name: "New Lift", type: "weighted", group: "Chest" },
  };
  return table[name] || { name, type: "weighted", group: "Chest" };
}
function prFlags(def, sets, history = [], workout = { date: "2026-09-21" }, ex = {}) {
  return scoreExercisePrs(def, { ...ex, name: def.name, sets }, history, workout).map((f) => f.pr);
}
function logged(id, date, name, pairs, extra = {}) {
  const sets = pairs.map(([w, r]) => ({ w, r, done: true }));
  const setXp = extra.setXp ?? 10 * pairs.length;
  const prBonus = extra.prBonus ?? 40 * pairs.length;
  return {
    id, date, title: extra.title || name, startedAt: extra.startedAt || 0,
    exercises: [{ name, sets, ...(extra.ex || {}) }],
    xp: setXp + prBonus, prBonus,
    lines: [{ name, xp: setXp, sets: pairs.map(([w, r]) => ({ label: `${w}×${r}`, xp: 10, note: "", pr: true })) }],
    ...(extra.gym != null ? { gym: extra.gym } : {}),
  };
}

test("first-ever exercise with 5 increasing sets earns exactly 1 PR", () => {
  const def = testFindEx(null, "New Lift");
  const sets = [[95, 5], [115, 5], [135, 5], [155, 5], [175, 5]].map(([w, r]) => ({ w, r }));
  const flags = prFlags(def, sets, []);
  assert.deepEqual(flags, ["weight", false, false, false, false]);
  assert.equal(flags.filter(Boolean).length, 1);
});

test("heavier weight than ever is a weight PR only", () => {
  const def = testFindEx(null, "Bench Press");
  const hist = [{ w: 135, r: 5 }, { w: 155, r: 3 }];
  const flags = prFlags(def, [{ w: 185, r: 8 }, { w: 185, r: 8 }], hist);
  assert.equal(flags[0], "weight");
  assert.equal(flags[1], false);
});

test("more reps at an existing weight is a rep PR", () => {
  const def = testFindEx(null, "Bench Press");
  const hist = [{ w: 185, r: 5 }];
  const flags = prFlags(def, [{ w: 185, r: 8 }], hist);
  assert.equal(flags[0], "reps");
});

test("weight and rep PR can both land in one workout", () => {
  const def = testFindEx(null, "Bench Press");
  const hist = [{ w: 135, r: 5 }];
  const flags = prFlags(def, [{ w: 185, r: 3 }, { w: 135, r: 8 }], hist);
  assert.equal(flags[0], "weight");
  assert.equal(flags[1], "reps");
  assert.equal(flags.filter(Boolean).length, 2);
});

test("a third qualifying set in the same workout is still 2 PRs", () => {
  const def = testFindEx(null, "Bench Press");
  const hist = [{ w: 135, r: 5 }];
  const flags = prFlags(def, [{ w: 185, r: 3 }, { w: 135, r: 8 }, { w: 155, r: 10 }], hist);
  assert.equal(flags.filter(Boolean).length, 2);
});

test("per-hand vs total mode switch cannot fake a PR", () => {
  const def = testFindEx(null, "Dumbbell Press");
  assert.equal(effW(def, { wMode: "hand" }, 50), 50);
  assert.equal(effW(def, { wMode: "total" }, 100), 50);
  const hist = [{ w: 50, r: 8 }];
  const flags = prFlags(def, [{ w: 100, r: 8 }], hist, { date: "2026-09-21" }, { wMode: "total" });
  assert.equal(flags[0], false);
});

test("assisted PRs treat lower assist as better", () => {
  const def = testFindEx(null, "Assisted Dip Machine");
  const hist = [{ w: 80, r: 8 }];
  const flags = prFlags(def, [{ w: 50, r: 8 }, { w: 80, r: 12 }], hist, { date: "2026-09-21" });
  assert.equal(flags[0], "weight");
  assert.equal(flags[1], "reps");
});

test("gym-specific PR history stays in the current gym bucket", () => {
  const s = { gymSpecific: {}, currentGym: "g1", workouts: [
    logged("a", "2026-09-01", "Chest Press Machine", [[160, 10]], { gym: "g1", prBonus: 40, setXp: 20 }),
    logged("b", "2026-09-08", "Chest Press Machine", [[80, 10]], { gym: "g2", prBonus: 40, setXp: 20 }),
    logged("c", "2026-09-15", "Chest Press Machine", [[90, 10]], { gym: "g2", prBonus: 40, setXp: 20 }),
  ] };
  const next = recountPrBonuses(s, testFindEx);
  const g2 = next.workouts.find((w) => w.id === "c");
  assert.equal(g2.prBonus, PR_BONUS);
  const flags = g2.lines[0].sets.map((st) => st.pr);
  assert.equal(flags[0], "weight");
  const g1later = recountPrBonuses({
    ...s,
    workouts: [...s.workouts, logged("d", "2026-09-20", "Chest Press Machine", [[150, 8]], { gym: "g1", prBonus: 40, setXp: 20 })],
  }, testFindEx).workouts.find((w) => w.id === "d");
  assert.equal(g1later.prBonus, 0);
});

test("legacy assisted sets are ignored for PRs", () => {
  const s = { workouts: [
    logged("a", "2026-09-01", "Assisted Dip Machine", [[40, 8]], { prBonus: 40, setXp: 20 }),
    logged("b", "2026-09-21", "Assisted Dip Machine", [[80, 8]], { prBonus: 40, setXp: 20 }),
  ] };
  const next = recountPrBonuses(s, testFindEx);
  assert.equal(next.workouts[0].prBonus, 0);
  assert.equal(next.workouts[1].prBonus, PR_BONUS);
  assert.equal(next.workouts[1].lines[0].sets[0].pr, "weight");
});

test("set XP is unchanged and workouts without prBonus are untouched", () => {
  const withBonus = logged("a", "2026-09-21", "New Lift", [[95, 5], [135, 5], [185, 5]], { prBonus: 120, setXp: 30 });
  const without = { id: "b", date: "2026-09-22", title: "deck", source: "deck", exercises: [{ name: "Push-up", sets: [{ w: "", r: 20 }] }], xp: 15 };
  const s = { workouts: [withBonus, without] };
  const next = recountPrBonuses(s, testFindEx);
  assert.equal(next.workouts[0].lines[0].xp, 30);
  assert.deepEqual(next.workouts[0].lines[0].sets.map((st) => st.xp), [10, 10, 10]);
  assert.equal(next.workouts[0].prBonus, PR_BONUS);
  assert.equal(next.workouts[0].xp, 70);
  assert.equal(next.workouts[1], without);
});

test("floor is stored as a record and a second recount is a no-op", () => {
  const s = { xp: 1000, workouts: [logged("a", "2026-09-21", "New Lift", [[95, 5], [115, 5], [135, 5]], { prBonus: 120, setXp: 30 })] };
  const first = dryRunPrRecount(s, testFindEx);
  assert.equal(first.workouts[0].newBonus, PR_BONUS);
  const floor = nextXpFloor(first.recomputed, { beforeXp: 1000, version: 3, day: "2026-09-21" });
  assert.equal(floor.keep, xpAtLevelStart(levelFromXp(1000).lvl));
  assert.equal(floor.amount, Math.max(0, floor.keep - first.recomputed));
  const stored = { ...first.next, xp: first.final, xpFloor: floor };
  const second = dryRunPrRecount(stored, testFindEx);
  assert.equal(second.workouts[0].oldBonus, second.workouts[0].newBonus);
  assert.equal(second.recomputed, first.recomputed);
  const floor2 = nextXpFloor(second.recomputed, { xpFloor: stored.xpFloor, beforeXp: stored.xp, version: 3 });
  assert.equal(floor2.keep, floor.keep);
  assert.equal(floor2.amount, floor.amount);
});

test("unionAchievements never removes an earned id", () => {
  const ach = { "workouts-0": "2026-01-01", "rank-1": "2026-02-01" };
  const next = unionAchievements(ach, ["leveler-0"], "2026-09-21");
  assert.equal(next["workouts-0"], "2026-01-01");
  assert.equal(next["rank-1"], "2026-02-01");
  assert.equal(next["leveler-0"], "2026-09-21");
});

test("gym retag recounts PRs and recomputes the floor instead of stacking", () => {
  const s = {
    xp: 500,
    xpFloor: { v: 3, amount: 80, keep: 400, d: "2026-09-20" },
    gyms: [{ id: "g1", name: "East" }, { id: "g2", name: "West" }],
    currentGym: "g1",
    workouts: [
      logged("a", "2026-09-01", "Chest Press Machine", [[160, 10]], { prBonus: 40, setXp: 20, gym: "g1" }),
      logged("b", "2026-09-08", "Chest Press Machine", [[80, 8]], { prBonus: 40, setXp: 20 }),
    ],
  };
  const tagged = tagWorkouts(s, { gymId: "g1", untaggedOnly: true });
  assert.equal(tagged.workouts[1].gym, "g1");
  const names = gymSpecificNamesIn(tagged, retaggedWorkouts(s, tagged), testFindEx);
  assert.deepEqual(names, ["Chest Press Machine"]);
  const after = dryRunPrRecount(tagged, testFindEx);
  assert.equal(after.workouts.find((w) => w.date === "2026-09-08").newBonus, 0);
  const floor2 = nextXpFloor(after.recomputed, { xpFloor: s.xpFloor, beforeXp: s.xp, version: 3 });
  assert.equal(floor2.keep, 400);
  assert.ok(floor2.amount !== (s.xpFloor.amount + 80));
  assert.equal(floor2.amount, Math.max(0, 400 - after.recomputed));
  const again = dryRunPrRecount({ ...after.next, xp: after.final, xpFloor: floor2 }, testFindEx);
  const floor3 = nextXpFloor(again.recomputed, { xpFloor: floor2, beforeXp: after.final, version: 3 });
  assert.equal(floor3.amount, floor2.amount);
  assert.equal(floor3.keep, 400);
});

test("merge recounts PRs for the canonical name", () => {
  const s = {
    workouts: [
      logged("a", "2026-09-01", "lat pulldown", [[100, 8]], { prBonus: 40, setXp: 20 }),
      logged("b", "2026-09-08", "Lat Pulldown", [[120, 8]], { prBonus: 40, setXp: 20 }),
    ],
  };
  const merged = applyExerciseMerge(s, [{ names: ["lat pulldown", "Lat Pulldown"], canonical: "Lat Pulldown" }]);
  const next = recountPrBonuses(merged, testFindEx, { names: ["Lat Pulldown", "lat pulldown"] });
  assert.equal(next.workouts[0].exercises[0].name, "Lat Pulldown");
  assert.equal(next.workouts[1].exercises[0].name, "Lat Pulldown");
  assert.equal(next.workouts[0].prBonus, PR_BONUS);
  assert.equal(next.workouts[1].prBonus, PR_BONUS);
});


