import { scoreFor } from "./stats.js";
import { GPS_PACE_SEED, GPS_CLIMB_SEED, GPS_PACE_MAX, GPS_CLIMB_CAP_FTMI, GPS_SCORE_V } from "../data/cardio.js";

// GPS outdoor bonuses — pace (run/walk only, small) + climb (all modes) on
// top of the flat miles base. Ladders personalize exactly like machine cardio
// (stats.js cardioSteps): the seed keeps its shape but recentres on the
// user's own median over their first 5 stamped sessions, last 40 sampled.
// Bonus amounts are stored absolute on run.score at save — recount replays
// w.xp, so stored amounts are the only stable representation of a drifting
// personal ladder.
const RATE = { run: 6, walk: 3, hike: 4 };
const normMode = (m) => (m === "walk" ? "walk" : m === "hike" ? "hike" : "run");

// Per-mode {mi, s} from a saved run's segment list.
export function modeAgg(run) {
  const agg = { run: { mi: 0, s: 0 }, walk: { mi: 0, s: 0 }, hike: { mi: 0, s: 0 } };
  (run?.segments || []).forEach((x) => {
    const m = normMode(x.mode);
    agg[m].mi += +x.miles || 0;
    agg[m].s += +x.secs || 0;
  });
  if (!run?.segments?.length) {
    const rm = +run?.runMiles || 0, wm = +run?.walkMiles || 0, hm = +run?.hikeMiles || 0;
    if (rm + wm + hm > 0) {
      // mode-mile rows carry no per-mode time — apportion session secs by
      // distance share so older saved shapes still score meaningfully.
      const tot = rm + wm + hm, s = +run?.secs || 0;
      agg.run = { mi: rm, s: (rm / tot) * s };
      agg.walk = { mi: wm, s: (wm / tot) * s };
      agg.hike = { mi: hm, s: (hm / tot) * s };
    } else if (+run?.miles > 0 && +run?.secs > 0) {
      agg[normMode(run?.mode)] = { mi: +run.miles, s: +run.secs };
    }
  }
  return agg;
}

function blendSteps(seed, samples) {
  const recent = samples.slice(-40);
  if (!recent.length) return seed;
  const sorted = [...recent].sort((a, b) => a - b);
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  const t = Math.min(1, samples.length / 5);
  return seed.map((v) => v * (1 + t * (median / seed[2] - 1)));
}

const stampedRuns = (s) => (s.workouts || []).filter((w) => w.run?.score?.v >= GPS_SCORE_V);

// Per-mode pace ladder (mi/min), blended on the user's stamped sessions.
// Glitch-clamped paces never feed the ladder — they'd ratchet it upward.
export function gpsPaceSteps(s, mode) {
  const samples = [];
  stampedRuns(s).forEach((w) => {
    const { mi, s: sec } = modeAgg(w.run)[mode];
    const min = sec / 60;
    if (mi > 0.05 && min >= 0.5 && mi / min <= GPS_PACE_MAX[mode] / 60) samples.push(mi / min);
  });
  return blendSteps(GPS_PACE_SEED[mode], samples);
}

// Per-mode climb ladder (ft/mi), blended on stamped sessions that have
// elevation and spend a meaningful amount of time in the mode.
export function gpsClimbSteps(s, mode) {
  const samples = [];
  stampedRuns(s).forEach((w) => {
    const r = w.run;
    if (r.elev?.gainFt == null || !(r.miles > 0.05)) return;
    if (modeAgg(r)[mode].s / 60 < 0.5) return;
    samples.push(Math.min(GPS_CLIMB_CAP_FTMI, r.elev.gainFt / r.miles));
  });
  return blendSteps(GPS_CLIMB_SEED[mode], samples);
}

// Score one session's bonuses. run = runInfo (segments + miles + elev).
// Returns { v, pace, climb|null, base }: pace and climb are absolute XP
// amounts to store on run.score; climb is null when elevation is pending.
// Caps: pace alone <= 20% of the time base; pace+climb together <= 60%.
export function gpsBonus(s, run) {
  const agg = modeAgg(run);
  let base = 0, paceXp = 0, climbXp = 0;
  const ftMi = run?.elev?.gainFt != null && run.miles > 0.05 ? Math.min(GPS_CLIMB_CAP_FTMI, run.elev.gainFt / run.miles) : null;
  for (const m of ["run", "walk", "hike"]) {
    const { mi, s: sec } = agg[m];
    const min = sec / 60;
    if (min <= 0) continue;
    const modeBase = min * RATE[m];
    base += modeBase;
    // Pace: runs and walks only — hiking pace mostly reflects trail steepness.
    // Moving pace (paused time excluded); a segment faster than the plausible
    // human clamp is GPS jitter — ignored, never rewarded.
    if (m !== "hike" && mi > 0.05 && mi / min <= GPS_PACE_MAX[m] / 60) {
      paceXp += Math.min(Math.round(modeBase * 0.2), Math.round(modeBase * Math.min(scoreFor(mi / min, gpsPaceSteps(s, m)), 6) / 30));
    }
    // Climb: every mode earns against its own ladder from the session's
    // shared ft/mi — terrain is terrain however you covered it.
    if (ftMi != null) {
      climbXp += Math.round(modeBase * Math.min(scoreFor(ftMi, gpsClimbSteps(s, m)), 6) * 0.1);
    }
  }
  const combined = Math.min(Math.round(base * 0.6), paceXp + climbXp);
  return { v: GPS_SCORE_V, pace: paceXp, climb: run?.elev ? Math.min(climbXp, Math.max(0, combined - paceXp)) : null, base: Math.round(base) };
}

// Merge a reconcile result ({elev?, elevP}) onto one saved workout. When the
// session is stamped and still waiting on its climb bonus, the bonus is
// computed and stored absolute on run.score — w.xp is bumped by the same
// amount so recount replays it. Idempotent: a second application (or two
// devices racing) finds score.climb already set and adds zero. Returns
// {workouts, climb} — the caller posts `climb` through the xpDone-keyed
// gainXp path.
export function mergeElevResult(p, wid, res) {
  let climb = 0;
  const workouts = p.workouts.map((x) => {
    if (x.id !== wid) return x;
    const run = { ...x.run, ...(res.elev ? { elev: res.elev } : {}), elevP: res.elevP };
    if (res.elev && run.score?.v >= GPS_SCORE_V && run.score.climb == null) {
      climb = gpsBonus(p, { ...x.run, elev: res.elev }).climb || 0;
      run.score = { ...run.score, climb };
    }
    return { ...x, run, xp: x.xp + climb };
  });
  return { workouts, climb };
}
