import { useState } from "react";
import { ChevronLeft, Youtube } from "lucide-react";
import { C } from "../../theme.js";
import { isGymSpecific, workoutGym, isLegacyAssisted } from "../../math.js";
import { findEx } from "../../lib/exercises.js";
import { rankedLifts, bestValue } from "../../lib/stats.js";
import { fmtDay } from "../../lib/dates.js";
import { RankBadge } from "./RankBadge.jsx";
import { LineChart } from "./LineChart.jsx";
import { FormCheck } from "./FormCheck.jsx";
import { namesMatch, gymLabel, setLabel, suggestNext, withSilentRankSnap } from "./helpers.js";
import { applyPrXpRecount } from "./xpRecount.js";
import { XpSync } from "./xpSync.js";
import { ytUrl } from "./yt.js";
export function ExercisePage({ s, setS, name, onBack, openMuscle }) {
  const def = findEx(s, name);
  const p = s.profile;
  const bw = Math.max(80, +p.weight || 170);
  const gymSpecific = isGymSpecific(s, def);
  const [allGyms, setAllGyms] = useState(false);
  const sessions = [];
  s.workouts.forEach((w) => {
    const ex = (w.exercises || []).find((e) => namesMatch(e.name, name));
    if (!ex) return;
    const sets = (ex.sets || []).filter((st) => +st.r > 0);
    if (!sets.length) return;
    const best = def.type === "timed" ? Math.max(...sets.map((st) => +st.r)) : Math.max(...sets.map((st) => bestValue(def, st, p, ex)));
    const vol = sets.reduce((a, st) => a + (+st.w || 0) * (+st.r || 0), 0);
    sessions.push({ d: w.date, best, vol, sets, id: w.id, title: w.title, gym: workoutGym(w), legacy: isLegacyAssisted(w, def) });
  });
  const chartSessions = sessions.filter((x) => !x.legacy && (!gymSpecific || allGyms || x.gym === (s.currentGym ?? null)));
  const byDay = {};
  chartSessions.forEach((x) => { const cur = byDay[x.d]; byDay[x.d] = cur ? { ...cur, best: Math.max(cur.best, x.best), vol: cur.vol + x.vol } : x; });
  const pts = Object.values(byDay).sort((a, b) => (a.d < b.d ? -1 : 1));
  const r = rankedLifts(s).find((x) => namesMatch(x.e.name, name));
  const sug = suggestNext(s, name);
  const unit = def.type === "bodyweight" ? "reps" : def.type === "timed" ? "min" : "lb";
  const curGymName = gymLabel(s, s.currentGym) || "untagged";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div className="flex-1 min-w-0"><h1 className="text-2xl font-bold glowtext truncate">{name}</h1><button onClick={() => openMuscle(def.group)} className="body text-xs underline" style={{ color: C.dim }}>{def.group}{def.perHand ? " · per hand" : ""} · muscle page</button></div>
        {r && <RankBadge rank={r.rank} size={44} />}
      </div>
      <div className="panel p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">Gym-specific history</div>
          <div className="body text-xs" style={{ color: C.dim }}>{gymSpecific ? "Bests, Previous, ranks, and charts use the current gym. Free weights stay shared unless you override." : "Shared across gyms. Turn on if this machine or cable stack differs by gym."}</div>
        </div>
        <button role="switch" aria-checked={gymSpecific} aria-label="Gym-specific history" onClick={() => setS((p) => {
          const next = { ...p, gymSpecific: { ...(p.gymSpecific || {}), [name]: !isGymSpecific(p, def) } };
          const r = applyPrXpRecount(next, { names: [name], banner: false });
          try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
          return withSilentRankSnap(r.s);
        })} className="relative shrink-0" style={{ width: 50, height: 28, borderRadius: 999, background: gymSpecific ? C.cyan : C.track, border: `1px solid ${C.border}` }}>
          <span className="absolute top-0.5" style={{ left: gymSpecific ? 24 : 2, width: 22, height: 22, borderRadius: 999, background: "#fff" }} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["Rank", r ? r.label : "–"], [def.type === "bodyweight" ? "Best reps" : def.type === "timed" ? "Longest" : "Est. max", r ? `${Math.round(r.best)} ${unit}` : pts.length ? `${Math.round(pts[pts.length - 1].best)} ${unit}` : "–"], ["× bodyweight", r && def.type === "weighted" ? `${(r.best / bw).toFixed(2)}×` : "–"], ["Sessions", gymSpecific && !allGyms ? chartSessions.length : sessions.length], ["Next rank", r?.next ? `${r.next} ${unit}` : r ? "maxed" : "–"], ["Next time", sug ? `${sug.w}×${sug.r}` : "–"]].map(([l, v]) => (
          <div key={l} className="panel py-3 px-2 text-center"><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold glowtext">{v}</div></div>
        ))}
      </div>
      {sug && <div className="body text-xs" style={{ color: C.dim }}>Suggested next session: {sug.w}×{sug.r} ({sug.why}).</div>}
      {gymSpecific && (
        <div className="flex items-center justify-between body text-xs" style={{ color: C.dim }}>
          <span>Chart: {allGyms ? "all gyms" : curGymName}</span>
          <button type="button" onClick={() => setAllGyms((v) => !v)} className="underline" style={{ color: C.cyan }}>{allGyms ? "Show current gym" : "Show all gyms"}</button>
        </div>
      )}
      <div className="panel p-3"><div className="font-bold text-sm mb-1">{def.type === "timed" ? "Minutes per session" : def.type === "bodyweight" ? "Best set (reps)" : "Estimated max"}</div><LineChart pts={pts.map((x) => ({ d: x.d, v: x.best }))} color={C.cyan} unit={unit} /></div>
      {def.type === "weighted" && <div className="panel p-3"><div className="font-bold text-sm mb-1">Volume per session</div><LineChart pts={pts.map((x) => ({ d: x.d, v: x.vol }))} color={C.green} unit="lb" fmt={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : Math.round(v))} /></div>}
      <FormCheck exercise={name} />
      <a href={ytUrl(name)} target="_blank" rel="noreferrer" className="ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Youtube size={16} />How-to videos</a>
      <h2 className="text-lg font-bold">History</h2>
      {[...sessions].reverse().slice(0, 15).map((x) => (
        <div key={x.id} className="panel p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0"><div className="font-semibold">{fmtDay(x.d)}{x.title ? <span className="body text-xs ml-2" style={{ color: C.dim }}>{x.title}</span> : null}{gymLabel(s, x.gym) ? <span className="body text-xs ml-2" style={{ color: C.mute }}>{gymLabel(s, x.gym)}</span> : null}{x.legacy ? <span className="body text-xs ml-2" style={{ color: C.mute }}>legacy</span> : null}</div><div className="body text-xs truncate" style={{ color: C.sub }}>{x.sets.map((st) => setLabel(def, st)).join(", ")}</div></div>
          <div className="text-right"><div className="font-bold">{Math.round(x.best)}</div><div className="body text-xs" style={{ color: C.mute }}>{unit}</div></div>
        </div>
      ))}
    </div>
  );
}
