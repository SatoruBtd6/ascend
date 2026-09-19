import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const say = (status, msg) => res.status(status).json({ error: msg, content: [{ type: "text", text: `[Server problem] ${msg}` }] });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.getUser(token);
    if (!data?.user) return say(401, "Not signed in. Sign out and back in from Settings.");
    const key = (process.env.ANTHROPIC_API_KEY || "").trim();
    if (!key) return say(500, "ANTHROPIC_API_KEY is missing in Vercel settings.");

    const headers = { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" };
    const ws = (process.env.ANTHROPIC_WORKSPACE_ID || "").trim();
    if (ws) headers["anthropic-workspace-id"] = ws;

    const incoming = req.body && typeof req.body === "object" ? req.body : {};
    const model = (process.env.ANTHROPIC_MODEL || "claude-haiku-4-5").trim();
    const tools = Array.isArray(incoming.tools)
      ? incoming.tools.filter((t) => t && !String(t.type || t.name || "").includes("web_search"))
      : null;
    const system = typeof incoming.system === "string" && incoming.system.length > 120
      ? [{ type: "text", text: incoming.system, cache_control: { type: "ephemeral" } }]
      : incoming.system;
    const body = {
      ...incoming,
      model,
      system,
      max_tokens: Math.min(Math.max(parseInt(incoming.max_tokens, 10) || 400, 32), 1024),
      stream: false,
    };
    if (tools && tools.length) body.tools = tools;
    else delete body.tools;

    let r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });
    let json = await r.json();
    if (!r.ok && /model|not_found|invalid/i.test(String(json?.error?.message || "")) && body.model !== "claude-3-5-haiku-latest") {
      body.model = "claude-3-5-haiku-latest";
      r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers, body: JSON.stringify(body) });
      json = await r.json();
    }
    if (!r.ok) return say(r.status, `Anthropic said: ${json?.error?.message || r.statusText} (key ends ...${key.slice(-4)}, workspace ${ws ? "set" : "not set"})`);
    res.status(200).json(json);
  } catch (e) {
    say(500, String(e?.message || e));
  }
}
