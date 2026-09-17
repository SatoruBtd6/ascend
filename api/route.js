// Generates round-trip running routes from the user's location using openrouteservice.
import { createClient } from "@supabase/supabase-js";

const MI = 1609.344;
const thin = (coords, maxPts = 400) => {
  if (coords.length <= maxPts) return coords;
  const step = coords.length / maxPts, out = [];
  for (let i = 0; i < coords.length; i += step) out.push(coords[Math.floor(i)]);
  out.push(coords[coords.length - 1]);
  return out;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    const { data } = await supabase.auth.getUser(token);
    if (!data?.user) return res.status(401).json({ error: "Sign in required" });
    if (!process.env.ORS_API_KEY) return res.status(500).json({ error: "Route planning isn't set up yet (ORS_API_KEY missing in Vercel)." });

    const { lat, lng, miles = 3, pref = "" } = req.body || {};
    if (typeof lat !== "number" || typeof lng !== "number") return res.status(400).json({ error: "Location missing" });
    const length = Math.round(Math.min(20, Math.max(0.5, +miles || 3)) * MI);
    const green = /park|trail|green|nature|scenic|tree/i.test(pref), quiet = /quiet|safe|calm|low traffic|residential/i.test(pref);
    const weightings = {};
    if (green) weightings.green = 1;
    if (quiet) weightings.quiet = 1;

    const one = async (seed, points) => {
      const body = {
        coordinates: [[lng, lat]],
        elevation: true,
        instructions: true,
        options: { round_trip: { length, points, seed }, ...(Object.keys(weightings).length ? { profile_params: { weightings } } : {}) },
      };
      const r = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
        method: "POST",
        headers: { Authorization: process.env.ORS_API_KEY, "Content-Type": "application/json", Accept: "application/geo+json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error?.message || j?.error || `Routing error ${r.status}`);
      const f = j.features?.[0];
      if (!f) throw new Error("No route found");
      const coords = f.geometry.coordinates.map(([x, y]) => [Math.round(y * 1e5) / 1e5, Math.round(x * 1e5) / 1e5]);
      const streets = {};
      (f.properties.segments || []).forEach((sg) => (sg.steps || []).forEach((st) => { if (st.name && st.name !== "-") streets[st.name] = (streets[st.name] || 0) + (st.distance || 0); }));
      return {
        seed,
        coords: thin(coords),
        meters: Math.round(f.properties.summary?.distance || 0),
        ascent: Math.round(f.properties.ascent || 0),
        descent: Math.round(f.properties.descent || 0),
        streets: Object.entries(streets).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n),
      };
    };
    const tries = await Promise.allSettled([one(11, 3), one(47, 4), one(93, 5)]);
    const routes = tries.filter((t) => t.status === "fulfilled").map((t) => t.value);
    if (!routes.length) return res.status(502).json({ error: tries[0]?.reason?.message || "Couldn't build a route here. Try a different distance." });
    res.status(200).json({ routes });
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
