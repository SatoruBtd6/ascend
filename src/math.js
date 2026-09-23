// Pure helpers shared by App.jsx and the simulation tests in math.test.mjs.
// Keep everything here free of React and browser APIs so it can run under `node --test`.

const clone = (v) => {
  if (v == null || typeof v !== "object") return v;
  try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
};
const eq = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const hasId = (x) => x && typeof x === "object" && x.id != null;
const isIdList = (v) => Array.isArray(v) && v.length > 0 && v.every(hasId);
const asIdList = (a, b, c) => isIdList(a) || isIdList(b) || isIdList(c);

// Three-way merge for the whole ascend-state blob (local vs server vs last-ack snapshot).
// Rules — keep these if you add fields; do not special-case last-write-wins:
// 1. If this device changed a value since the snapshot, keep local.
// 2. Otherwise take the server's value (other device's update, or unchanged).
// 3. Maps (weightLog, meals-by-day, water, …) and id-lists (workouts, presets, meals[day])
//    use the same rule per key/id: local edit wins; server-only key not in snapshot is kept;
//    key that was in the snapshot and is gone locally stays deleted.
export function mergeState(local, server, snapshot) {
  if (!server) return clone(local);
  if (!local) return clone(server);
  const snap = snapshot && typeof snapshot === "object" ? snapshot : {};
  const loc = isObj(local) ? local : {};
  const ser = isObj(server) ? server : {};
  const out = mergeMap(loc, ser, isObj(snap) ? snap : {});
  if (out.rev == null) out.rev = Math.max(+loc.rev || 0, +ser.rev || 0);
  return out;
}

// After a successful write, the snapshot must be exactly the payload the server
// acknowledged — never the live local state, which may have moved on during the
// round trip. Otherwise the next three-way merge treats a newer local edit as
// "unchanged" and takes the older remote value.
export function persistAck(acknowledged, localNow) {
  // Snap is the exact acknowledged payload (same object). Never clone live local.
  const snap = acknowledged;
  if (!localNow || !acknowledged) return { snap, written: acknowledged, dirty: !!(localNow && localNow !== acknowledged) };
  if (localNow === acknowledged) return { snap, written: acknowledged, dirty: false };
  let dirty = false;
  for (const k of Object.keys(localNow)) {
    if (k === "rev") continue;
    if (localNow[k] !== acknowledged[k]) { dirty = true; break; }
  }
  if (!dirty) {
    for (const k of Object.keys(acknowledged)) {
      if (k === "rev") continue;
      if (!(k in localNow)) { dirty = true; break; }
    }
  }
  return { snap, written: acknowledged, dirty };
}

export function persistMerge(local, remote, snap, readKind) {
  const remoteRev = +remote?.rev || 0, baseRev = +(snap?.rev) || 0;
  // Only merge when the server is strictly newer than the last ack. Same-rev
  // !eq(remote, snap) used to stringify the whole blob and could loop persist.
  const useRemote = readKind === "ok" && !!remote && remoteRev > baseRev;
  const merged = useRemote ? mergeState(local, remote, snap) : local;
  const toWrite = { ...merged, rev: Math.max(+local?.rev || 0, remoteRev, +merged?.rev || 0) + 1 };
  return { merged, toWrite, useRemote };
}

export function parseNumInput(s) {
  if (s == null) return "";
  const t = String(s).trim();
  if (t === "" || t === "." || t === "-" || t === "-." || t === "+" || t === "+.") return "";
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : "";
}

export function shouldDeferPersist(s, snap) {
  if (!s || !snap || s === snap) return false;
  const keys = new Set([...Object.keys(s), ...Object.keys(snap)]);
  let communityOnly = false;
  for (const k of keys) {
    if (k === "rev") continue;
    if (s[k] !== snap[k]) {
      if (k !== "community") return false;
      communityOnly = true;
    }
  }
  return communityOnly;
}

export function shouldWritePending(prev, s) {
  return activeIsUrgent(prev?.active, s?.active);
}

export const WORKOUT_SAVE_DELAY_MS = 3000;

function mergeMap(local, server, snap) {
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(server || {}), ...Object.keys(snap || {})]);
  const out = {};
  keys.forEach((k) => {
    if (k === "rev") return;
    const got = mergeValue(local?.[k], server?.[k], snap?.[k], keyIn(local, k), keyIn(server, k), keyIn(snap, k));
    if (got !== undefined) out[k] = got;
  });
  return out;
}

function keyIn(obj, k) {
  return !!(obj && Object.prototype.hasOwnProperty.call(obj, k));
}

function mergeValue(local, server, snap, lHas, sHas, pHas) {
  if (lHas && !eq(local, snap)) {
    if (asIdList(local, server, snap)) return mergeIdList(lHas ? local : [], sHas ? server : [], pHas ? snap : []);
    // Nested merge only when local is still a map. Nulling a session/object (active,
    // lastSummary, crew, …) is a local change and must win as a whole — otherwise
    // mergeMap({}, server, snap) rebuilds a partial object and drops child arrays.
    if (isObj(local)) return mergeMap(local, isObj(server) ? server : {}, isObj(snap) ? snap : {});
    return clone(local);
  }
  if (!lHas && pHas) return undefined;
  if (sHas) return clone(server);
  if (lHas) return clone(local);
  return undefined;
}

function mergeIdList(local, server, snap) {
  const l = Array.isArray(local) ? local : [];
  const s = Array.isArray(server) ? server : [];
  const p = Array.isArray(snap) ? snap : [];
  const lMap = new Map(l.filter(hasId).map((x) => [String(x.id), x]));
  const sMap = new Map(s.filter(hasId).map((x) => [String(x.id), x]));
  const pMap = new Map(p.filter(hasId).map((x) => [String(x.id), x]));
  const ids = new Set([...lMap.keys(), ...sMap.keys(), ...pMap.keys()]);
  const order = [];
  const seen = new Set();
  const take = (id) => { if (!seen.has(id)) { seen.add(id); order.push(id); } };
  l.forEach((x) => hasId(x) && take(String(x.id)));
  s.forEach((x) => hasId(x) && take(String(x.id)));
  p.forEach((x) => hasId(x) && take(String(x.id)));
  ids.forEach((id) => take(id));
  const out = [];
  order.forEach((id) => {
    const got = mergeValue(lMap.get(id), sMap.get(id), pMap.get(id), lMap.has(id), sMap.has(id), pMap.has(id));
    if (got !== undefined) out.push(got);
  });
  return out;
}

