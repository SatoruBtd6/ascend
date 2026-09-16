// Gives App.jsx the same window.storage it had inside Claude, backed by Supabase,
// and routes its Claude API calls through our own secure /api/claude function.

export function installStorage(supabase, userId) {
  const scope = (shared) => (shared ? "shared" : `user:${userId}`);
  const cache = new Map(); // key -> { value, t } for shared lists, so reading a leaderboard isn't N round trips
  const esc = (t) => t.replace(/[%_\\]/g, (c) => `\\${c}`);

  window.storage = {
    async get(key, shared = false) {
      const ck = `${scope(shared)}|${key}`;
      const c = cache.get(ck);
      if (c && Date.now() - c.t < 4000) return { key, value: c.value, shared };
      const { data, error } = await supabase.from("kv").select("value").eq("scope", scope(shared)).eq("key", key).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Key not found");
      return { key, value: data.value, shared };
    },
    async set(key, value, shared = false) {
      cache.delete(`${scope(shared)}|${key}`);
      const { error } = await supabase.from("kv").upsert({ scope: scope(shared), key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: "scope,key" });
      if (error) throw error;
      return { key, value, shared };
    },
    async delete(key, shared = false) {
      cache.delete(`${scope(shared)}|${key}`);
      const { error } = await supabase.from("kv").delete().eq("scope", scope(shared)).eq("key", key);
      if (error) throw error;
      return { key, deleted: true, shared };
    },
    async list(prefix = "", shared = false) {
      const { data, error } = await supabase.from("kv").select("key,value").eq("scope", scope(shared)).like("key", `${esc(prefix)}%`);
      if (error) throw error;
      const t = Date.now();
      data.forEach((d) => cache.set(`${scope(shared)}|${d.key}`, { value: d.value, t }));
      return { keys: data.map((d) => d.key), prefix, shared };
    },
  };
}

export function installClaudeProxy(supabase) {
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
