/** Minimum gap between full-frame flashes. Three gaps exceed one second, so any 1s window holds at most 3. */
export const FLASH_MIN_GAP = 0.334;

export function allowFlash(now, last, minGap = FLASH_MIN_GAP) {
  if (last == null || !Number.isFinite(last)) return true;
  return now - last >= minGap - 1e-6;
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
  next.fired = true;
  next.last = now;
  next.burstFlashed = true;
  return next;
}
