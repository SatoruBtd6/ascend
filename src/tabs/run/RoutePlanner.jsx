import { useState } from "react";
import { MapPin, Loader2, Bot } from "lucide-react";
import { C } from "../../theme.js";
import { uid } from "../../lib/dates.js";
import { MI_M } from "../../run.js";
import { askJson, STERLING_SYS } from "../train/sterling.js";
import { RouteMap, encodePoly } from "./maps.jsx";
export function RoutePlanner({ s, setS, onRun }) {
  const [miles, setMiles] = useState(3);
  const [pref, setPref] = useState("");
  const [state, setState] = useState({ status: "idle", routes: [], pick: 0, notes: [], quip: "" });
  const [naming, setNaming] = useState("");
  const plan = async () => {
    setState({ status: "locating", routes: [], pick: 0, notes: [], quip: "" });
    let pos;
    try {
      pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }));
    } catch (e) {
      setState({ status: "error", routes: [], pick: 0, notes: [], quip: "", err: e?.code === 1 ? "Location is blocked. Allow it for Safari in Settings → Privacy → Location Services." : "Couldn't get your location. Try again outside." });
      return;
    }
    setState((x) => ({ ...x, status: "routing" }));
    try {
      const token = await window.ascendAuth.token();
      const r = await fetch("/api/route", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, miles, pref }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Route service error");
      const routes = j.routes;
      let pick = 0, notes = routes.map((rt) => `${(rt.meters / MI_M).toFixed(1)} mi · ${Math.round(rt.ascent * 3.281)} ft climb${rt.streets.length ? ` · ${rt.streets.slice(0, 2).join(", ")}` : ""}`), quip = "";
      if (/flat|easy|no hill/i.test(pref)) pick = routes.reduce((bi, rt, i, arr) => (rt.ascent < arr[bi].ascent ? i : bi), 0);
      try {
        const ai = await askJson(STERLING_SYS, `A runner wants a ${miles}-mile loop${pref ? ` with this preference: "${pref}"` : ""}. Candidate routes: ${routes.map((rt, i) => `#${i}: ${(rt.meters / MI_M).toFixed(2)} mi, ${Math.round(rt.ascent * 3.281)} ft of climbing, main streets/paths: ${rt.streets.join(", ") || "unknown"}`).join(" | ")}. Pick the best one for their preference and write a short description for each (under 16 words, mention the terrain and notable streets or paths; don't invent landmarks that aren't in the street names). Respond ONLY with JSON: {"pick": index, "quip": "one short Sterling line", "notes": ["...", "...", "..."]}`, 500);
        if (Number.isInteger(ai.pick) && routes[ai.pick]) pick = ai.pick;
        if (Array.isArray(ai.notes)) notes = routes.map((rt, i) => (ai.notes[i] ? `${(rt.meters / MI_M).toFixed(1)} mi · ${ai.notes[i]}` : notes[i]));
        quip = ai.quip || "";
      } catch (e) { /* stats-only notes */ }
      setState({ status: "done", routes, pick, notes, quip });
    } catch (e) { setState({ status: "error", routes: [], pick: 0, notes: [], quip: "", err: String(e.message || e) }); }
  };
  const cur = state.routes[state.pick];
  const saveRoute = () => {
    if (!cur) return;
    const name = naming.trim() || `${(cur.meters / MI_M).toFixed(1)} mi loop`;
    setS((p) => ({ ...p, savedRoutes: [{ id: uid(), name, miles: Math.round((cur.meters / MI_M) * 100) / 100, ascentFt: Math.round(cur.ascent * 3.281), poly: encodePoly(cur.coords), streets: cur.streets.slice(0, 3), t: Date.now() }, ...(p.savedRoutes || [])].slice(0, 30) }));
    setNaming(""); setState((x) => ({ ...x, saved: true }));
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="font-semibold flex items-center gap-2"><Bot size={18} style={{ color: C.cyan }} />Sterling, find me a route</div>
      <div className="flex gap-2 overflow-x-auto pb-1">{[1, 2, 3, 4, 5, 6.2].map((m) => <button key={m} onClick={() => setMiles(m)} className="px-3 py-1.5 text-sm font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: miles === m ? C.blue : C.glass, color: miles === m ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{m === 6.2 ? "10K" : `${m} mi`}</button>)}</div>
      <input className="inp text-sm" placeholder="Anything special? e.g. flat, through a park, quiet streets" value={pref} onChange={(e) => setPref(e.target.value)} />
      <button onClick={plan} disabled={state.status === "locating" || state.status === "routing"} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2">{state.status === "locating" ? <><Loader2 size={16} className="animate-spin" />Finding you…</> : state.status === "routing" ? <><Loader2 size={16} className="animate-spin" />Plotting loops…</> : <><MapPin size={16} />Plan a loop from here</>}</button>
      {state.status === "error" && <div className="body text-sm" style={{ color: C.red }}>{state.err}</div>}
      {state.status === "done" && cur && (
        <div className="space-y-2">
          {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
          <RouteMap key={state.pick} lines={[{ pts: cur.coords, color: C.cyan, startDot: true }]} height={220} />
          <div className="space-y-1.5">
            {state.routes.map((rt, i) => <button key={rt.seed} onClick={() => setState((x) => ({ ...x, pick: i, saved: false }))} className="w-full text-left p-2.5 body text-sm" style={{ borderRadius: 12, background: i === state.pick ? `${C.cyan}22` : "transparent", border: `1px solid ${i === state.pick ? C.cyan : C.glassLine}`, color: C.text }}><span className="font-semibold">Option {i + 1}{i === state.pick ? " · selected" : ""}</span><br /><span style={{ color: C.dim }}>{state.notes[i]}</span></button>)}
          </div>
          <div className="flex gap-2">
            <input className="inp text-sm" placeholder="Name it to save (optional)" value={naming} onChange={(e) => setNaming(e.target.value)} />
            <button onClick={saveRoute} disabled={state.saved} className="ghost px-3 text-sm font-semibold whitespace-nowrap" style={{ color: state.saved ? C.green : C.cyan }}>{state.saved ? "Saved ✓" : "Save"}</button>
          </div>
          <button onClick={() => onRun({ name: naming.trim() || "Planned loop", poly: encodePoly(cur.coords) })} className="btn w-full py-3">Run this route</button>
        </div>
      )}
    </div>
  );
}