// Additive repair of a persisted ascend-state blob. Unknown keys are kept. Values that
// are already the right type are left alone. Missing arrays become [], missing maps {}.
export function normalizeState(s) {
  if (!s || typeof s !== "object" || Array.isArray(s)) return s;
  const repaired = new Set();
  const note = (field) => {
    if (repaired.has(field)) return;
    repaired.add(field);
    console.warn("[ascend] repaired state field:", field);
  };
  const asArr = (v, field) => { if (Array.isArray(v)) return v; note(field); return []; };
  const asObj = (v, field) => { if (isObj(v)) return v; note(field); return {}; };
  const asNum = (v, field, fallback = 0) => { if (typeof v === "number" && Number.isFinite(v)) return v; note(field); return fallback; };
  const asBool = (v, field, fallback = false) => { if (typeof v === "boolean") return v; note(field); return fallback; };

  const mapItems = (arr, field, fn) => {
    if (!Array.isArray(arr)) { note(field); return []; }
    let changed = false;
    const next = arr.map((item) => {
      const n = fn(item);
      if (n !== item) changed = true;
      return n;
    });
    return changed ? next : arr;
  };
  const mapVals = (obj, field, fn) => {
    const src = asObj(obj, field);
    let changed = src !== obj;
    const next = {};
    Object.keys(src).forEach((k) => {
      const n = fn(src[k], k);
      next[k] = n;
      if (n !== src[k]) changed = true;
    });
    return changed ? next : obj;
  };
  const withSets = (ex, field) => {
    if (!isObj(ex)) { note(field); return { sets: [] }; }
    if (Array.isArray(ex.sets)) return ex;
    note(`${field}[].sets`);
    return { ...ex, sets: [] };
  };
  const withExercises = (row, field) => {
    if (!isObj(row)) { note(field); return { exercises: [] }; }
    const exercises = mapItems(row.exercises, `${field}.exercises`, (ex) => withSets(ex, `${field}.exercises`));
    return exercises === row.exercises ? row : { ...row, exercises };
  };
  const nullable = (v, field, inner) => {
    if (v == null) return null;
    if (!isObj(v)) { note(field); return null; }
    return inner(v);
  };

  let out = s;
  const set = (key, val) => {
    if (val === out[key]) return;
    if (out === s) out = { ...s };
    out[key] = val;
  };

  const topArr = ["workouts", "savedRoutes", "dayTemplates", "custom", "chat", "presets", "savedFoods", "crateLog", "gyms"];
  topArr.forEach((k) => { if (!Array.isArray(out[k])) set(k, asArr(out[k], k)); });
  const topObj = ["xpLog", "days", "meals", "weekly", "monthly", "rankHist", "steps", "stepXp", "loot", "seasonBadges", "nemesisSeen", "roasts", "checkins", "water", "measure", "groupClaimed", "duelClaimed", "bossRecaps", "worldFirsts", "wfClaim", "crewBanners", "fuelClaimed", "ach", "mogClaimed", "xpDetail", "xpDone", "weightLog", "crateUnlocks", "auraUnlocks", "duelResults", "gymSpecific"];
  topObj.forEach((k) => { if (!isObj(out[k])) set(k, asObj(out[k], k)); });

  set("xp", asNum(out.xp, "xp"));
  set("achV", asNum(out.achV, "achV", 3));
  set("lb", asBool(out.lb, "lb"));
  set("test", asBool(out.test, "test"));
  if (out.crateSpent != null || "crateSpent" in out) set("crateSpent", asNum(out.crateSpent, "crateSpent"));
  if (out.crateV != null || "crateV" in out) set("crateV", asNum(out.crateV, "crateV", 2));
  if (out.cratePity != null || "cratePity" in out) {
    const pity = out.cratePity;
    if (typeof pity !== "number" || !Number.isFinite(pity)) set("cratePity", asNum(typeof pity === "object" ? +(pity?.legendary || pity?.rare || 0) : pity, "cratePity"));
  }
  if (out.rev != null) set("rev", asNum(out.rev, "rev"));
  if (out.rankSnapV != null || "rankSnapV" in out) set("rankSnapV", asNum(out.rankSnapV, "rankSnapV"));
  if (out.xpFloor != null) {
    const f = asObj(out.xpFloor, "xpFloor");
    const next = {
      v: asNum(f.v, "xpFloor.v"),
      amount: asNum(f.amount, "xpFloor.amount"),
      keep: asNum(f.keep, "xpFloor.keep"),
    };
    if (typeof f.d === "string") next.d = f.d;
    set("xpFloor", next);
  }

  const profile = asObj(out.profile, "profile");
  if (profile !== out.profile) set("profile", profile);
  if (profile.look != null && !isObj(profile.look)) {
    note("profile.look");
    set("profile", { ...profile, look: {} });
  }

  const settings = asObj(out.settings, "settings");
  if (settings !== out.settings) set("settings", settings);
  if (settings.custom != null && !isObj(settings.custom) && settings.custom !== false) {
    note("settings.custom");
    set("settings", { ...settings, custom: {} });
  }

  const community = asObj(out.community, "community");
  const communityEx = asArr(community.ex, "community.ex");
  const communityFoods = asArr(community.foods, "community.foods");
  if (community !== out.community || communityEx !== community.ex || communityFoods !== community.foods) {
    set("community", { ...community, ex: communityEx, foods: communityFoods });
  }

  const workouts = mapItems(out.workouts, "workouts", (w) => withExercises(w, "workouts[]"));
  set("workouts", workouts);
  const presets = mapItems(out.presets, "presets", (w) => withExercises(w, "presets[]"));
  set("presets", presets);

  set("active", nullable(out.active, "active", (a) => withExercises(a, "active")));
  set("lastSummary", nullable(out.lastSummary, "lastSummary", (sum) => {
    const suggestions = asArr(sum.suggestions, "lastSummary.suggestions");
    const prNames = asArr(sum.prNames, "lastSummary.prNames");
    let recap = sum.recap;
    if (recap != null) {
      if (!isObj(recap)) { note("lastSummary.recap"); recap = { lifts: [] }; }
      else {
        const lifts = asArr(recap.lifts, "lastSummary.recap.lifts");
        if (lifts !== recap.lifts) recap = { ...recap, lifts };
      }
    }
    if (suggestions === sum.suggestions && prNames === sum.prNames && recap === sum.recap) return sum;
    return { ...sum, suggestions, prNames, recap };
  }));
  set("crew", nullable(out.crew, "crew", (c) => {
    const members = c.members == null || Array.isArray(c.members) ? c.members : (note("crew.members"), []);
    return members === c.members ? c : { ...c, members };
  }));
  if (out.currentGym !== undefined && out.currentGym !== null && typeof out.currentGym !== "string") {
    note("currentGym");
    set("currentGym", null);
  }
  if (out.testCrate != null) {
    const tc = asObj(out.testCrate, "testCrate");
    const pity = asNum(tc.pity, "testCrate.pity");
    const log = asArr(tc.log, "testCrate.log");
    if (tc !== out.testCrate || pity !== tc.pity || log !== tc.log) set("testCrate", { ...tc, pity, log });
  }
  set("nemesis", nullable(out.nemesis, "nemesis", (n) => n));
  set("rankSnap", nullable(out.rankSnap, "rankSnap", (n) => n));
  set("ghost", nullable(out.ghost, "ghost", (n) => n));
  set("atGym", nullable(out.atGym, "atGym", (n) => n));

  const days = mapVals(out.days, "days", (d) => {
    if (!isObj(d)) { note("days[]"); return { list: [] }; }
    const list = asArr(d.list, "days[].list");
    return list === d.list ? d : { ...d, list };
  });
  set("days", days);

  const meals = mapVals(out.meals, "meals", (list) => asArr(list, "meals[]"));
  set("meals", meals);
  const xpDetail = mapVals(out.xpDetail, "xpDetail", (list) => asArr(list, "xpDetail[]"));
  set("xpDetail", xpDetail);

  const chat = mapItems(out.chat, "chat", (c) => (isObj(c) || typeof c === "string" ? c : (note("chat[]"), null))).filter((c) => c != null);
  if (chat.length !== (out.chat || []).length) set("chat", chat);

  return out;
}

// World First: every player who lands a killing blow writes their own claim row, so upsert
// storage can't let one overwrite another. Everyone then resolves the same winner from the
// full set: earliest claim, ties broken by player id so the answer never flip-flops.
export function resolveWorldFirst(claims) {
  const ok = (claims || []).filter((c) => c && c.id && Number.isFinite(+c.t));
  if (!ok.length) return null;
  return [...ok].sort((a, b) => (+a.t - +b.t) || String(a.id).localeCompare(String(b.id)))[0];
}

// Crew weekly quests. Targets scale with the crew, progress is pooled from members' cards.
// Nothing here touches boss HP or boss damage.
export const CREW_QUESTS = [
  { id: "sessions", title: "workout credit", per: 4, unit: "workouts", get: (wk) => wk.workouts },
  { id: "miles", title: "cardio miles", per: 8, unit: "mi", get: (wk) => wk.miles },
  { id: "fuel", title: "fuel goal days", per: 4, unit: "days", get: (wk) => wk.fuel },
];
export function crewQuestProgress(cards, weekKey, members) {
  const weeks = (cards || []).map((c) => (c && c.wk && c.wk.key === weekKey ? c.wk : null)).filter(Boolean);
  const n = Math.max(1, members || (cards || []).length || 1);
  const quests = CREW_QUESTS.map((q) => {
    const value = Math.round(weeks.reduce((a, wk) => a + (+q.get(wk) || 0), 0) * 10) / 10;
    const target = q.per * n;
    return { id: q.id, title: q.title, unit: q.unit, value, target, done: value >= target };
  });
  return { quests, members: n, done: quests.every((q) => q.done) };
}

// Warm-up sets are saved and shown, but count for nothing: no XP, PRs, boss damage,
// volume, rank scores, rep challenges, or next-weight suggestions.
export function workSets(sets) {
  return (sets || []).filter((st) => st && !st.warm);
}

// How much a session counts as "a workout". Tune every number here.
// Quest and deck sessions stay at 0. Strength is piecewise on effective minutes.
// Runs and walks use per-mode minutes and cap lower. Mixed sessions add both, then cap.
export const WORKOUT_CREDIT = {
  duelRule: 1,
  strengthCap: 1.25,
  setCapMinutes: 5,
  noDurationPerSet: 3.5,
  curve: [
    { at: 0, credit: 0 },
    { at: 20, credit: 0.7 },
    { at: 60, credit: 1 },
    { at: 120, credit: 1.25 },
  ],
  runDiv: 60,
  walkDiv: 120,
  cardioCap: 0.75,
  mixedCap: 1.25,
  runNames: ["Running"],
  walkNames: ["Walking", "Incline Walk"],
};

export const round1 = (n) => Math.round((+n || 0) * 10) / 10;
export const round2 = (n) => Math.round((+n || 0) * 100) / 100;

