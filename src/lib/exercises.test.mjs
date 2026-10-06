import { test } from "node:test";
import assert from "node:assert/strict";
import { exerciseGroups } from "./exercises.js";

const L = [
  { name: "Bench Press", group: "Chest" },
  { name: "Squat", group: "Legs" },
  { name: "Barbell Row", group: "Back" },
  { name: "Sled Push", group: "Cardio" },
  { name: "Weird Lift", group: "Custom" },
];

test("exerciseGroups orders catalog groups and appends strays", () => {
  const g = exerciseGroups(L);
  assert.deepEqual(g.map((x) => x.group), ["Chest", "Back", "Legs", "Cardio", "Custom"]);
});

test("exerciseGroups filters case-insensitive substring and prunes empty groups", () => {
  const g = exerciseGroups(L, "PRESS");
  assert.deepEqual(g.map((x) => x.group), ["Chest"]);
  assert.deepEqual(g[0].items.map((e) => e.name), ["Bench Press"]);
});

test("exerciseGroups trims query and returns [] when nothing matches", () => {
  assert.equal(exerciseGroups(L, "  squat  ")[0].items[0].name, "Squat");
  assert.deepEqual(exerciseGroups(L, "zzz"), []);
});
