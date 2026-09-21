import test from "node:test";
import assert from "node:assert/strict";
import { classifyStepCount, stepIngestPlan, parseSteps } from "../api/steps.js";

test("empty or missing steps is blank: ok, ingest nothing, not coerced to 0", () => {
  for (const raw of [undefined, null, "", "  "]) {
    assert.deepEqual(classifyStepCount(raw), { kind: "blank" });
  }
  for (const body of [{}, { steps: "" }, { steps: "  " }, { step: null }, { count: undefined }]) {
    const plan = stepIngestPlan(body);
    assert.equal(plan.ok, true);
    assert.equal(plan.ingest, false);
    assert.equal(plan.status, 200);
    assert.equal(plan.steps, undefined);
    assert.notEqual(plan.steps, 0);
    assert.match(plan.message, /No steps/);
  }
  assert.equal(parseSteps(""), null);
  assert.equal(parseSteps(undefined), null);
});

test("a real 0 is still a count, not a blank", () => {
  assert.deepEqual(classifyStepCount(0), { kind: "ok", steps: 0 });
  assert.deepEqual(classifyStepCount("0"), { kind: "ok", steps: 0 });
  const plan = stepIngestPlan({ steps: 0 });
  assert.equal(plan.ingest, true);
  assert.equal(plan.steps, 0);
});

test("non-numeric text is rejected and does not ingest", () => {
  for (const raw of ["hello", "n/a", "—", "none", "abc"]) {
    const classified = classifyStepCount(raw);
    assert.equal(classified.kind, "invalid");
    const plan = stepIngestPlan({ steps: raw });
    assert.equal(plan.ok, false);
    assert.equal(plan.ingest, false);
    assert.equal(plan.status, 400);
    assert.match(plan.message, /couldn't read the steps/);
  }
});
