/** Minimum gap between full-frame flashes. Three gaps exceed one second, so any 1s window holds at most 3. */
export const FLASH_MIN_GAP = 0.334;

export function allowFlash(now, last, minGap = FLASH_MIN_GAP) {
  if (last == null || !Number.isFinite(last)) return true;
  return now - last >= minGap - 1e-6;
}

// Page-wide flash budget shared by every aura instance on the page: the same
// minimum gap applies to flashes anywhere, so any 1s window holds at most 3
// total no matter how many auras are mounted. Measured on a wall clock —
// instance clocks each start at 0 and can't be compared across instances.
const defaultPageNow = () => (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) / 1000;
let pageNow = defaultPageNow;
const pageFlash = { last: -Infinity };
// Test/script hook: inject a deterministic page clock. A rewound page clock
// (fresh test or scripted frame stepping) resets the budget; the wall clock
// never rewinds in production.
export function setFlashPageClock(fn) {
  pageNow = typeof fn === "function" ? fn : defaultPageNow;
  pageFlash.last = -Infinity;
}

// One flash per burst, and never sooner than FLASH_MIN_GAP. Reduced motion never flashes.
// `burstStart` is true only for the first strike of a burst.
export function noteStrikeFlash(state, { now, reduce, enabled, burstStart }) {
  const next = {
    last: state.last,
    burstFlashed: burstStart ? false : !!state.burstFlashed,
    fired: false,
  };
  if (!enabled || reduce) return next;
  if (next.burstFlashed) return next;
  if (!allowFlash(now, next.last)) return next;
  const pNow = pageNow();
  if (pNow < pageFlash.last) pageFlash.last = -Infinity;
  if (!allowFlash(pNow, pageFlash.last)) return next;
  next.fired = true;
  next.last = now;
  next.burstFlashed = true;
  pageFlash.last = pNow;
  return next;
}
