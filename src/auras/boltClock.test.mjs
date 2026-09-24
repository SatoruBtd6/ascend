import test from "node:test";
import assert from "node:assert/strict";
import { FLASH_MIN_GAP, noteStrikeFlash, setFlashPageClock } from "./boltClock.js";

// The page-wide budget runs on a wall clock; drive it with the strike's own
// timestamp so each test gets a deterministic shared timeline.
let pageT = 0;
setFlashPageClock(() => pageT);

function run(strikes) {
  let state = { last: null, burstFlashed: false };
  const fired = [];
  for (const s of strikes) {
    pageT = s.now;
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

test("the flash budget is shared across instances on the page", () => {
  // three independent strike streams (three avatars) on one shared timeline:
  // combined flashes must stay under 3 per second even though each stream is
  // sparse enough to pass its own per-instance gate
  const states = [0, 1, 2].map(() => ({ last: null, burstFlashed: false }));
  const fired = [];
  for (let t = 0; t < 10; t += 0.11) {
    for (const inst of [0, 1, 2]) {
      pageT = t;
      const gate = noteStrikeFlash(states[inst], { now: t, reduce: false, enabled: true, burstStart: true });
      states[inst] = { last: gate.last, burstFlashed: gate.burstFlashed };
      if (gate.fired) fired.push(t);
    }
  }
  for (let start = 0; start <= 9; start += 0.05) {
    const inWindow = fired.filter((t) => t >= start - 1e-9 && t <= start + 1 + 1e-9).length;
    assert.ok(inWindow <= 3, `${inWindow} flashes in [${start}, ${start + 1}] across instances`);
  }
  assert.ok(fired.length <= Math.floor(10 / FLASH_MIN_GAP) + 1, `page total ${fired.length} exceeded the shared budget`);
});
