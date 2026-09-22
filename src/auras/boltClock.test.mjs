import test from "node:test";
import assert from "node:assert/strict";
import { FLASH_MIN_GAP, noteStrikeFlash } from "./boltClock.js";

function run(strikes) {
  let state = { last: null, burstFlashed: false };
  const fired = [];
  for (const s of strikes) {
    const gate = noteStrikeFlash(state, s);
    state = { last: gate.last, burstFlashed: gate.burstFlashed };
    if (gate.fired) fired.push(s.now);
  }
  return fired;
}

test("a 3-strike burst inside 400ms flashes once", () => {
  const fired = run([
    { now: 0, reduce: false, enabled: true, burstStart: true },
    { now: 0.12, reduce: false, enabled: true, burstStart: false },
    { now: 0.28, reduce: false, enabled: true, burstStart: false },
  ]);
  assert.deepEqual(fired, [0]);
});

test("heavy strikes stay at or under 3 flashes per second", () => {
  const strikes = [];
  for (let t = 0; t < 10; t += 0.05) {
    strikes.push({ now: Math.round(t * 1000) / 1000, reduce: false, enabled: true, burstStart: true });
  }
  const fired = run(strikes);
  assert.ok(fired.length <= Math.floor(10 / FLASH_MIN_GAP) + 1);
  for (let start = 0; start <= 9; start += 0.05) {
    const closed = fired.filter((t) => t >= start - 1e-9 && t <= start + 1 + 1e-9).length;
    assert.ok(closed <= 3, `${closed} flashes in [${start}, ${start + 1}]`);
  }
});

test("reduced motion never flashes", () => {
  const fired = run([
    { now: 0, reduce: true, enabled: true, burstStart: true },
    { now: 0.2, reduce: true, enabled: true, burstStart: false },
    { now: 1, reduce: true, enabled: true, burstStart: true },
  ]);
  assert.deepEqual(fired, []);
});