const creditNameIs = (list, name) => list.includes(name);

export function creditFromMinutes(min) {
  const curve = WORKOUT_CREDIT.curve;
  const x = Math.max(0, +min || 0);
  const last = curve[curve.length - 1];
  if (x >= last.at) return last.credit;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1], b = curve[i];
    if (x <= b.at) return a.credit + ((x - a.at) / (b.at - a.at)) * (b.credit - a.credit);
  }
  return last.credit;
}

export function cardioMinutesOf(w) {
  if (!w || w.source === "quest" || w.source === "deck") return { run: 0, walk: 0 };
  const segs = w.run?.segments;
  if (Array.isArray(segs) && segs.length) {
    let run = 0, walk = 0;
    segs.forEach((seg) => {
      const mins = (+seg.secs || 0) / 60;
      if (seg.mode === "walk") walk += mins;
      else run += mins;
    });
    return { run, walk };
  }
  let run = 0, walk = 0;
  (w.exercises || []).forEach((ex) => {
    const mins = workSets(ex.sets).reduce((a, st) => a + (+st.r || 0), 0);
    if (creditNameIs(WORKOUT_CREDIT.runNames, ex.name)) run += mins;
    else if (creditNameIs(WORKOUT_CREDIT.walkNames, ex.name)) walk += mins;
  });
  return { run, walk };
}

function creditDef(s, name, findEx) {
  if (typeof findEx === "function") {
    const def = findEx(s, name);
    if (def) return def;
  }
  return { name, type: "weighted", group: "Other" };
}

export function workoutCredit(s, w, findEx) {
  if (!w || w.source === "quest" || w.source === "deck") return 0;
  const { run, walk } = cardioMinutesOf(w);
  const cardio = Math.min(WORKOUT_CREDIT.cardioCap, run / WORKOUT_CREDIT.runDiv + walk / WORKOUT_CREDIT.walkDiv);
  let sets = 0;
  (w.exercises || []).forEach((ex) => {
    if (creditNameIs(WORKOUT_CREDIT.runNames, ex.name) || creditNameIs(WORKOUT_CREDIT.walkNames, ex.name)) return;
    if (creditDef(s, ex.name, findEx).type === "timed") return;
    workSets(ex.sets).forEach((st) => { if (+st.r > 0) sets++; });
  });
  let strength = 0;
  if (sets > 0) {
    const hasDuration = w.minutes != null && w.minutes !== "" && Number.isFinite(+w.minutes);
    const duration = hasDuration ? +w.minutes : sets * WORKOUT_CREDIT.noDurationPerSet;
    const effective = Math.min(duration, sets * WORKOUT_CREDIT.setCapMinutes);
    strength = Math.min(WORKOUT_CREDIT.strengthCap, creditFromMinutes(effective));
  }
  return Math.min(WORKOUT_CREDIT.mixedCap, strength + cardio);
}

// Your usual training hour, as a median of the hours you've started past workouts.
// Falls back to 8pm until there's enough history to be meaningful.
export function usualTrainHour(hours, { fallback = 20, min = 5 } = {}) {
  const list = (hours || []).filter((h) => Number.isFinite(h) && h >= 0 && h <= 23).sort((a, b) => a - b);
  if (list.length < min) return fallback;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : Math.round((list[mid - 1] + list[mid]) / 2);
}

// Closest-to-done goal out of a mixed list.
// Each candidate: { value, goal, tie, ... }. Lower `tie` wins when two are equally close.
// Anything already finished, empty, or malformed is ignored. Returns null when nothing is worth showing.
export function pickNextGoal(candidates, { min = 0.1 } = {}) {
  const usable = (candidates || []).filter((c) => c && +c.goal > 0 && +c.value >= 0 && +c.value < +c.goal);
  if (!usable.length) return null;
  const frac = (c) => +c.value / +c.goal;
  const sorted = [...usable].sort((a, b) => frac(b) - frac(a) || (a.tie ?? 0) - (b.tie ?? 0));
  return sorted.find((c) => frac(c) >= min) || sorted.find((c) => +c.value > 0) || null;
}

// Gym pin + raid lobby. Pure so tests can cover ready-up, cancel, races, and GPS range
// without touching shared crew:/lb: keys or boss HP.
export const GYM_RADIUS_M = 150;
export const PRESENCE_MS = 90 * 60 * 1000;
export const RAID_NEED = 3;
export const RAID_MS = 3 * 3600 * 1000;
export const RAID_COUNTDOWN_MS = 3000;
export const RAID_XP = 80;

const toRad = (d) => (+d * Math.PI) / 180;
export function haversineMeters(a, b) {
  if (!a || !b || !Number.isFinite(+a.lat) || !Number.isFinite(+a.lng) || !Number.isFinite(+b.lat) || !Number.isFinite(+b.lng)) return Infinity;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function inGymRadius(here, gym, radius = GYM_RADIUS_M) {
  return haversineMeters(here, gym) <= radius;
}
export function presenceActive(t, now = Date.now(), ms = PRESENCE_MS) {
  const n = +t;
  return Number.isFinite(n) && now >= n && now - n < ms;
}
export function prunePresence(map, now = Date.now()) {
  const out = {};
  Object.entries(map || {}).forEach(([id, t]) => { if (presenceActive(t, now)) out[id] = +t; });
  return out;
}
export function checkGymPin(here, gym, radius = GYM_RADIUS_M) {
  if (!gym || !Number.isFinite(+gym.lat) || !Number.isFinite(+gym.lng)) return { ok: false, reason: "no-gym" };
  if (!here || !Number.isFinite(+here.lat) || !Number.isFinite(+here.lng)) return { ok: false, reason: "no-gps" };
  if (!inGymRadius(here, gym, radius)) return { ok: false, reason: "too-far" };
  return { ok: true };
}
export function canProposeRaid(memberCount) {
  return (memberCount || 0) >= RAID_NEED;
}
export function canReadyUp({ atGym, memberCount, phase } = {}) {
  if (!canProposeRaid(memberCount)) return false;
  if (phase && phase !== "lobby") return false;
  return !!atGym;
}
export function pingActive(ping, now = Date.now()) {
  return !!(ping && presenceActive(ping.t, now));
}

const copy = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));

export function raidPhase(raid, now = Date.now()) {
  if (!raid) return null;
  if (raid.cancelled) return "cancelled";
  if (raid.cleared) return "cleared";
  if (raid.phase === "lobby") return "lobby";
  if (raid.phase === "live" || (raid.start && raid.end && raid.phase !== "cancelled")) {
    if (Number.isFinite(+raid.start) && Number.isFinite(+raid.end) && now >= raid.start && now < raid.end) return "live";
    if (raid.phase === "live" || !raid.phase) return "expired";
  }
  return raid.phase || null;
}
export function raidActive(raid, now = Date.now()) {
  return raidPhase(raid, now) === "live";
}

export function nextHost(raid, leavingId) {
  const ids = Object.keys(raid?.in || {}).filter((id) => id !== leavingId && !raid?.left?.[id]);
  const ready = ids.filter((id) => raid?.ready?.[id]);
  return ready[0] || ids[0] || null;
}

function activeReady(raid, presence, now) {
  const pres = prunePresence(presence, now);
  const out = {};
  Object.entries(raid?.ready || {}).forEach(([id, t]) => {
    if (raid?.left?.[id] != null && +raid.left[id] >= +t) return;
    if (pres[id] != null) out[id] = t;
  });
  return out;
}

export function tickRaid(raid, { now = Date.now(), presence = {} } = {}) {
  if (!raid || raid.cancelled) return raid;
  const next = copy(raid);
  next.ready = activeReady(next, presence, now);
  if (Object.keys(next.ready).length < RAID_NEED) next.countdownAt = null;
  if (next.phase === "lobby" && next.countdownAt && Object.keys(next.ready).length >= RAID_NEED && now >= next.countdownAt + RAID_COUNTDOWN_MS) {
    next.phase = "live";
    next.start = next.countdownAt + RAID_COUNTDOWN_MS;
    next.end = next.start + RAID_MS;
    next.hits = next.hits || {};
    next.cleared = false;
  }
  if (next.phase === "live" && !next.cleared && Object.keys(next.hits || {}).length >= RAID_NEED) next.cleared = true;
  return next;
}

export function raidCountdownLeft(raid, now = Date.now()) {
  if (!raid?.countdownAt || raid.phase !== "lobby") return null;
  return Math.max(0, Math.ceil((raid.countdownAt + RAID_COUNTDOWN_MS - now) / 1000));
}

