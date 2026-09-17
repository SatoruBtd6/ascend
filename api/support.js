// Sends a support message to you through Resend. Only signed-in users can use it.
import { createClient } from "@supabase/supabase-js";

const recent = new Map(); // simple per-instance throttle

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.getUser(token);
    const user = data?.user;
    if (!user) return res.status(401).json({ error: "Sign in required" });
    if (!process.env.RESEND_API_KEY || !process.env.SUPPORT_EMAIL) return res.status(500).json({ error: "Support email isn't set up yet (RESEND_API_KEY / SUPPORT_EMAIL missing in Vercel)." });

    const last = recent.get(user.id) || 0;
    if (Date.now() - last < 60_000) return res.status(429).json({ error: "Please wait a minute before sending another message." });

    const { category = "Other", message = "", name = "", info = {} } = req.body || {};
    const text = String(message).trim().slice(0, 4000);
    if (text.length < 5) return res.status(400).json({ error: "Message is too short." });
    const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const cat = String(category).slice(0, 40);

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.SUPPORT_FROM || "Ascend Support <support@ascendfit.site>",
        to: [process.env.SUPPORT_EMAIL],
        reply_to: user.email,
        subject: `[Ascend ${cat}] ${text.slice(0, 60).replace(/\s+/g, " ")}`,
        html: `<h2>${esc(cat)}</h2><p style="white-space:pre-wrap;font-size:15px">${esc(text)}</p><hr><p style="color:#666;font-size:12px">From: ${esc(name)} &lt;${esc(user.email)}&gt;<br>User ID: ${esc(user.id)}<br>Page: ${esc(info.tab)}<br>Device: ${esc(info.ua)}<br>Sent: ${new Date().toISOString()}</p>`,
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: out?.message || "Email service error" });
    recent.set(user.id, Date.now());
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
