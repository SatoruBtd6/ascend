import { test } from "node:test";
import assert from "node:assert/strict";
import { logTutorialWeight } from "./onboardingWeight.js";

test("a fresh account gets today's first weight entry", () => {
  const next = logTutorialWeight({}, "2026-09-22", 170);
  assert.deepEqual(next, { "2026-09-22": 170 });
  assert.equal(Object.keys(next).length, 1);
});

test("the same weight already logged today is left as the one entry", () => {
  const log = { "2026-09-21": 168, "2026-09-22": 170 };
  const next = logTutorialWeight(log, "2026-09-22", 170);
  assert.equal(next, log);
  assert.deepEqual(Object.entries(next).filter(([d]) => d === "2026-09-22"), [["2026-09-22", 170]]);
});

test("a different weight today replaces that day's entry", () => {
  const next = logTutorialWeight({ "2026-09-22": 168 }, "2026-09-22", 171);
  assert.deepEqual(next, { "2026-09-22": 171 });
  assert.equal(Object.keys(next).length, 1);
});
