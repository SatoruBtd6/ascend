import { test } from "node:test";
import assert from "node:assert/strict";
import { ladderRanks, RANKS } from "./ranks.js";

test("ladderRanks hides SS below overall score 6", () => {
  const ids = ladderRanks(0).map((r) => r.id);
  assert.deepEqual(ids, ["S", "A", "B", "C", "D", "E"]);
  assert.ok(!ids.includes("SS"));
  assert.equal(ladderRanks(5.99).length, 6);
});

test("ladderRanks reveals SS at score 6 and keeps order top-down", () => {
  const ids = ladderRanks(6).map((r) => r.id);
  assert.equal(ids.length, RANKS.length);
  assert.equal(ids[0], "SS");
  assert.equal(ids[ids.length - 1], "E");
});
