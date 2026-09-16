import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const say = (status, msg) => res.status(status).json({ error: msg, content: [{ type: "text", text: `[Server problem] ${msg}` }] });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.getUser(token);
    if (!data?.user) return say(401, "Not signed in. Sign out and back in from Settings.");
    if (!process.env.ANTHROPIC_API_KEY) return say(500, "ANTHROPIC_API_KEY is missing in Vercel settings.");

    const body = { ...req.body, model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5" };
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    const json = await r.json();
    if (!r.ok) return say(r.status, `Anthropic said: ${json?.error?.message || r.statusText}`);
    res.status(200).json(json);
  } catch (e) {
    say(500, String(e?.message || e));
  }
}
