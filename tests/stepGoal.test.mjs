import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { awardStepGoal } from "../src/tabs/run/stepGoal.js";
import { today } from "../src/lib/dates.js";
import { STEP_GOAL_XP } from "../src/tabs/train/xpConstants.js";

test("step-goal XP awards exactly once — reopening or remounting never re-awards", () => {
  const d = today();
  const calls = [];
  const gainXp = (n, label, id) => calls.push({ n, label, id });
  let s = { steps: { [d]: 12000 }, settings: { stepGoal: 10000 } };
  const setS = (fn) => { s = fn(s); };
  assert.equal(awardStepGoal(s, setS, gainXp), true);
  // Simulates the steps section being collapsed/opened/remounted repeatedly:
  // the stepXp stamp in state makes every later call a no-op.
  for (let i = 0; i < 5; i++) assert.equal(awardStepGoal(s, setS, gainXp), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].n, STEP_GOAL_XP);
  assert.equal(calls[0].id, `steps_${d}`);
  assert.equal(s.stepXp[d], true);
});

test("step-goal XP never awards under goal or when already stamped", () => {
  const d = today();
  const calls = [];
  const gainXp = (...a) => calls.push(a);
  let s = { steps: { [d]: 400 }, settings: { stepGoal: 10000 } };
  const setS = (fn) => { s = fn(s); };
  assert.equal(awardStepGoal(s, setS, gainXp), false);
  s = { steps: { [d]: 15000 }, settings: { stepGoal: 10000 }, stepXp: { [d]: true } };
  assert.equal(awardStepGoal(s, setS, gainXp), false);
  assert.equal(calls.length, 0);
});

test("StepsPanel renders steps UI but no longer grants step-goal XP", () => {
  const src = readFileSync(new URL("../src/tabs/run/StepsPanel.jsx", import.meta.url), "utf8");
  assert.equal(src.includes("gainXp(STEP_GOAL_XP"), false);
  assert.equal(src.includes("stepXp"), false);
});