export function applyRaidAction(raid, action, ctx = {}) {
  const now = ctx.now ?? Date.now();
  const presence = ctx.presence || {};
  const playerId = ctx.playerId;
  const memberCount = ctx.memberCount ?? 0;
  const cur = tickRaid(raid, { now, presence });
  const bump = (n) => ({ ...n, rev: (raid?.rev || 0) + 1 });

  if (action === "propose") {
    if (!canProposeRaid(memberCount)) return { ok: false, reason: "crew-size", raid: cur };
    const ph = raidPhase(cur, now);
    if (ph === "lobby" || ph === "live") return { ok: false, reason: "active", raid: cur };
    return {
      ok: true,
      raid: bump({
        phase: "lobby", by: playerId, proposedBy: playerId,
        in: { [playerId]: now }, ready: {}, left: {}, hits: {},
        cleared: false, cancelled: false, countdownAt: null, start: null, end: null, t: now,
      }),
    };
  }

  if (action === "ready") {
    if (raidPhase(cur, now) !== "lobby") return { ok: false, reason: "no-lobby", raid: cur };
    if (!presenceActive(presence[playerId], now)) return { ok: false, reason: "not-at-gym", raid: cur };
    const next = copy(cur) || {};
    next.left = { ...(next.left || {}) };
    delete next.left[playerId];
    next.in = { ...(next.in || {}), [playerId]: now };
    next.ready = { ...(next.ready || {}), [playerId]: now };
    const n = Object.keys(activeReady(next, presence, now)).length;
    if (n >= RAID_NEED && !next.countdownAt) next.countdownAt = now;
    return { ok: true, raid: bump(next) };
  }

  if (action === "leave" || action === "drop") {
    if (raidPhase(cur, now) !== "lobby") return { ok: false, reason: "no-lobby", raid: cur };
    const next = copy(cur) || {};
    next.ready = { ...(next.ready || {}) };
    delete next.ready[playerId];
    if (action === "leave") {
      next.left = { ...(next.left || {}), [playerId]: now };
      next.in = { ...(next.in || {}) };
      delete next.in[playerId];
      if (next.by === playerId) {
        const host = nextHost(next, playerId);
        if (host) next.by = host;
      }
    }
    const n = Object.keys(activeReady(next, presence, now)).length;
    if (n < RAID_NEED) next.countdownAt = null;
    return { ok: true, raid: bump(next) };
  }

  if (action === "cancel") {
    const ph = raidPhase(cur, now);
    if (ph !== "lobby" && ph !== "live") return { ok: false, reason: "not-cancellable", raid: cur };
    if (cur?.cleared) return { ok: false, reason: "cleared", raid: cur };
    if (cur?.by !== playerId) return { ok: false, reason: "not-host", raid: cur };
    return { ok: true, raid: bump({ ...copy(cur), phase: "cancelled", cancelled: true, cancelledAt: now, countdownAt: null }) };
  }

  if (action === "hit") {
    if (raidPhase(cur, now) !== "live") return { ok: false, reason: "not-live", raid: cur };
    if (!presenceActive(presence[playerId], now)) return { ok: false, reason: "not-at-gym", raid: cur };
    const w = ctx.workout || {};
    const next = copy(cur);
    next.hits = { ...(next.hits || {}), [playerId]: { name: ctx.name || "Teammate", t: now, vol: Math.round(w.volume || 0), xp: w.xp || 0 } };
    if (Object.keys(next.hits).length >= RAID_NEED) next.cleared = true;
    return { ok: true, raid: bump(next) };
  }

  if (action === "tick") {
    const changed = JSON.stringify(cur || {}) !== JSON.stringify(raid || {});
    return { ok: true, raid: changed ? bump(cur) : cur };
  }

  return { ok: false, reason: "unknown", raid: cur };
}

export function reconcileRaid(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (a.cleared || b.cleared) {
    const hits = { ...(a.hits || {}), ...(b.hits || {}) };
    const base = a.start && b.start ? (a.start <= b.start ? a : b) : (a.cleared ? a : b);
    return { ...base, hits, cleared: true, cancelled: false, phase: "live", rev: Math.max(a.rev || 0, b.rev || 0) };
  }
  const aLive = a.phase === "live", bLive = b.phase === "live";
  if (a.cancelled && !aLive) return bLive ? b : a;
  if (b.cancelled && !bLive) return aLive ? a : b;
  if (a.cancelled && b.cancelled) return (a.cancelledAt || 0) <= (b.cancelledAt || 0) ? a : b;
  if (aLive || bLive) {
    const live = aLive ? a : b;
    const other = aLive ? b : a;
    if (other.cancelled && other.start && live.start && other.start === live.start && !live.cleared) {
      return { ...live, phase: "cancelled", cancelled: true, cancelledAt: other.cancelledAt, rev: Math.max(a.rev || 0, b.rev || 0) };
    }
    const hits = { ...(other.hits || {}), ...(live.hits || {}) };
    const cleared = live.cleared || other.cleared || Object.keys(hits).length >= RAID_NEED;
    return {
      ...live,
      hits,
      cleared,
      start: Math.min(+live.start || Infinity, +other.start || Infinity) || live.start,
      end: live.end || other.end,
      ready: { ...(other.ready || {}), ...(live.ready || {}) },
      rev: Math.max(a.rev || 0, b.rev || 0),
    };
  }
  const ready = { ...(a.ready || {}) };
  Object.entries(b.ready || {}).forEach(([id, t]) => { if (ready[id] == null || +t < +ready[id]) ready[id] = t; });
  const inMap = { ...(a.in || {}), ...(b.in || {}) };
  const left = { ...(a.left || {}), ...(b.left || {}) };
  Object.keys(ready).forEach((id) => { if (left[id] != null && +ready[id] >= +left[id]) delete left[id]; });
  let by = (a.t || 0) <= (b.t || 0) ? a.by : b.by;
  if (left[by]) by = nextHost({ in: inMap, left, ready, by }, by) || a.by || b.by;
  const n = Object.keys(ready).length;
  const cands = [a.countdownAt, b.countdownAt].filter((x) => Number.isFinite(+x));
  return {
    ...a,
    by,
    in: inMap,
    ready,
    left,
    countdownAt: n >= RAID_NEED ? (cands.length ? Math.min(...cands) : null) : null,
    phase: "lobby",
    cancelled: false,
    rev: Math.max(a.rev || 0, b.rev || 0) + 1,
  };
}

// A cleared raid lives on `crewraid:<code>` only until the next proposal
// replaces it, so contributors who weren't watching lose the clear. Cleared
// raids are archived to `crewraidhist:<code>` (raidIO.casRaid) and reconciled
// into xpDone on load / Crew visits.
export function archiveRaidClear(hist, raid) {
  if (!raid?.cleared || !raid.start || !Object.keys(raid.hits || {}).length) return hist || null;
  const clears = [...(hist?.clears || [])];
  if (clears.some((c) => c.start === raid.start)) return hist;
  clears.push({ start: raid.start, hits: { ...(raid.hits || {}) } });
  return { ...(hist || {}), clears: clears.slice(-200) };
}
// Clears this player contributed to but never got credit for.
export function missedRaidClears(s, code, hist) {
  if (!s?.playerId) return [];
  return (hist?.clears || []).filter((c) => c.hits?.[s.playerId] && !s.xpDone?.[`raid_${code}_${c.start}`]);
}
// Standard-Bearer feat: crew raid clears the player helped finish. Ghost-crew
// (LOCAL) clears are tester-only and don't count.
export function countRaidClears(s) {
  return Object.keys(s?.xpDone || {}).filter((k) => k.startsWith("raid_") && !k.startsWith("raid_LOCAL_")).length;
}

// Rank / calorie math. Male lines stay the original allometric curve; female lines use
// group multipliers from FitnessCalcs male vs female elite bodyweight ratios
// (https://fitnesscalcs.com/reference/strength-standards-table/).
export const RATIO_STEPS = [1.0, 1.35, 1.7, 2.1, 2.55];
export const REP_STEPS = [10, 17, 24, 33, 42];
export const GROUP_HARD = { Shoulders: 1.25, Arms: 1.1 };
export const FEMALE_GROUP_SCALE = { Chest: 0.68, Shoulders: 0.68, Arms: 0.68, Back: 0.75, Legs: 0.78, Core: 0.78 };
export const FEMALE_REP_SCALE = 0.7;
const GOAL_CAL = { cut: -400, maintain: 0, lean: 250, bulk: 450 };

export function bodySex(p) {
  return p?.sex === "f" ? "f" : "m";
}

export function femaleScale(group, type) {
  if (type === "assisted" || type === "bodyweight") return FEMALE_REP_SCALE;
  return FEMALE_GROUP_SCALE[group] || 0.72;
}

export function strengthScale(p) {
  const bw = Math.max(80, +p?.weight || 170), h = Math.max(48, +p?.height || 70) * 0.0254;
  const frameLb = 24 * h * h * 2.2046;
  const mass = 0.65 * bw + 0.35 * frameLb;
  return 180 * Math.pow(mass / 180, 0.67);
}

