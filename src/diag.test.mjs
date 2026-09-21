import test from "node:test";
import assert from "node:assert/strict";
import { formatDump, sampleEvents, dumpHasContent, push, on } from "./diag.js";

test("diag dump contains no food or exercise content strings", () => {
  const text = formatDump({ version: "7a.1", sw: "ascend-v7a.1", events: sampleEvents() });
  assert.equal(dumpHasContent(text), false);
  assert.equal(text.includes("Chicken"), false);
  assert.equal(text.includes("Bench"), false);
  assert.equal(text.includes("Terry"), false);
  assert.ok(text.includes("\"k\":\"check\""));
  assert.ok(text.includes("\"v\":\"7a.1\""));
  assert.match(text, /"len":\d+/);
});

test("diag is off by default and push is a no-op", () => {
  assert.equal(on(), false);
  push({ k: "inp", kind: "fuel-search", type: "insertText", secret: "Chicken Breast extra" });
  const text = formatDump({ version: "7a.1", events: [] });
  assert.equal(text.includes("Chicken"), false);
  assert.equal(on(), false);
});
