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
    if (isObj(local) || isObj(server) || isObj(snap)) return mergeMap(isObj(local) ? local : {}, isObj(server) ? server : {}, isObj(snap) ? snap : {});
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
  { id: "sessions", title: "workouts", per: 4, unit: "workouts", get: (wk) => wk.workouts },
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
