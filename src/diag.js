// Hidden diagnostic ring buffer. Off-path is a boolean check and return.
// No food names, exercise names, or other content — lengths, ids, and flags only.

const RING_MS = 120000;
const MAX_N = 4000;
const SAFE_STR = new Set(["k", "src", "kind", "type", "ptr", "st", "reason", "v", "sw"]);
const USER_SRC = new Set(["user", "setActive"]);

let enabled = false;
let uid = "anon";
let buf = [];
let srcStack = [];
let rafId = 0;
let lastRaf = 0;
let lastRpsSec = 0;
let rps = { App: 0, Train: 0, Fuel: 0 };
let seq = 0;
let shiftObs = null;
let boxRaf = 0;
let lastBoxes = null;

const now = () => Date.now();
const storeKey = () => `ascend-diag:${uid || "anon"}`;

function scrub(ev) {
  const out = {};
  for (const [k, v] of Object.entries(ev || {})) {
    if (typeof v === "string") {
      if (SAFE_STR.has(k)) out[k] = v;
      else out[k] = v.length;
    } else if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      const inner = scrub(v);
      if (Object.keys(inner).length) out[k] = inner;
    }
  }
  return out;
}

export function push(ev) {
  if (!enabled) return;
  const row = scrub({ ...ev, t: now() });
  buf.push(row);
  const cut = now() - RING_MS;
  while (buf.length && buf[0].t < cut) buf.shift();
  if (buf.length > MAX_N) buf.splice(0, buf.length - MAX_N);
}

export function on() { return enabled; }

export function nextSeq() { return ++seq; }

export function srcLabel() { return srcStack[srcStack.length - 1] || "user"; }

export function withSource(label, fn) {
  srcStack.push(label);
  try { return fn(); }
  finally { srcStack.pop(); }
}

export function boot(userId) {
  if (userId) uid = String(userId);
  try { enabled = localStorage.getItem(storeKey()) === "1"; }
  catch { enabled = false; }
  if (enabled) start();
  else stop();
  return enabled;
}

export function toggle(userId) {
  if (userId) uid = String(userId);
  enabled = !enabled;
  try { localStorage.setItem(storeKey(), enabled ? "1" : "0"); }
  catch { /* */ }
  if (enabled) start();
  else stop();
  push({ k: "toggle", st: enabled ? "on" : "off" });
  return enabled;
}

export function enable(userId) {
  if (userId) uid = String(userId);
  if (enabled) return true;
  enabled = true;
  try { localStorage.setItem(storeKey(), "1"); } catch { /* */ }
  start();
  push({ k: "toggle", st: "on" });
  return true;
}

export function clear() { buf = []; }

export function formatDump(extra) {
  const header = {
    k: "header",
    v: extra?.version || (typeof globalThis !== "undefined" && globalThis.__ASCEND_VERSION) || "",
    sw: extra?.sw || "",
    uid: uid ? String(uid).length : 0,
    n: extra?.events ? extra.events.length : buf.length,
    t: now(),
  };
  const events = extra?.events || buf;
  return JSON.stringify({ header: scrub(header), events: events.map(scrub) });
}

function start() {
  stopObserversOnly();
  lastRaf = 0;
  lastRpsSec = Math.floor(now() / 1000);
  rps = { App: 0, Train: 0, Fuel: 0 };
  let stallN = 0;
  const loop = (t) => {
    if (!enabled) return;
    if (lastRaf && t - lastRaf > 50) {
      const gap = Math.round(t - lastRaf);
      stallN += 1;
      if (gap >= 120 || stallN % 8 === 1) push({ k: "stall", gap });
    }
    lastRaf = t;
    flushRps();
    if (typeof requestAnimationFrame === "function") rafId = requestAnimationFrame(loop);
  };
  if (typeof requestAnimationFrame === "function") rafId = requestAnimationFrame(loop);
  if (typeof globalThis !== "undefined" && typeof globalThis.PerformanceObserver === "function") {
    try {
      shiftObs = new globalThis.PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.value > 0) push({ k: "shift", gap: Math.round(e.value * 1000), st: e.hadRecentInput ? "input" : "noinput" });
        }
      });
      shiftObs.observe({ type: "layout-shift", buffered: true });
    } catch { shiftObs = null; }
  }
  if (!shiftObs && typeof requestAnimationFrame === "function") {
    let boxSkip = 0;
    const boxes = () => {
      if (!enabled) return;
      boxSkip += 1;
      if (boxSkip % 8 === 1) {
        try {
          const next = measureBoxes();
          if (lastBoxes && next) {
            for (const id of Object.keys(next)) {
              const a = lastBoxes[id], b = next[id];
              if (!a || !b) continue;
              const d = Math.abs(a.t - b.t) + Math.abs(a.l - b.l) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h);
              if (d > 2) push({ k: "box", kind: id, gap: Math.round(d) });
            }
          }
          lastBoxes = next;
        } catch { /* */ }
      }
      boxRaf = requestAnimationFrame(boxes);
    };
    boxRaf = requestAnimationFrame(boxes);
  }
}

function measureBoxes() {
  if (typeof document === "undefined") return null;
  const grab = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { t: r.top, l: r.left, w: r.width, h: r.height };
  };
  const out = {};
  const table = grab("[data-diag='settable']");
  if (table) out.settable = table;
  const fuel = grab("[data-diag='fuel-servings']");
  if (fuel) out.servings = fuel;
  return out;
}

