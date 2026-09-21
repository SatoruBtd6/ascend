// Gives App.jsx its window.storage backed by Supabase, with an on-device copy so the app
// keeps working with no signal and syncs automatically when the connection comes back.

const LS = "ascend-kv:";
const QUEUE = "ascend-kv-queue";
const lsGet = (k) => { try { return localStorage.getItem(LS + k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(LS + k, v); } catch { /* storage full: skip mirror */ } };
const lsDel = (k) => { try { localStorage.removeItem(LS + k); } catch { /* ignore */ } };
const readQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE) || "[]"); } catch { return []; } };
const writeQueue = (q) => { try { localStorage.setItem(QUEUE, JSON.stringify(q)); } catch { /* ignore */ } };
const isNetErr = (e) => !navigator.onLine || /fetch|network|failed|load/i.test(String(e?.message || e));
const isAuthErr = (e) => /jwt|token|auth|unauthorized|401|expired|invalid_grant|session/i.test(`${e?.message || e} ${e?.code || ""} ${e?.status || ""}`);
const isPermanentErr = (e) => /payload too large|too large|413|value too long|22p02/i.test(`${e?.message || e} ${e?.code || ""} ${e?.status || ""} ${e?.details || ""}`);
// Only the user's own small records get mirrored; big shared blobs (songs, photos) stay online-only
const mirrorable = (scope, key, value) => !scope.startsWith("shared") && String(value ?? "").length < 1_500_000;

