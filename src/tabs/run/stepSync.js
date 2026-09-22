import { XpSync, SB_URL } from "../train/xpSync.js";
export const STEP_SHORTCUT_URL = "https://www.icloud.com/shortcuts/PUT_HASH_HERE";
export async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function stepSyncStatus(hash, code) {
  const h = await XpSync.headers();
  if (!h) return null;
  const [log, st] = await Promise.all([
    fetch(`${SB_URL}/rest/v1/step_sync_log?select=at,ok,reason,steps,day&order=at.desc&limit=5`, { headers: h }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    hash ? fetch(`${SB_URL}/rest/v1/rpc/my_step_sync_status`, { method: "POST", headers: h, body: JSON.stringify({ p_hash: hash, p_tail: String(code || "").slice(-6) }) }).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null,
  ]);
  if (!log && !st) return null;
  return { log: log || [], registered: st ? !!st.registered : null, unrecognized: st?.unrecognized || [] };
}
export const STEP_SYNC_URL = "https://www.ascendfit.site/api/steps";
export const agoText = (iso) => { const d = new Date(iso), days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000); const t = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); return days === 0 ? `Today ${t}` : days === 1 ? `Yesterday ${t}` : `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${t}`; };