function stopObserversOnly() {
  if (rafId && typeof cancelAnimationFrame === "function") { try { cancelAnimationFrame(rafId); } catch { /* */ } }
  rafId = 0;
  if (boxRaf && typeof cancelAnimationFrame === "function") { try { cancelAnimationFrame(boxRaf); } catch { /* */ } }
  boxRaf = 0;
  lastRaf = 0;
  lastBoxes = null;
  if (shiftObs) { try { shiftObs.disconnect(); } catch { /* */ } shiftObs = null; }
}

function stop() {
  stopObserversOnly();
}

function flushRps() {
  const sec = Math.floor(now() / 1000);
  if (sec === lastRpsSec) return;
  if (rps.App || rps.Train || rps.Fuel) push({ k: "rps", App: rps.App, Train: rps.Train, Fuel: rps.Fuel });
  rps = { App: 0, Train: 0, Fuel: 0 };
  lastRpsSec = sec;
}

export function noteRender(name) {
  const c = typeof window !== "undefined" ? window.__ascendRpsCount : null;
  if (c && (name === "App" || name === "Train" || name === "Fuel")) c[name] = (c[name] || 0) + 1;
  if (!enabled) return;
  if (name === "App" || name === "Train" || name === "Fuel") rps[name] += 1;
}

export function check(type, ei, si, done, ptr) {
  if (!enabled) return;
  push({ k: "check", type, ei, si, done: !!done, ptr: ptr ? String(ptr) : "" });
}

export function checkAfter(ei, si, done, ran) {
  if (!enabled) return;
  push({ k: "check", type: "after", ei, si, done: !!done, ran: !!ran });
}

const EMPTY_BIND = {};

export function fuelBind(kind) {
  if (!enabled) return EMPTY_BIND;
  return {
    onBeforeInput: (e) => inp("beforeinput", kind, e),
    onInput: (e) => inp("input", kind, e),
  };
}

function inp(type, kind, e) {
  if (!enabled) return;
  const t = e?.target;
  const v = t && typeof t.value === "string" ? t.value : "";
  const data = e?.nativeEvent?.data || e?.data || "";
  push({
    k: "inp",
    type: e?.nativeEvent?.inputType || e?.inputType || type,
    kind,
    len: v.length,
    sel: t && typeof t.selectionStart === "number" ? t.selectionStart : -1,
    n: typeof data === "string" ? data.length : 0,
  });
}

export function life(st, extra) {
  if (!enabled) return;
  push({ k: "save", st, ...(extra || {}) });
}

function doneBits(s) {
  const a = s && s.active;
  if (!a || !Array.isArray(a.exercises)) return "";
  let o = "";
  for (let i = 0; i < a.exercises.length; i++) {
    const sets = a.exercises[i] && a.exercises[i].sets;
    if (!sets) { o += "|"; continue; }
    for (let j = 0; j < sets.length; j++) o += sets[j] && sets[j].done ? "1" : "0";
    o += "|";
  }
  return o;
}

function qtyHash(s) {
  const meals = s && s.meals;
  if (!meals) return 0;
  let n = 0, q = 0;
  const keys = Object.keys(meals);
  n = keys.length;
  for (let i = 0; i < keys.length; i++) {
    const arr = meals[keys[i]] || [];
    n += arr.length;
    for (let j = 0; j < arr.length; j++) q = (q * 33 + Math.round((+arr[j].qty || 0) * 100)) | 0;
  }
  return n ^ q;
}

export function applySetS(raw, u) {
  if (!enabled) { raw(u); return; }
  const src = srcLabel();
  const fn = typeof u === "function";
  push({ k: "setS", src, fn: !!fn });
  if (fn) {
    raw((p) => {
      const next = u(p);
      diffState(p, next, src);
      return next;
    });
  } else {
    raw((p) => {
      diffState(p, u, src);
      return u;
    });
  }
}

function diffState(prev, next, src) {
  if (!next || typeof next !== "object") return;
  if (prev && typeof prev === "object") {
    const d = doneBits(next);
    const pd = doneBits(prev);
    if (d !== pd && !USER_SRC.has(src)) push({ k: "revert", kind: "done", src, n: d.length, id: pd.length });
    const q = qtyHash(next);
    const pq = qtyHash(prev);
    if (q !== pq && !USER_SRC.has(src)) push({ k: "revert", kind: "qty", src, n: q, id: pq });
  }
}

export function sampleEvents() {
  const foodName = "Chicken Breast";
  const exName = "Bench Press";
  const meal = "P. Terry's double";
  return [
    scrub({ k: "check", type: "pd", ei: 0, si: 1, done: false, ptr: "touch" }),
    scrub({ k: "setS", src: "setActive", fn: true }),
    scrub({ k: "inp", type: "insertText", kind: "fuel-search", len: foodName.length, sel: foodName.length, n: 1 }),
    scrub({ k: "inp", type: "insertText", kind: "fuel-desc", len: meal.length, sel: meal.length, n: 1 }),
    scrub({ k: "mount", kind: "setrow", n: 3, id: exName.length }),
    scrub({ k: "rps", App: 4, Train: 3, Fuel: 2 }),
    scrub({ k: "save", st: "start", n: 18000 }),
    scrub({ k: "stall", gap: 72 }),
  ];
}

export function dumpHasContent(text) {
  const banned = ["Chicken", "Breast", "Bench", "Press", "Terry", "double", "Oats", "protein"];
  return banned.some((w) => text.includes(w));
}

if (typeof globalThis !== "undefined" && typeof window !== "undefined") {
  window.__ascendDiag = {
    dump: () => formatDump(),
    clear,
    on: () => enabled,
    enable: (id) => enable(id),
    toggle: (id) => toggle(id),
  };
}
