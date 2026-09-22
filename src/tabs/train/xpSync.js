import { nextPublishBackoff } from "../../math.js";
export const SB_URL = import.meta.env?.VITE_SUPABASE_URL, SB_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
export const toServerRow = (r) => ({ event_id: String(r.e).slice(0, 120), amount: r.a, source: String(r.m || "").slice(0, 120), day: r.d, at: new Date(r.t || Date.now()).toISOString() });
export const XpSync = {
  busy: false,
  fail: 0,
  retryTimer: null,
  key() { return `ascend-xp-outbox:${(typeof window !== "undefined" && window.ascendUserId) || "me"}`; },
  read() { try { return JSON.parse(localStorage.getItem(this.key()) || "null") || { replace: null, add: [] }; } catch (e) { return { replace: null, add: [] }; } },
  write(o) {
    try { localStorage.setItem(this.key(), JSON.stringify(o)); } catch (e) { /* storage full: rows stay in memory state */ }
    try { window.dispatchEvent(new CustomEvent("ascend-xp-sync")); } catch (e) { /* UI refresh only */ }
  },
  add(row) { if (typeof window !== "undefined" && window.__ascendNoPersist) return; const o = this.read(); o.add = [...o.add.filter((x) => x.e !== row.e), row]; this.write(o); this.flush(); },
  replace(rows) { if (typeof window !== "undefined" && window.__ascendNoPersist) return; this.write({ replace: rows, add: [] }); this.flush(); },
  pending() { const o = this.read(); return (o.replace ? o.replace.length : 0) + o.add.length; },
  async headers() {
    const token = await window.ascendAuth?.token?.().catch(() => null);
    return token && SB_URL && SB_KEY ? { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : null;
  },
  async flush() {
    if (typeof window !== "undefined" && window.__ascendNoPersist) return;
    if (this.busy || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
    this.busy = true;
    const retry = () => {
      if (this.retryTimer) return;
      this.fail += 1;
      this.retryTimer = setTimeout(() => { this.retryTimer = null; this.flush(); }, nextPublishBackoff(this.fail));
    };
    try {
      const h = await this.headers();
      if (!h) return;
      let o = this.read();
      if (o.replace) {
        const r = await fetch(`${SB_URL}/rest/v1/rpc/xp_replace`, { method: "POST", headers: h, body: JSON.stringify({ p_rows: o.replace.map(toServerRow) }) });
        if (!r.ok) { retry(); return; }
        o = this.read(); o.replace = null; this.write(o);
      }
      while (o.add.length) {
        const batch = o.add.slice(0, 200);
        const r = await fetch(`${SB_URL}/rest/v1/xp_logs?on_conflict=user_id,event_id`, { method: "POST", headers: { ...h, Prefer: "resolution=ignore-duplicates,return=minimal" }, body: JSON.stringify(batch.map(toServerRow)) });
        if (!r.ok) { retry(); return; }
        o = this.read(); const sent = new Set(batch.map((x) => x.e)); o.add = o.add.filter((x) => !sent.has(x.e)); this.write(o);
      }
      this.fail = 0;
    } catch (e) { retry(); } finally { this.busy = false; }
  },
  async page(offset = 0, limit = 50) {
    const h = await this.headers();
    if (!h) return null;
    const r = await fetch(`${SB_URL}/rest/v1/xp_logs?select=event_id,amount,source,day,at&order=at.desc,event_id.desc&offset=${offset}&limit=${limit}`, { headers: h });
    return r.ok ? r.json() : null;
  },
  async summary(seasonFrom, monthFrom) {
    const h = await this.headers();
    if (!h) return null;
    const r = await fetch(`${SB_URL}/rest/v1/rpc/xp_summary`, { method: "POST", headers: h, body: JSON.stringify({ p_season_from: seasonFrom, p_month_from: monthFrom }) });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] : j;
  },
};