export function thresholds(ex, p) {
  const f = bodySex(p) === "f" ? femaleScale(ex.group, ex.type) : 1;
  if (ex.type === "assisted") return REP_STEPS.map((r) => Math.round(r * f));
  if (ex.type === "bodyweight") return REP_STEPS.map((r) => Math.round(r * (ex.reps || 1) * f));
  const sc = strengthScale(p) * f;
  const hard = GROUP_HARD[ex.group] || 1;
  return RATIO_STEPS.map((r) => Math.round((r * ex.factor * sc * hard) / 5) * 5);
}

export function targets(p = {}) {
  const kg = (+p.weight || 170) * 0.4536, cm = (+p.height || 70) * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * (+p.age || 20) + (bodySex(p) === "m" ? 5 : -161);
  const tdee = Math.round(bmr * (p.activity || 1.55));
  const adj = GOAL_CAL[p.goal] ?? 250;
  const cal = tdee + adj;
  const protein = Math.round((+p.weight || 170) * (p.goal === "cut" ? 1 : 0.85));
  const fat = Math.round((cal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((cal - protein * 4 - fat * 9) / 4));
  return { tdee, cal, protein, fat, carbs };
}

// Switch Male/Female without touching achievements, XP, titles, loot, or cosmetics.
export function applyBodyType(s, sex) {
  const next = sex === "f" ? "f" : "m";
  return { ...s, profile: { ...(s.profile || {}), sex: next } };
}

// Anime Crate rarity math stays pure so its published odds and pity rule can be
// simulated without React or browser APIs. Secret is checked first from the
// same draw and deliberately leaves pity untouched.
export const ANIME_CRATE_WEIGHTS = Object.freeze({
  common: 0.4,
  uncommon: 0.26,
  rare: 0.186,
  epic: 0.1,
  legendary: 0.035,
  mythic: 0.013,
  gilded: 0.005,
  secret: 0.001,
});
export const ANIME_RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary", "mythic", "gilded", "secret"]);
export const ANIME_PITY_AT = 40;
const ANIME_MAIN_ORDER = ANIME_RARITY_ORDER.filter((r) => r !== "secret");
const ANIME_HIGH_ORDER = ["legendary", "mythic", "gilded"];

function cumulativePick(order, draw, total = order.reduce((a, r) => a + ANIME_CRATE_WEIGHTS[r], 0)) {
  let n = Math.max(0, Math.min(0.999999999999, draw)) * total;
  for (const rarity of order) {
    n -= ANIME_CRATE_WEIGHTS[rarity];
    if (n < 0) return rarity;
  }
  return order[order.length - 1];
}

export function rollAnimeRarity(pity = 0, rng = Math.random, options = {}) {
  const draw = Math.max(0, Math.min(0.999999999999, +rng() || 0));
  if (draw < ANIME_CRATE_WEIGHTS.secret) return { rarity: "secret", pity: Math.max(0, +pity || 0), draw };
  const mainDraw = (draw - ANIME_CRATE_WEIGHTS.secret) / (1 - ANIME_CRATE_WEIGHTS.secret);
  const forced = options.pity !== false && (+pity || 0) >= ANIME_PITY_AT - 1;
  const rarity = cumulativePick(forced ? ANIME_HIGH_ORDER : ANIME_MAIN_ORDER, mainDraw);
  const nextPity = ANIME_HIGH_ORDER.includes(rarity) ? 0 : Math.max(0, +pity || 0) + 1;
  return { rarity, pity: nextPity, draw, forced };
}

// Old saves stored two pity counters and crate log entries used `kind`.
// Ownership/equipped cosmetic ids are intentionally not rewritten.
export function migrateAnimeCrateState(s) {
  if (!s || typeof s !== "object") return s;
  const old = s.cratePity;
  const pity = typeof old === "number" ? old : Math.max(0, +(old?.legendary ?? old?.rare) || 0);
  const crateLog = (s.crateLog || []).map((x) => (x && !x.type && x.kind ? { ...x, type: x.kind } : x));
  return { ...s, crateV: 2, cratePity: Math.min(ANIME_PITY_AT - 1, pity), crateLog };
}

// Save-effect helpers: identity skip, per-key reference dirty check, and a cheap
// projection so typing in an in-progress workout is not treated as urgent.
export function shouldSkipSave(s, justWritten) {
  return s === justWritten;
}

export function stateKeysChanged(s, prev) {
  if (s === prev) return false;
  if (s == null || prev == null) return s != null || prev != null;
  for (const k of Object.keys(s)) if (s[k] !== prev[k]) return true;
  for (const k of Object.keys(prev)) if (!(k in s)) return true;
  return false;
}

export function activeShape(a) {
  if (a == null) return null;
  const ex = a.exercises || [];
  let out = String(ex.length);
  for (let i = 0; i < ex.length; i++) {
    const sets = ex[i]?.sets || [];
    out += `\n${ex[i]?.name || ""}\t${sets.length}\t`;
    for (let j = 0; j < sets.length; j++) out += sets[j]?.done ? "1" : "0";
  }
  return out;
}

export function activeIsUrgent(prev, next) {
  if (prev == null && next == null) return false;
  if (prev == null || next == null) return true;
  return activeShape(prev) !== activeShape(next);
}

export function saveIsUrgent(prev, s, urgentKeys) {
  if (!prev || !s) return true;
  if (activeIsUrgent(prev.active, s.active)) return true;
  for (const k of urgentKeys) {
    if (k === "active") continue;
    if (s[k] === prev[k]) continue;
    if (!eq(s[k], prev[k])) return true;
  }
  return false;
}

export function saveDelayMs(urgent, prev, s) {
  if (!prev || !s) return urgent ? 0 : 400;
  let other = false;
  for (const k of Object.keys(s)) {
    if (k === "active") continue;
    if (s[k] !== prev[k]) { other = true; break; }
  }
  if (!other) {
    for (const k of Object.keys(prev)) {
      if (k === "active") continue;
      if (!(k in s)) { other = true; break; }
    }
  }
  // In-workout: idle debounce to the server. Structural changes still write
  // the local pending copy synchronously in the persist effect.
  if (!other && s.active !== prev.active) return WORKOUT_SAVE_DELAY_MS;
  return urgent ? 0 : 400;
}

/* ---------- Phase 2 foundations: names, assisted legacy, gyms ---------- */
export const LEGACY_ASSISTED_CUTOFF = "2026-09-20";

// Lowercase, letters+digits only, drop a single trailing s.
export function exKey(name) {
  const raw = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return /s$/.test(raw) && raw.length > 1 ? raw.slice(0, -1) : raw;
}

export function isLegacyAssisted(workout, def) {
  if (!def || def.type !== "assisted") return false;
  const d = workout?.date;
  return typeof d === "string" && d < LEGACY_ASSISTED_CUTOFF;
}

export function isGymSpecific(s, def) {
  const name = typeof def === "string" ? def : (def?.name || "");
  const over = s?.gymSpecific && Object.prototype.hasOwnProperty.call(s.gymSpecific, name) ? s.gymSpecific[name] : undefined;
  if (over === true) return true;
  if (over === false) return false;
  return /machine|cable/i.test(name);
}

export function workoutGym(w) {
  return w && w.gym != null && w.gym !== "" ? w.gym : null;
}

export function inGymBucket(s, w, def) {
  if (!isGymSpecific(s, def)) return true;
  return workoutGym(w) === (s?.currentGym ?? null);
}

export function tagWorkouts(s, { gymId, before = null, untaggedOnly = false } = {}) {
  const id = gymId ?? null;
  const workouts = (s.workouts || []).map((w) => {
    if (w.source === "import" || w.source === "run") return w;
    if (untaggedOnly && workoutGym(w) != null) return w;
    if (before && !(w.date < before)) return w;
    if (workoutGym(w) === id) return w;
    return { ...w, gym: id };
  });
  return workouts === s.workouts ? s : { ...s, workouts };
}

export const EXERCISE_NAME_FIELDS = Object.freeze([
  "workouts[].exercises[].name",
  "workouts[].lines[].name",
  "active.exercises[].name",
  "presets[].exercises[].name",
  "custom[].name",
  "lastSummary.prNames[]",
  "lastSummary.suggestions[].name",
  "lastSummary.recap.lifts[].name",
  "gymSpecific",
  "rankSnap.lifts",
  "rankHist[*].lifts",
]);

export function remapLiftScores(lifts, mapping) {
  if (!lifts || typeof lifts !== "object" || Array.isArray(lifts)) return lifts;
  const map = mapping instanceof Map ? mapping : new Map(Object.entries(mapping || {}));
  if (!map.size) return lifts;
  let changed = false;
  const out = { ...lifts };
  map.forEach((neu, old) => {
    if (!neu || old === neu || !Object.prototype.hasOwnProperty.call(out, old)) return;
    const v = +out[old] || 0;
    const cur = Object.prototype.hasOwnProperty.call(out, neu) ? +out[neu] || 0 : 0;
    out[neu] = Math.max(cur, v);
    delete out[old];
    changed = true;
  });
  return changed ? out : lifts;
}

export function rankUpCeremony(prev, snap) {
  if (!prev || !snap) return null;
  if ((snap.overall || 0) > (prev.overall || 0) && (snap.overall || 0) >= 1) return { kind: "overall" };
  const up = Object.entries(snap.lifts || {}).find(([n, t]) => t > ((prev.lifts || {})[n] ?? 0) && t >= 1);
  if (up) return { kind: "lift", name: up[0], tier: up[1] };
  return null;
}

export function withSilentRankSnap(s, snap) {
  return { ...s, rankSnap: snap };
}

function bumpName(map, name) {
  const n = String(name || "").trim();
  if (!n) return;
  map.set(n, (map.get(n) || 0) + 1);
}

export function exerciseHistoryCounts(s) {
  const counts = new Map();
  (s.workouts || []).forEach((w) => {
    const seen = new Set();
    (w.exercises || []).forEach((ex) => {
      const n = ex?.name;
      if (!n || seen.has(n)) return;
      seen.add(n);
      bumpName(counts, n);
    });
  });
  return counts;
}

export function accountExerciseNames(s) {
  const names = new Set();
  const add = (n) => { const t = String(n || "").trim(); if (t) names.add(t); };
  (s.workouts || []).forEach((w) => {
    (w.exercises || []).forEach((ex) => add(ex?.name));
    (w.lines || []).forEach((l) => add(l?.name));
  });
  (s.active?.exercises || []).forEach((ex) => add(ex?.name));
  (s.presets || []).forEach((pr) => (pr.exercises || []).forEach((ex) => add(ex?.name)));
  (s.custom || []).forEach((ex) => add(ex?.name));
  (s.lastSummary?.prNames || []).forEach(add);
  (s.lastSummary?.suggestions || []).forEach((x) => add(x?.name));
  (s.lastSummary?.recap?.lifts || []).forEach((x) => add(x?.name));
  Object.keys(s.gymSpecific || {}).forEach(add);
  Object.keys(s.rankSnap?.lifts || {}).forEach(add);
  Object.values(s.rankHist || {}).forEach((row) => Object.keys(row?.lifts || {}).forEach(add));
  return names;
}

export function pickPreferredExercise(group, historyCounts) {
  const list = Array.isArray(group) ? group.filter((g) => g && g.ex && g.ex.name) : [];
  if (!list.length) return null;
  const hist = historyCounts instanceof Map ? historyCounts : new Map(Object.entries(historyCounts || {}));
  const bySource = (src) => list.find((g) => g.source === src);
  const histNames = list.map((g) => g.ex.name).filter((n) => hist.has(n));
  let name;
  if (histNames.length) {
    name = [...histNames].sort((a, b) => (hist.get(b) || 0) - (hist.get(a) || 0) || a.localeCompare(b))[0];
  } else if (bySource("catalog")) name = bySource("catalog").ex.name;
  else if (bySource("custom")) name = bySource("custom").ex.name;
  else name = list[0].ex.name;
  const catalog = bySource("catalog");
  const custom = bySource("custom");
  const named = list.find((g) => g.ex.name === name);
  const base = catalog?.ex || custom?.ex || named?.ex || list[0].ex;
  const community = !catalog && !custom;
  return { ...base, name, ...(community ? { community: true } : { community: false }) };
}

export function duplicateExerciseGroups(s, catalogNames = []) {
  const cat = new Set((catalogNames || []).map((n) => String(n)));
  const counts = exerciseHistoryCounts(s);
  const names = [...accountExerciseNames(s)];
  const buckets = new Map();
  names.forEach((n) => {
    const k = exKey(n);
    if (!k) return;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(n);
  });
  const groups = [];
  buckets.forEach((list, key) => {
    const uniq = [...new Set(list)];
    if (uniq.length < 2) return;
    const options = uniq.map((name) => ({ name, sessions: counts.get(name) || 0, catalog: cat.has(name) }));
    options.sort((a, b) => b.sessions - a.sessions || (b.catalog ? 1 : 0) - (a.catalog ? 1 : 0) || a.name.localeCompare(b.name));
    groups.push({ key, names: uniq, options, canonical: options[0].name });
  });
  groups.sort((a, b) => a.canonical.localeCompare(b.canonical));
  return groups;
}

function renameInList(arr, map, field) {
  if (!Array.isArray(arr)) return arr;
  let changed = false;
  const next = arr.map((row) => {
    if (!row || typeof row !== "object") return row;
    const old = row[field];
    const neu = map.get(old);
    if (!neu || neu === old) return row;
    changed = true;
    return { ...row, [field]: neu };
  });
  return changed ? next : arr;
}

export function rewriteExerciseNames(s, mapping) {
  const map = mapping instanceof Map ? mapping : new Map(Object.entries(mapping || {}));
  if (!map.size) return s;
  let out = s;
  const set = (k, v) => { if (v !== out[k]) { if (out === s) out = { ...s }; out[k] = v; } };

  const workouts = (s.workouts || []).map((w) => {
    const exercises = renameInList(w.exercises, map, "name");
    const lines = renameInList(w.lines, map, "name");
    if (exercises === w.exercises && lines === w.lines) return w;
    return { ...w, exercises, ...(w.lines ? { lines } : {}) };
  });
  if (workouts.some((w, i) => w !== s.workouts[i])) set("workouts", workouts);

  if (s.active?.exercises) {
    const exercises = renameInList(s.active.exercises, map, "name");
    if (exercises !== s.active.exercises) set("active", { ...s.active, exercises });
  }

  const presets = (s.presets || []).map((pr) => {
    const exercises = renameInList(pr.exercises, map, "name");
    return exercises === pr.exercises ? pr : { ...pr, exercises };
  });
  if (presets.some((pr, i) => pr !== (s.presets || [])[i])) set("presets", presets);

  const absorbed = new Set([...map.keys()].filter((k) => map.get(k) !== k));
  const custom = (s.custom || []).filter((ex) => !absorbed.has(ex?.name)).map((ex) => {
    const neu = map.get(ex.name);
    return neu && neu !== ex.name ? { ...ex, name: neu } : ex;
  });
  if (custom.length !== (s.custom || []).length || custom.some((ex, i) => ex !== (s.custom || [])[i])) set("custom", custom);

  if (s.lastSummary) {
    let sum = s.lastSummary;
    const prNames = Array.isArray(sum.prNames) ? sum.prNames.map((n) => map.get(n) || n) : sum.prNames;
    const suggestions = renameInList(sum.suggestions, map, "name");
    let recap = sum.recap;
    if (recap?.lifts) {
      const lifts = renameInList(recap.lifts, map, "name");
      if (lifts !== recap.lifts) recap = { ...recap, lifts };
    }
    if (prNames !== sum.prNames || suggestions !== sum.suggestions || recap !== sum.recap) {
      set("lastSummary", { ...sum, prNames, suggestions, recap });
    }
  }

  if (s.gymSpecific && typeof s.gymSpecific === "object") {
    let gs = s.gymSpecific;
    let changed = false;
    const next = { ...gs };
    map.forEach((neu, old) => {
      if (old === neu || !Object.prototype.hasOwnProperty.call(next, old)) return;
      if (!Object.prototype.hasOwnProperty.call(next, neu)) next[neu] = next[old];
      delete next[old];
      changed = true;
    });
    if (changed) set("gymSpecific", next);
  }

  if (s.rankSnap && typeof s.rankSnap === "object") {
    const lifts = remapLiftScores(s.rankSnap.lifts, map);
    if (lifts !== s.rankSnap.lifts) set("rankSnap", { ...s.rankSnap, lifts });
  }

  if (s.rankHist && typeof s.rankHist === "object") {
    let histChanged = false;
    const nextHist = {};
    Object.entries(s.rankHist).forEach(([k, row]) => {
      if (!row || typeof row !== "object") { nextHist[k] = row; return; }
      const lifts = remapLiftScores(row.lifts, map);
      if (lifts !== row.lifts) { histChanged = true; nextHist[k] = { ...row, lifts }; }
      else nextHist[k] = row;
    });
    if (histChanged) set("rankHist", nextHist);
  }

  return out;
}

export function applyExerciseMerge(s, groups, catalogNames = []) {
  const mapping = new Map();
  (groups || []).forEach((g) => {
    if (!g || g.skip) return;
    const canonical = g.canonical;
    (g.names || []).forEach((n) => { if (n && n !== canonical) mapping.set(n, canonical); });
  });
  void catalogNames;
  return rewriteExerciseNames(s, mapping);
}

export const PR_BONUS = 40;

export function levelFromXp(xp) {
  let lvl = 1, need = 100, left = Math.max(0, +xp || 0);
  while (left >= need) { left -= need; lvl++; need = Math.round(100 * Math.pow(lvl, 1.25)); }
  return { lvl, into: left, need };
}

export function xpAtLevelStart(level) {
  const top = Math.max(1, Math.floor(+level || 1));
  let xp = 0;
  for (let n = 1; n < top; n++) xp += Math.round(100 * Math.pow(n, 1.25));
  return xp;
}

export function nextXpFloor(recomputed, { xpFloor = null, beforeXp = 0, version = 3, day = null } = {}) {
  const keep = (xpFloor && Number.isFinite(+xpFloor.keep))
    ? +xpFloor.keep
    : xpAtLevelStart(levelFromXp(beforeXp).lvl);
  const amount = Math.max(0, keep - Math.max(0, +recomputed || 0));
  const out = { v: version, amount, keep };
  const d = day || xpFloor?.d;
  if (d) out.d = d;
  return out;
}

export function unionAchievements(ach, earnedIds, date) {
  const out = { ...(ach || {}) };
  let added = false;
  (earnedIds || []).forEach((id) => {
    if (!id || out[id]) return;
    out[id] = date;
    added = true;
  });
  return added ? out : (ach || {});
}

export function effW(def, ex, w) {
  const userHand = ex?.wMode ? ex.wMode === "hand" : !!def?.perHand;
  if (userHand === !!def?.perHand) return +w || 0;
  return def?.perHand ? (+w || 0) / 2 : (+w || 0) * 2;
}

export function prLoad(def, ex, st) {
  if (!def || def.type === "timed") return null;
  const w = +st?.w || 0;
  if (def.type === "weighted") return effW(def, ex, w);
  return w;
}

export function prKey(s, def, workout) {
  const name = def?.name || "";
  if (isGymSpecific(s, def)) return `${name}@@${workoutGym(workout)}`;
  return name;
}

export function isWeightPr(history, def, load) {
  if (!(history || []).length) return true;
  if (def?.type === "assisted") return history.every((h) => load < h.w);
  return history.every((h) => load > h.w);
}

export function isRepPr(history, def, load, reps) {
  const pool = (history || []).filter((h) => (def?.type === "assisted" ? h.w <= load : h.w >= load));
  if (!pool.length) return false;
  return pool.every((h) => reps > h.r);
}

export function chronoWorkouts(workouts) {
  return (workouts || []).map((w, i) => ({ w, i })).sort((a, b) => {
    const d = String(a.w?.date || "").localeCompare(String(b.w?.date || ""));
    if (d) return d;
    const sa = +a.w?.startedAt || 0, sb = +b.w?.startedAt || 0;
    if (sa !== sb) return sa - sb;
    return a.i - b.i;
  }).map((x) => x.w);
}

export function scoreExercisePrs(def, ex, history, workout, used = null) {
  const flags = [];
  if (!def || def.type === "timed" || isLegacyAssisted(workout, def)) {
    workSets(ex?.sets).forEach(() => flags.push({ pr: false }));
    return flags;
  }
  const got = used || { weight: false, reps: false };
  workSets(ex?.sets).forEach((st) => {
    const reps = +st?.r || 0;
    const load = prLoad(def, ex, st);
    let pr = false;
    if (reps > 0 && load != null) {
      if (!got.weight && isWeightPr(history, def, load)) { pr = "weight"; got.weight = true; }
      else if (!got.reps && isRepPr(history, def, load, reps)) { pr = "reps"; got.reps = true; }
    }
    flags.push({ pr, load, reps });
  });
  return flags;
}

export function appendPrHistory(hist, s, workout, findEx) {
  (workout?.exercises || []).forEach((ex) => {
    const def = findEx(s, ex.name);
    if (!def || def.type === "timed" || isLegacyAssisted(workout, def)) return;
    const key = prKey(s, def, workout);
    const row = hist.get(key) || [];
    workSets(ex.sets).forEach((st) => {
      if ((+st?.r || 0) <= 0) return;
      const load = prLoad(def, ex, st);
      if (load == null) return;
      row.push({ w: load, r: +st.r || 0 });
    });
    hist.set(key, row);
  });
}

export function collectPrHistory(s, findEx, { excludeId = null } = {}) {
  const hist = new Map();
  chronoWorkouts(s?.workouts || []).forEach((w) => {
    if (excludeId && w.id === excludeId) return;
    appendPrHistory(hist, s, w, findEx);
  });
  return hist;
}

export function scoreWorkoutPrs(s, workout, findEx, hist) {
  const byName = new Map();
  const usedByName = new Map();
  let prs = 0;
  (workout?.exercises || []).forEach((ex) => {
    const def = findEx(s, ex.name);
    const key = prKey(s, def, workout);
    const history = hist.get(key) || [];
    if (!usedByName.has(ex.name)) usedByName.set(ex.name, { weight: false, reps: false });
    const flags = scoreExercisePrs(def, ex, history, workout, usedByName.get(ex.name));
    const prev = byName.get(ex.name) || [];
    byName.set(ex.name, prev.concat(flags));
    flags.forEach((f) => { if (f.pr) prs++; });
  });
  return { prs, prBonus: prs * PR_BONUS, byName };
}

function applyPrScoreToWorkout(w, scored) {
  const oldBonus = typeof w.prBonus === "number" && Number.isFinite(w.prBonus) ? w.prBonus : 0;
  const newBonus = scored.prBonus;
  let lines = w.lines;
  let linesChanged = false;
  if (Array.isArray(lines)) {
    const next = lines.map((line) => {
      const flags = scored.byName.get(line.name);
      if (!flags || !Array.isArray(line.sets)) return line;
      let setChanged = false;
      const sets = line.sets.map((st, i) => {
        const pr = flags[i]?.pr || false;
        if (st.pr === pr) return st;
        setChanged = true;
        return { ...st, pr };
      });
      if (!setChanged) return line;
      linesChanged = true;
      return { ...line, sets };
    });
    if (linesChanged) lines = next;
  }
  if (newBonus === oldBonus && !linesChanged) return w;
  return { ...w, xp: (w.xp || 0) - oldBonus + newBonus, prBonus: newBonus, ...(w.lines ? { lines } : {}) };
}

export function recountPrBonuses(s, findEx, { names = null } = {}) {
  const want = names ? new Set(names) : null;
  const hist = new Map();
  const byId = new Map();
  let changed = false;
  chronoWorkouts(s?.workouts || []).forEach((w) => {
    const hasBonus = typeof w.prBonus === "number" && Number.isFinite(w.prBonus);
    const touches = !want || (w.exercises || []).some((ex) => want.has(ex.name));
    let next = w;
    if (hasBonus && touches) {
      next = applyPrScoreToWorkout(w, scoreWorkoutPrs(s, w, findEx, hist));
      if (next !== w) changed = true;
    }
    appendPrHistory(hist, s, w, findEx);
    if (w.id != null) byId.set(w.id, next);
  });
  if (!changed) return s;
  const workouts = (s.workouts || []).map((w) => (w.id != null && byId.has(w.id) ? byId.get(w.id) : w));
  return { ...s, workouts };
}

export function gymSpecificNamesIn(s, workouts, findEx) {
  const names = [];
  const seen = new Set();
  (workouts || []).forEach((w) => (w.exercises || []).forEach((ex) => {
    const n = ex?.name;
    if (!n || seen.has(n)) return;
    if (!isGymSpecific(s, findEx(s, n))) return;
    seen.add(n);
    names.push(n);
  }));
  return names;
}

export function retaggedWorkouts(prev, next) {
  const byId = new Map((prev?.workouts || []).map((w) => [w.id, w]));
  return (next?.workouts || []).filter((w) => workoutGym(w) !== workoutGym(byId.get(w.id)));
}

export function dryRunPrRecount(s, findEx, { version = 3 } = {}) {
  const next = recountPrBonuses(s, findEx);
  const byNew = new Map((next.workouts || []).map((w) => [w.id, w]));
  const hist = new Map();
  const workouts = [];
  chronoWorkouts(s?.workouts || []).forEach((w) => {
    const hasBonus = typeof w.prBonus === "number" && Number.isFinite(w.prBonus);
    if (hasBonus) {
      const scored = scoreWorkoutPrs(s, w, findEx, hist);
      const nw = byNew.get(w.id) || w;
      const sets = [];
      (w.exercises || []).forEach((ex) => {
        const flags = scored.byName.get(ex.name) || [];
        const lineSets = (nw.lines || []).find((l) => l.name === ex.name)?.sets || [];
        workSets(ex.sets).forEach((st, i) => {
          if (!flags[i]?.pr) return;
          sets.push({ name: ex.name, label: lineSets[i]?.label || `${st.w}×${st.r}`, pr: flags[i].pr });
        });
      });
      workouts.push({ date: w.date, title: w.title || "", oldBonus: w.prBonus, newBonus: nw.prBonus, sets });
    }
    appendPrHistory(hist, s, w, findEx);
  });
  const sumXp = (list) => (list || []).reduce((a, w) => a + (+w.xp || 0), 0);
  const oldTotal = +s.xp || 0;
  const woDelta = sumXp(next.workouts) - sumXp(s.workouts);
  const recomputed = oldTotal + woDelta - (+s.xpFloor?.amount || 0);
  const floor = nextXpFloor(recomputed, { xpFloor: s.xpFloor, beforeXp: oldTotal, version });
  return { workouts, oldTotal, recomputed, floor: floor.amount, keep: floor.keep, final: recomputed + floor.amount, next };
}

export const LB_XP_VERSION = 3;
export const SETTINGS_KEY_LEGACY = "ascend-settings";
export const PENDING_KEY_LEGACY = "ascend-pending";

export function settingsKey(userId) {
  return userId ? `ascend-settings:${userId}` : SETTINGS_KEY_LEGACY;
}
export function pendingKey(userId) {
  return userId ? `ascend-pending:${userId}` : PENDING_KEY_LEGACY;
}
export function verifiedCopyKey(userId) {
  return userId ? `ascend-verified:${userId}` : "ascend-verified";
}

/** Unscoped settings belong only to the account whose server savedAt matches exactly. */
export function claimUnscopedSettings(unscoped, serverSettings) {
  if (!unscoped || typeof unscoped !== "object") return false;
  const at = unscoped.savedAt || 0;
  return at > 0 && at === (serverSettings?.savedAt || 0);
}

export function mergeScopedSettings(server, scoped) {
  const base = server && typeof server === "object" ? server : {};
  if (!scoped || typeof scoped !== "object") return base;
  if ((scoped.savedAt || 0) > (base.savedAt || 0)) return { ...base, ...scoped };
  return base;
}

/** Pending blob is this account's only when it carries this playerId. */
export function claimUnscopedPending(pending, playerId) {
  if (!pending?.state || !playerId) return false;
  return pending.state.playerId === playerId;
}

export function overlayOwnBoardRow(rows, live, playerId, flags = {}) {
  if (!playerId || !live || !flags.lb || flags.test) return rows || [];
  const key = `lb:${playerId}`;
  const mine = { ...live, id: playerId, key };
  const others = (rows || []).filter((r) => r && r.key !== key && r.id !== playerId);
  return [mine, ...others];
}

export function cardNeedsXpUpdate(card, minV = LB_XP_VERSION) {
  if (!card) return false;
  const v = card.xpV;
  return v == null || v < minV;
}

export function nextPublishBackoff(attempt, base = 1200, max = 30000) {
  const n = Math.max(0, attempt | 0);
  return Math.min(max, base * (2 ** Math.min(n, 8)));
}

export function shouldPublishLbCard({ loaded, lb, test, name, noPersist } = {}) {
  return !!(loaded && lb && name && !test && !noPersist);
}

export async function tryPublish(write, payload, { attempt = 0, schedule } = {}) {
  try {
    await write(payload);
    return { ok: true, attempt: 0 };
  } catch (e) {
    const next = attempt + 1;
    if (schedule) schedule(nextPublishBackoff(next), next);
    return { ok: false, attempt: next, err: e };
  }
}

/** Aura, border and title only — never name, fonts, colours, theme or other settings. */
export function stripGhostCosmeticsState(s, { allowAura, allowBorder, titleId } = {}) {
  const look = { ...(s.profile?.look || {}) };
  let changed = false;
  const auraOk = typeof allowAura === "function" ? allowAura : () => true;
  const borderOk = typeof allowBorder === "function" ? allowBorder : () => true;
  if (look.aura && look.aura !== "none" && !auraOk(look.aura)) {
    look.aura = look.auraPrev && look.auraPrev !== "ascended" && auraOk(look.auraPrev) ? look.auraPrev : "none";
    changed = true;
  }
  if (look.border && look.border !== "none" && !borderOk(look.border)) {
    look.border = "none";
    changed = true;
  }
  const tid = titleId != null ? titleId : (s.profile?.title || "none");
  if ((s.profile?.title || "none") !== tid) changed = true;
  const profile = { ...s.profile, look, title: tid };
  if (!changed && look === s.profile?.look) return { ...s, test: false };
  return { ...s, test: false, profile };
}

export const KV_NOT_FOUND = "Key not found";

export function classifyKvError(e) {
  const msg = String(e?.message || e || "");
  if (msg === KV_NOT_FOUND || /key not found/i.test(msg)) return "not_found";
  return "error";
}

export async function readAccountBlob(get) {
  try {
    const r = await get("ascend-state");
    if (r?.value) return { kind: "ok", value: r.value };
    return { kind: "not_found" };
  } catch (e) {
    if (classifyKvError(e) === "not_found") return { kind: "not_found" };
    return { kind: "error", err: e };
  }
}

export const WIPE_NEAR_XP = 10;
export const WIPE_MIN_WORKOUTS = 3;
export const WIPE_MIN_XP = 500;

export function persistWouldWipe(server, next, { nearXp = WIPE_NEAR_XP, minWorkouts = WIPE_MIN_WORKOUTS, minXp = WIPE_MIN_XP } = {}) {
  if (!server || typeof server !== "object") return false;
  const sXp = +server.xp || 0;
  const sWo = Array.isArray(server.workouts) ? server.workouts.length : 0;
  const nXp = +next?.xp || 0;
  const nWo = Array.isArray(next?.workouts) ? next.workouts.length : 0;
  if (sWo < minWorkouts && sXp < minXp) return false;
  return nWo === 0 || nXp <= nearXp;
}

export function looksLikeDefaultBlob(state) {
  if (!state || typeof state !== "object") return true;
  const xp = +state.xp || 0;
  const wo = Array.isArray(state.workouts) ? state.workouts.length : 0;
  const name = String(state.profile?.name || "").trim();
  return xp <= 0 && wo === 0 && !name;
}

export function makeVerifiedCopy(userId, state, { t = Date.now() } = {}) {
  if (!userId || !state || typeof state !== "object") return null;
  return {
    userId,
    rev: Number.isFinite(+state.rev) ? +state.rev : 0,
    t,
    state,
  };
}

export function isVerifiedLocalCopy(copy, userId) {
  if (!copy || typeof copy !== "object") return false;
  if (!userId || copy.userId !== userId) return false;
  if (!Number.isFinite(+copy.rev)) return false;
  if (looksLikeDefaultBlob(copy.state)) return false;
  return true;
}

export function canPersistAccount({ readKind, server, next, allowWipe } = {}) {
  if (allowWipe) return { ok: true };
  if (readKind !== "ok" && readKind !== "not_found") return { ok: false, reason: "no-server-read" };
  if (readKind === "ok" && persistWouldWipe(server, next)) return { ok: false, reason: "wipe-tripwire" };
  return { ok: true };
}

export function hydrateWritePlan(readKind, { verified, userId } = {}) {
  if (readKind === "not_found") return { persist: true, firstRun: true, retry: false, useLocal: false };
  if (readKind === "ok") return { persist: true, firstRun: false, retry: false, useLocal: false };
  if (readKind === "error" && isVerifiedLocalCopy(verified, userId)) {
    return { persist: false, retry: false, useLocal: true, ui: "offline" };
  }
  return { persist: false, retry: true, ui: "load-error", useLocal: false };
}

export async function guardedAccountWrite({ get, set, next, allowWipe = false, readKind, server } = {}) {
  let kind = readKind;
  let remote = server;
  if (kind == null && typeof get === "function") {
    const got = await readAccountBlob(get);
    kind = got.kind;
    if (got.kind === "ok") {
      try { remote = JSON.parse(got.value); }
      catch { return { wrote: false, reason: "parse" }; }
    }
  }
  const gate = canPersistAccount({ readKind: kind, server: remote, next, allowWipe });
  if (!gate.ok) {
    try { console.warn("[ascend] refused persist:", gate.reason); } catch { /* ignore */ }
    return { wrote: false, reason: gate.reason };
  }
  const payload = typeof next === "string" ? next : JSON.stringify(next);
  await set("ascend-state", payload);
  return { wrote: true };
}
