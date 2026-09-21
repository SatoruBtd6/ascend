/** GPS run engine + run/walk segments. Pure; safe to unit-test. */

export const MI_M = 1609.344;
export const RUN_LIMITS = { run: { max: 7.5 }, walk: { max: 3.2 } };
export const SWITCH_GRACE_MS = 30000;
export const MIN_SEGMENT_MS = 5000;
export const MIN_SAVE_MIN = 0.1;
export const SLOW_RUN_MPH = 4;
const M_LAT = 111320;

export function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s2 = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s2).padStart(2, "0")}` : `${m}:${String(s2).padStart(2, "0")}`;
}
export function fmtPace(secPerMi) {
  return !isFinite(secPerMi) || secPerMi <= 0 || secPerMi > 3600 ? "–:––" : fmtDur(secPerMi);
}

export function havM(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

export function newRun(mode = "run", guide = null, now = Date.now(), id = Math.random().toString(36).slice(2, 10)) {
  const m = mode === "walk" ? "walk" : "run";
  return {
    id, mode: m, guide, startedAt: now, pausedTotal: 0, pausedAt: null,
    dist: 0, pts: [], last: null, kf: null, anchor: null, rejects: 0,
    splits: [], gapM: 0, weak: false, fixes: 0, o: null, switchAt: null,
    segments: [{ mode: m, start: now, pausedTotal: 0, dist: 0 }],
  };
}

export function ensureSegments(r) {
  if (!r) return r;
  if (Array.isArray(r.segments) && r.segments.length) return r;
  const m = r.mode === "walk" ? "walk" : "run";
  return {
    ...r,
    mode: m,
    segments: [{ mode: m, start: r.startedAt || 0, pausedTotal: r.pausedTotal || 0, dist: r.dist || 0 }],
  };
}

export function runElapsed(r, now = Date.now()) {
  return Math.max(0, (now - r.startedAt - r.pausedTotal - (r.pausedAt ? now - r.pausedAt : 0)) / 1000);
}

export function segmentMovingSecs(seg, now, { pausedAt = null, isOpen = false } = {}) {
  const pauseExtra = isOpen && pausedAt ? Math.max(0, now - pausedAt) : 0;
  return Math.max(0, (now - seg.start - (seg.pausedTotal || 0) - pauseExtra) / 1000);
}

export function openSegment(r) {
  const segs = r?.segments;
  return segs?.length ? segs[segs.length - 1] : null;
}

export function speedMaxForFix(r, fix) {
  const curMax = RUN_LIMITS[r.mode]?.max || 7.5;
  const other = r.mode === "run" ? "walk" : "run";
  const otherMax = RUN_LIMITS[other]?.max || 7.5;
  const switched = r.switchAt != null;
  const t = fix?.t ?? 0;
  const withinGrace = switched && t - r.switchAt >= 0 && t - r.switchAt <= SWITCH_GRACE_MS;
  const lastT = r.kf?.t ?? r.last?.t ?? r.startedAt;
  const gapSpansSwitch = switched && lastT != null && r.switchAt >= lastT && r.switchAt <= t;
  if (withinGrace || gapSpansSwitch) return Math.max(curMax, otherMax);
  return curMax;
}

function attribDist(prev, next) {
  const d = (next.dist || 0) - (prev.dist || 0);
  if (!(d > 0)) return next;
  const segs = (next.segments || prev.segments || []).map((s) => ({ ...s }));
  if (!segs.length) return next;
  const i = segs.length - 1;
  segs[i] = { ...segs[i], dist: (segs[i].dist || 0) + d };
  return { ...next, segments: segs };
}

export function withSplits(prev, next, t) {
  const miles = Math.floor(next.dist / MI_M);
  if (miles > prev.splits.length) {
    const el = runElapsed(next, t);
    const done = prev.splits.reduce((a, x) => a + x, 0);
    const add = [];
    for (let k = prev.splits.length; k < miles; k++) add.push(Math.round((el - done) / (miles - prev.splits.length)));
    return { ...next, splits: [...prev.splits, ...add] };
  }
  return next;
}

export function addFix(r, fix) {
  r = ensureSegments(r);
  const next = { ...r, fixes: r.fixes + 1 };
  if (r.pausedAt) { next.kf = null; next.anchor = null; return next; }
  if (!isFinite(fix.lat) || !isFinite(fix.lng)) return next;
  if (fix.acc > 35) { next.weak = true; return next; }
  next.weak = fix.acc > 20;
  const o = r.o || { lat: fix.lat, lng: fix.lng, k: M_LAT * Math.cos((fix.lat * Math.PI) / 180) };
  next.o = o;
  const zx = (fix.lng - o.lng) * o.k, zy = (fix.lat - o.lat) * M_LAT, R = Math.max(9, fix.acc * fix.acc);
  const toLL = (x, y) => [o.lat + y / M_LAT, o.lng + x / o.k];
  const max = speedMaxForFix(r, fix);

  if (!r.kf) {
    next.kf = { x: zx, y: zy, P: R, t: fix.t };
    if (!r.anchor) {
      next.anchor = { x: zx, y: zy, t: fix.t };
      next.pts = [...r.pts, [...toLL(zx, zy), fix.t, r.pts.length ? 1 : 0]];
    }
    next.last = { p: toLL(zx, zy), t: fix.t, acc: fix.acc };
    return attribDist(r, next);
  }
  const dt = (fix.t - r.kf.t) / 1000;
  if (dt <= 0) return next;

  if (dt > 25) {
    const a = r.anchor || { x: r.kf.x, y: r.kf.y, t: r.kf.t };
    const d = Math.hypot(zx - a.x, zy - a.y), sp = d / ((fix.t - a.t) / 1000);
    next.kf = { x: zx, y: zy, P: R, t: fix.t };
    next.anchor = { x: zx, y: zy, t: fix.t };
    if (sp <= max) { next.dist = r.dist + d; next.gapM = r.gapM + d; }
    next.pts = [...r.pts, [...toLL(zx, zy), fix.t, 1]];
    next.last = { p: toLL(zx, zy), t: fix.t, acc: fix.acc };
    return attribDist(r, withSplits(r, next, fix.t));
  }

  const Q = 2.5 * dt * (1 + dt);
  const P = r.kf.P + Q;
  const innov = Math.hypot(zx - r.kf.x, zy - r.kf.y);
  if (innov > Math.max(45, 3 * Math.sqrt(P + R)) && innov / dt > max * 1.5) {
    next.rejects = r.rejects + 1;
    if (next.rejects >= 4) { next.kf = { x: zx, y: zy, P: R, t: fix.t }; next.anchor = { x: zx, y: zy, t: fix.t }; next.rejects = 0; next.pts = [...r.pts, [...toLL(zx, zy), fix.t, 2]]; }
    return next;
  }
  next.rejects = 0;
  const K = P / (P + R);
  const kx = r.kf.x + K * (zx - r.kf.x), ky = r.kf.y + K * (zy - r.kf.y);
  next.kf = { x: kx, y: ky, P: (1 - K) * P, t: fix.t };
  next.last = { p: toLL(kx, ky), t: fix.t, acc: fix.acc };

  const a = r.anchor || { x: kx, y: ky, t: fix.t };
  const d = Math.hypot(kx - a.x, ky - a.y);
  const need = Math.max(11, Math.min(25, fix.acc * 1.1));
  if (d >= need) {
    const sp = d / Math.max(1, (fix.t - a.t) / 1000);
    if (sp <= max * 1.3) next.dist = r.dist + d;
    next.anchor = { x: kx, y: ky, t: fix.t };
    next.pts = [...r.pts, [...toLL(kx, ky), fix.t, 0]];
  }
  return attribDist(r, withSplits(r, next, fix.t));
}

export function applyFixes(r, fixes) {
  return (fixes || []).reduce((acc, f) => addFix(acc, f), r);
}

export function currentPace(r, now = Date.now()) {
  const recent = r.pts.filter((x) => now - x[2] <= 40000 && x[3] !== 2);
  if (recent.length < 2) return Infinity;
  let d = 0; for (let i = 1; i < recent.length; i++) d += havM(recent[i - 1], recent[i]);
  const dt = (recent[recent.length - 1][2] - recent[0][2]) / 1000;
  return d > 15 ? dt / (d / MI_M) : Infinity;
}

export function toggleRunPause(r, now = Date.now()) {
  r = ensureSegments(r);
  if (r.pausedAt) {
    const dt = Math.max(0, now - r.pausedAt);
    const segs = r.segments.map((s, i) => (i === r.segments.length - 1 ? { ...s, pausedTotal: (s.pausedTotal || 0) + dt } : s));
    return { ...r, pausedTotal: r.pausedTotal + dt, pausedAt: null, last: null, segments: segs };
  }
  return { ...r, pausedAt: now };
}

export function switchRunMode(r, mode, now = Date.now()) {
  const m = mode === "walk" ? "walk" : "run";
  r = ensureSegments(r);
  if (m === r.mode) return r;
  const segs = r.segments.map((s) => ({ ...s }));
  let pausedAt = r.pausedAt;
  let pausedTotal = r.pausedTotal;
  if (pausedAt) {
    const dt = Math.max(0, now - pausedAt);
    segs[segs.length - 1] = { ...segs[segs.length - 1], pausedTotal: (segs[segs.length - 1].pausedTotal || 0) + dt };
    pausedTotal += dt;
    pausedAt = now;
  }
  const cur = segs[segs.length - 1];
  const elapsedMs = now - cur.start - (cur.pausedTotal || 0);
  if (elapsedMs < MIN_SEGMENT_MS) {
    if (segs.length > 1) {
      const prev = segs[segs.length - 2];
      const merged = { ...prev, dist: (prev.dist || 0) + (cur.dist || 0) };
      const rest = segs.slice(0, -2);
      if (merged.mode === m) {
        return { ...r, mode: m, segments: [...rest, merged], pausedAt, pausedTotal, switchAt: now };
      }
      return { ...r, mode: m, segments: [...rest, merged, { mode: m, start: now, pausedTotal: 0, dist: 0 }], pausedAt, pausedTotal, switchAt: now };
    }
    segs[0] = { ...cur, mode: m };
    return { ...r, mode: m, segments: segs, pausedAt, pausedTotal, switchAt: now };
  }
  segs.push({ mode: m, start: now, pausedTotal: 0, dist: 0 });
  return { ...r, mode: m, segments: segs, pausedAt, pausedTotal, switchAt: now };
}

export function mphOf(meters, secs) {
  if (!(secs > 0) || !(meters > 0)) return 0;
  return (meters / MI_M) / (secs / 3600);
}

export function runKind(info) {
  if (!info) return "run";
  const hasRun = (+info.runMiles || 0) > 0;
  const hasWalk = (+info.walkMiles || 0) > 0;
  if (hasRun && hasWalk) return "runwalk";
  if (hasRun) return "run";
  if (hasWalk) return "walk";
  return info.mode === "walk" ? "walk" : "run";
}

export function runTitle(info) {
  const k = runKind(info);
  return k === "runwalk" ? "Run/Walk" : k === "walk" ? "Walk" : "Run";
}

export function runXpLabel(info) {
  if (!info) return "run";
  const k = runKind(info);
  if (k === "runwalk") return `${info.miles} mi Run/Walk`;
  return `${info.miles} mi ${k === "walk" ? "walk" : "run"}`;
}

export function runFeedLine(info) {
  const k = runKind(info);
  if (k === "runwalk") return `ran ${info.runMiles} mi, walked ${info.walkMiles} mi`;
  if (k === "walk") return `walked ${info.miles} mi · ${fmtPace(info.pace)} /mi`;
  return `ran ${info.miles} mi · ${fmtPace(info.pace)} /mi`;
}

export function runBreakdown(info) {
  if (!info) return "";
  if (!info.segments?.length && info.runMiles == null && info.walkMiles == null) return "";
  const parts = [];
  const grouped = { run: { miles: 0, secs: 0 }, walk: { miles: 0, secs: 0 } };
  if (info.segments?.length) {
    info.segments.forEach((s) => {
      const m = s.mode === "walk" ? "walk" : "run";
      grouped[m].miles += +s.miles || 0;
      grouped[m].secs += +s.secs || 0;
    });
  } else {
    grouped.run.miles = +info.runMiles || 0;
    grouped.walk.miles = +info.walkMiles || 0;
  }
  if ((+info.runMiles || grouped.run.miles) > 0) {
    const miles = +info.runMiles || grouped.run.miles;
    const pace = grouped.run.miles > 0.01 ? grouped.run.secs / grouped.run.miles : Infinity;
    parts.push(`Run ${miles} mi · ${fmtPace(pace)} /mi`);
  }
  if ((+info.walkMiles || grouped.walk.miles) > 0) {
    const miles = +info.walkMiles || grouped.walk.miles;
    const pace = grouped.walk.miles > 0.01 ? grouped.walk.secs / grouped.walk.miles : Infinity;
    parts.push(`Walk ${miles} mi · ${fmtPace(pace)} /mi`);
  }
  return parts.join(" — ");
}

export function cardioTimedXp(exercises) {
  let xp = 0;
  (exercises || []).forEach((ex) => {
    const rate = ex.name === "Walking" ? 3 : 6;
    (ex.sets || []).forEach((st) => {
      const r = +st.r || 0, w = +st.w || 0;
      xp += Math.round(r * rate + w * 10);
    });
  });
  return xp;
}

const roundMi = (m) => Math.round((m / MI_M) * 100) / 100;
const roundMin = (s) => Math.round((s / 60) * 10) / 10;

export function buildSavedRun(r, now = Date.now()) {
  r = ensureSegments(r);
  const secs = runElapsed(r, now);
  const milesTotal = roundMi(r.dist || 0);
  let slowMeters = 0;
  const segs = r.segments.map((seg, i) => {
    const isOpen = i === r.segments.length - 1;
    const end = isOpen ? now : (r.segments[i + 1]?.start || now);
    const moving = segmentMovingSecs(seg, end, { pausedAt: isOpen ? r.pausedAt : null, isOpen });
    const dist = seg.dist || 0;
    let mode = seg.mode === "walk" ? "walk" : "run";
    let slow = false;
    if (mode === "run" && dist > 0 && mphOf(dist, moving) < SLOW_RUN_MPH) {
      mode = "walk";
      slow = true;
      slowMeters += dist;
    }
    const miles = dist / MI_M;
    const pace = miles > 0.01 ? moving / miles : Infinity;
    return { mode, secs: moving, miles, dist, pace, slow };
  });
  const byMode = { run: { dist: 0, secs: 0 }, walk: { dist: 0, secs: 0 } };
  segs.forEach((x) => {
    byMode[x.mode].dist += x.dist;
    byMode[x.mode].secs += x.secs;
  });
  const runMiles = roundMi(byMode.run.dist);
  const walkMiles = roundMi(byMode.walk.dist);
  const runMin = roundMin(byMode.run.secs);
  const walkMin = roundMin(byMode.walk.secs);
  const exercises = [];
  if (runMin >= MIN_SAVE_MIN) exercises.push({ name: "Running", sets: [{ w: runMiles, r: runMin, done: true }] });
  if (walkMin >= MIN_SAVE_MIN) exercises.push({ name: "Walking", sets: [{ w: walkMiles, r: walkMin, done: true }] });
  const mode = exercises.some((e) => e.name === "Running") ? "run" : "walk";
  const runInfo = {
    id: r.id,
    mode,
    miles: milesTotal,
    secs: Math.round(secs),
    pace: Math.round(secs / Math.max(0.01, milesTotal || 0.01)),
    splits: r.splits || [],
    gapMi: Math.round(((r.gapM || 0) / MI_M) * 100) / 100,
    guideName: r.guide?.name || null,
    segments: segs.map((x) => ({
      mode: x.mode,
      secs: Math.round(x.secs),
      miles: Math.round(x.miles * 100) / 100,
      pace: isFinite(x.pace) ? Math.round(x.pace) : 0,
    })),
    runMiles,
    walkMiles,
  };
  const slowMi = Math.round(roundMi(slowMeters) * 10) / 10;
  const slowNote = slowMi >= 0.05
    ? `${slowMi} mi logged as walking — pace was below jogging speed`
    : null;
  return {
    exercises,
    runInfo,
    title: runTitle(runInfo),
    feed: runFeedLine(runInfo),
    xpLabel: runXpLabel(runInfo),
    slowNote,
    secs,
    miles: milesTotal,
    xp: cardioTimedXp(exercises),
  };
}

export function northFixes({ t0, lat0 = 30, lng0 = -97, speed, seconds, dt = 1, acc = 8 }) {
  const out = [];
  for (let s = 0; s <= seconds; s += dt) {
    out.push({ lat: lat0 + (speed * s) / M_LAT, lng: lng0, acc, t: t0 + s * 1000 });
  }
  return { fixes: out, lat1: lat0 + (speed * seconds) / M_LAT, t1: t0 + seconds * 1000 };
}
