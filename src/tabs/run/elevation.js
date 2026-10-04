import { decodePoly, thinPts } from "./polyline.js";
import { GPS_SCORE_V } from "../../data/cardio.js";

// Terrain elevation is the only altitude source — iOS Safari's GPS altitude is
// too noisy to score and the barometer is native-only. Open-Meteo's elevation
// endpoint is free, keyless, batches ~100 coords per call, and is the same
// domain the weather fetch already uses, so the privacy story is unchanged.
export const ELEV_V = 1;
export const M_PER_FT = 0.3048;

// ~80m spacing keeps a marathon under the ~100-point batch cap.
export const elevSamplePts = (pts, spacingM = 80, maxPts = 95) => thinPts(pts, spacingM, maxPts);

// Gain/loss with hysteresis: the reference only moves once the series drifts
// more than `hyst` metres from it, so the DEM's integer-metre steps can't
// accumulate noise across a long flat stretch. Pure; unit-testable.
export function gainLoss(elevM, hyst = 4) {
  if (!elevM?.length) return null;
  let ref = elevM[0], gain = 0, loss = 0, peak = elevM[0];
  for (const e of elevM) {
    if (e > peak) peak = e;
    const d = e - ref;
    if (d > hyst) { gain += d; ref = e; }
    else if (d < -hyst) { loss += -d; ref = e; }
  }
  return { gainFt: Math.round(gain / M_PER_FT), lossFt: Math.round(loss / M_PER_FT), peakFt: Math.round(peak / M_PER_FT) };
}

// One batch call for a thinned path. Returns
// {v, gainFt, lossFt, peakFt, profile:[ft]} or null on fetch failure (retry).
export async function fetchElevation(pts) {
  if (!pts?.length) return null;
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const lat = pts.map((p) => (+p[0]).toFixed(4)).join(","), lng = pts.map((p) => (+p[1]).toFixed(4)).join(",");
    const r = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`, { signal: ctl.signal });
    const j = await r.json();
    const arr = j?.elevation;
    if (!Array.isArray(arr) || !arr.length) return null;
    const gl = gainLoss(arr);
    if (!gl) return null;
    return { ...gl, profile: arr.map((m) => Math.round(m / M_PER_FT)), v: ELEV_V };
  } catch (e) { return null; } finally { clearTimeout(t); }
}

// Reconcile marker — elev is missing and not yet proven unreachable. Covers
// both stamped sessions waiting on a climb bonus (elevP:"pend") and legacy
// rows being backfilled for display only. Stamped "done"/"none" never revisit.
export const elevNeedsScan = (w) => !!(w?.run?.hasMap && w.run.elevP !== "done" && w.run.elevP !== "none" && !(w.run.elev?.v >= ELEV_V));

// Fetch elevation for one saved session from its stored track. Returns
// {elev, elevP} to merge onto w.run, or null on network failure (retry next
// load). Rows with no retrievable track freeze as elevP:"none".
export async function reconcileRunElevation(w, get) {
  let pts = null;
  try {
    const r = await get(`run:${w.run.id || w.id}`);
    pts = decodePoly(r?.value || "");
  } catch (e) { /* track blob unavailable */ }
  if (!pts?.length) return { elevP: "none" };
  const elev = await fetchElevation(elevSamplePts(pts));
  if (!elev) return null;
  return { elev, elevP: "done" };
}

// The climb-bonus post is idempotent by construction: score.climb is an
// absolute stamped amount on the workout, and xpFromRecords replays w.xp —
// applying the reconcile twice (or on two devices racing) stores the same
// value and adds zero the second time.
export const climbPending = (w) => !!(w?.run?.score?.v >= GPS_SCORE_V && w.run.score.climb == null && w.run.elevP === "pend");
