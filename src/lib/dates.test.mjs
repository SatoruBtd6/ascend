import test from "node:test";
import assert from "node:assert/strict";
import { weekDays, weekTitle, ymOf, monthLabel } from "./dates.js";

test("weekDays returns the Sun–Sat week containing the day", () => {
  // 2026-10-07 is a Wednesday; its week is Sun Oct 4 – Sat Oct 10.
  assert.deepEqual(weekDays("2026-10-07"), ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"]);
});

test("weekDays crosses a month boundary", () => {
  // 2026-09-30 is a Wednesday; week is Sun Sep 27 – Sat Oct 3.
  const w = weekDays("2026-09-30");
  assert.equal(w[0], "2026-09-27");
  assert.equal(w[6], "2026-10-03");
  assert.equal(w.length, 7);
});

test("weekTitle joins one month and splits across months", () => {
  assert.equal(weekTitle("2026-10-07"), "Oct 4 – 10");
  assert.equal(weekTitle("2026-09-30"), "Sep 27 – Oct 3");
});

test("ymOf reads year/month from a dkey", () => {
  assert.deepEqual(ymOf("2026-10-04"), { y: 2026, m: 9 });
  assert.deepEqual(ymOf("2025-12-31"), { y: 2025, m: 11 });
});

test("monthLabel: This month for now, bare name same year, name + year otherwise", () => {
  const now = new Date(2026, 9, 5); // Oct 2026
  assert.equal(monthLabel(2026, 9, now), "This month");
  assert.equal(monthLabel(2026, 8, now), "September");
  assert.equal(monthLabel(2025, 11, now), "December 2025");
});
