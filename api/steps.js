// Receives daily step counts from an iPhone Shortcut. The personal sync code is checked inside the database.
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ ok: true, hint: "POST {token, steps, date} here from your Shortcut." });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    let body = req.body || {};
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
    const token = String(body.token || "").trim();
    const steps = Math.round(Number(String(body.steps ?? "").replace(/[^\d.]/g, "")));
    const date = String(body.date || "").trim();
    if (token.length < 20) return res.status(400).json({ error: "Missing or invalid sync code" });
    if (!Number.isFinite(steps) || steps < 0 || steps > 150000) return res.status(400).json({ error: "Steps must be a number" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Date must look like 2026-09-17" });
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc("ingest_steps", { p_token: token, p_date: date, p_steps: steps });
    if (error) return res.status(500).json({ error: error.message });
    if (data !== true) return res.status(401).json({ error: "Sync code not recognized. Copy it again from Ascend." });
    res.status(200).json({ ok: true, steps, date });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