export function installStorage(supabase, userId) {
  if (window.__ascendStorageUser === userId && window.storage) return;
  window.__ascendStorageUser = userId;
  const scope = (shared) => (shared ? "shared" : `user:${userId}`);
  const cache = new Map();
  const esc = (t) => t.replace(/[%_\\]/g, (c) => `\\${c}`);
  const id = (shared, key) => `${scope(shared)}|${key}`;

  const pushNow = async (op) => {
    if (op.type === "set") {
      const { error } = await supabase.from("kv").upsert({ scope: op.scope, key: op.key, value: op.value, updated_at: new Date(op.t).toISOString() }, { onConflict: "scope,key" });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("kv").delete().eq("scope", op.scope).eq("key", op.key);
      if (error) throw error;
    }
  };
  const enqueue = (op) => { const q = readQueue().filter((x) => !(x.scope === op.scope && x.key === op.key)); q.push(op); writeQueue(q); };
  const purgeObjectUrls = async (raw) => {
    const texts = [];
    const walk = (v) => {
      if (v == null) return;
      if (typeof v === "string") {
        texts.push(v);
        if (v.startsWith("{") || v.startsWith("[")) { try { walk(JSON.parse(v)); } catch { /* not json */ } }
        return;
      }
      if (typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(raw);
    for (const t of texts) {
      const m = t.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
      if (!m || !supabase?.storage) continue;
      try { await supabase.storage.from(decodeURIComponent(m[1])).remove([decodeURIComponent(m[2])]); } catch { /* bucket missing or already gone */ }
    }
  };
  let flushing = false;
  const flush = async () => {
    if (flushing || !navigator.onLine) return;
    flushing = true;
    try {
      let q = readQueue();
      let refreshed = false;
      while (q.length) {
        try {
          await pushNow(q[0]);
        } catch (e) {
          if (isNetErr(e)) break;
          if (isAuthErr(e)) {
            if (!refreshed) {
              refreshed = true;
              try { await supabase.auth.refreshSession(); } catch (re) { console.warn("[ascend] queue flush: session refresh failed", re); break; }
              try { await pushNow(q[0]); }
              catch (e2) {
                if (isPermanentErr(e2)) { console.warn("[ascend] dropped queued op", q[0]?.key, e2); q = readQueue().slice(1); writeQueue(q); continue; }
                console.warn("[ascend] queue flush: keeping op", e2);
                break;
              }
            } else {
              console.warn("[ascend] queue flush: auth error after refresh, keeping op", e);
              break;
            }
          } else if (isPermanentErr(e)) {
            console.warn("[ascend] dropped queued op", q[0]?.key, e);
            q = readQueue().slice(1); writeQueue(q);
            continue;
          } else {
            console.warn("[ascend] queue flush: keeping op", e);
            break;
          }
        }
        q = readQueue().slice(1); writeQueue(q);
      }
    } finally { flushing = false; }
    return readQueue().length === 0;
  };
  const convertQueuedState = () => {
    const q = readQueue();
    const rest = [];
    let changed = false;
    for (const op of q) {
      if (op?.type === "set" && op.key === "ascend-state") {
        try {
          const state = JSON.parse(op.value);
          let snap = null;
          try { snap = JSON.parse(localStorage.getItem("ascend-pending") || "null")?.snap || null; } catch { snap = null; }
          localStorage.setItem("ascend-pending", JSON.stringify({ state, snap, t: op.t || Date.now() }));
          changed = true;
        } catch (e) { rest.push(op); }
      } else rest.push(op);
    }
    if (changed || rest.length !== q.length) writeQueue(rest);
  };
  convertQueuedState();
  window.addEventListener("online", flush);
  window.addEventListener("pagehide", () => { flush(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  setInterval(flush, 20000);
  flush();

  window.storage = {
    async get(key, shared = false, opts = {}) {
      const ck = id(shared, key);
      const c = cache.get(ck);
      if (!opts.fresh && c && Date.now() - c.t < 4000) return { key, value: c.value, shared };
      // If this key has unsent local changes, the local copy is the newest
      if (!opts.fresh && !shared && readQueue().some((x) => x.scope === scope(false) && x.key === key)) {
        const v = lsGet(ck); if (v !== null) return { key, value: v, shared };
      }
      try {
        const { data, error } = await supabase.from("kv").select("value").eq("scope", scope(shared)).eq("key", key).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Key not found");
        if (mirrorable(scope(shared), key, data.value)) lsSet(ck, data.value);
        return { key, value: data.value, shared };
      } catch (e) {
        if (String(e?.message) === "Key not found") throw e;
        const v = lsGet(ck);
        if (v !== null) return { key, value: v, shared };
        throw e;
      }
    },
    async set(key, value, shared = false, opts = {}) {
      const ck = id(shared, key), v = String(value);
      cache.delete(ck);
      if (mirrorable(scope(shared), key, v)) lsSet(ck, v);
      const op = { type: "set", scope: scope(shared), key, value: v, t: Date.now() };
      try { await pushNow(op); }
      catch (e) {
        if (opts.noQueue) throw e;
        if (isNetErr(e) && !shared) { enqueue(op); return { key, value, shared, queued: true }; }
        throw e;
      }
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      const ck = id(shared, key);
      let prev = cache.get(ck)?.value ?? lsGet(ck);
      if (prev == null) {
        try {
          const { data } = await supabase.from("kv").select("value").eq("scope", scope(shared)).eq("key", key).maybeSingle();
          prev = data?.value;
        } catch { /* already gone */ }
      }
      await purgeObjectUrls(prev);
      cache.delete(ck); lsDel(ck);
      const op = { type: "delete", scope: scope(shared), key, t: Date.now() };
      try { await pushNow(op); }
      catch (e) {
        if (isNetErr(e) && !shared) { enqueue(op); return { key, deleted: true, shared, queued: true }; }
        throw e;
      }
      return { key, deleted: true, shared };
    },
    async purgeValue(value) { await purgeObjectUrls(value); },
    async list(prefix = "", shared = false) {
      try {
        const { data, error } = await supabase.from("kv").select("key,value").eq("scope", scope(shared)).like("key", `${esc(prefix)}%`);
        if (error) throw error;
        const t = Date.now();
        data.forEach((d) => cache.set(id(shared, d.key), { value: d.value, t }));
        return { keys: data.map((d) => d.key), prefix, shared };
      } catch (e) {
        if (shared) throw e;
        const keys = [];
        try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); const pre = LS + id(false, prefix); if (k && k.startsWith(pre)) keys.push(k.slice((LS + scope(false) + "|").length)); } } catch { /* ignore */ }
        return { keys, prefix, shared };
      }
    },
    pending: () => readQueue().length,
    flush,
  };
}

export function installClaudeProxy(supabase) {
  if (window.__ascendProxy) return;
  window.__ascendProxy = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    if (typeof url === "string" && url.startsWith("https://api.anthropic.com/v1/messages")) {
      const { data } = await supabase.auth.getSession();
      const headers = { ...(opts.headers || {}), Authorization: `Bearer ${data.session?.access_token || ""}` };
      return orig("/api/claude", { ...opts, headers });
    }
    return orig(url, opts);
  };
}
