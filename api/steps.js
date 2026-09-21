// Receives step counts from an iPhone Shortcut and saves them to the owner's inbox.
// Built to forgive the usual Shortcut setup slips: form vs JSON body, "8,432", "9/18/26", pasted spaces.
import { createClient } from "@supabase/supabase-js";

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");
const valid = (y, m, d) => { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; };
const fullYear = (y) => (y < 100 ? 2000 + y : y);

export function parseDate(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { const [y, mo, d] = [+m[1], +m[2], +m[3]]; return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null; } // also ISO with a time after it
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) { const [mo, d, y] = [+m[1], +m[2], fullYear(+m[3])]; return valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null; } // US 9/18/26
  if ((m = s.match(/([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/))) { const mo = MONTHS[m[1].toLowerCase().slice(0, 3)]; const [d, y] = [+m[2], +m[3]]; return mo && valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null; } // Sep 18, 2026
  if ((m = s.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/))) { const mo = MONTHS[m[2].toLowerCase().slice(0, 3)]; const [d, y] = [+m[1], +m[3]]; return mo && valid(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null; } // 18 Sep 2026
  return null;
}
export function parseSteps(raw) {
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.round(raw) : null;
  let s = String(raw ?? "").trim();
  if (!s) return null;
  s = s.replace(/[^\d.,]/g, "");
  if (/,\d{1,2}$/.test(s) && !s.includes(".")) s = s.replace(",", "."); // decimal comma, e.g. 8432,5
  s = s.replace(/,/g, "");
  const n = Number(s);
  return s && Number.isFinite(n) ? Math.round(n) : null;
}
export function classifyStepCount(raw) {
  if (raw == null) return { kind: "blank" };
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { kind: "invalid", raw };
    return { kind: "ok", steps: Math.round(raw) };
  }
  if (!String(raw).trim()) return { kind: "blank" };
  const steps = parseSteps(raw);
  if (steps === null) return { kind: "invalid", raw };
  return { kind: "ok", steps };
}
export function stepIngestPlan(body) {
  const raw = body?.steps ?? body?.step ?? body?.count;
  const classified = classifyStepCount(raw);
  if (classified.kind === "blank") return { ingest: false, ok: true, status: 200, message: "No steps in this request" };
  if (classified.kind === "invalid") return { ingest: false, ok: false, status: 400, message: `couldn't read the steps "${String(raw ?? "").slice(0, 30)}". Set the steps field to the Statistics result` };
  return { ingest: true, ok: true, steps: classified.steps };
}
export function parseToken(raw) {
  const s = String(raw ?? "");
  const hex = s.match(/[0-9a-f]{48}/i);
  return hex ? hex[0].toLowerCase() : s.replace(/\s+/g, "").replace(/^["']|["']$/g, "");
}
export function readBody(req) {
  let b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch { b = Object.fromEntries(new URLSearchParams(b)); }
  }
  if (!b || typeof b !== "object") b = {};
  return { ...(req.query || {}), ...b };
}
const todayIn = (tz) => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch { return null; } };

export default async function handler(req, res) {
  if (req.method === "GET" && !req.query?.token) {
    return res.status(200).json({ ok: false, message: "Ascend step sync is reachable, but your Shortcut must send a POST. In Get Contents of URL, set Method to POST. Also use the www.ascendfit.site address." });
  }
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ ok: false, message: "Use POST" });
  try {
    const b = readBody(req);
    const token = parseToken(b.token ?? b.code);
    if (token.length < 20) return res.status(400).json({ ok: false, message: "Missing sync code. Add a field named token with your code from Ascend." });
    const plan = stepIngestPlan(b);
    if (!plan.ingest) return res.status(plan.status).json({ ok: plan.ok, ingested: false, message: plan.message });
    const steps = plan.steps;
    let day = parseDate(b.date ?? b.day), note = null;
    if (!day && !(b.date ?? b.day)) { day = todayIn(String(b.tz || "America/Chicago")); note = "no date sent, used today"; }
    if (!day) note = `couldn't read the date "${String(b.date ?? b.day).slice(0, 30)}". Use Format Date → Custom → yyyy-MM-dd`;

    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc("ingest_steps_v2", { p_token: token, p_day: day, p_steps: steps, p_note: day && steps !== null ? null : note });
    if (error) {
      // v2 SQL not run yet: fall back to the original function so syncing still works
      if (/ingest_steps_v2/.test(error.message || "") && day && steps !== null) {
        const r = await supabase.rpc("ingest_steps", { p_token: token, p_date: day, p_steps: steps });
        if (r.error) return res.status(500).json({ ok: false, message: r.error.message });
        if (r.data !== true) return res.status(401).json({ ok: false, message: "Sync code not recognized. Copy it again from Ascend." });
        return res.status(200).json({ ok: true, message: `Synced ${steps.toLocaleString("en-US")} steps for ${day}` });
      }
      return res.status(500).json({ ok: false, message: error.message });
    }
    if (!data?.ok) return res.status(data?.error?.startsWith("Sync code") ? 401 : 400).json({ ok: false, message: data?.error || note || "Couldn't save steps" });
    const msg = data.zero
      ? `Got 0 steps for ${day}. If your phone was locked, iOS hides Health data. Use the "app is opened" trigger instead.`
      : `Synced ${Number(data.steps).toLocaleString("en-US")} steps for ${day}${note ? ` (${note})` : ""}`;
    return res.status(200).json({ ok: true, message: msg, steps: data.steps, date: day });
  } catch (e) {
    return res.status(500).json({ ok: false, message: String(e?.message || e) });
  }
}
