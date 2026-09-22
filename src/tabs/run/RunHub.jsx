import { useState } from "react";
import { ChevronLeft, Trash2, Play, ChevronRight } from "lucide-react";
import { C } from "../../theme.js";
import { runKind, fmtDur, fmtPace } from "../../run.js";
import { fmtDay, monthKey } from "../../lib/dates.js";
import { ask } from "../../lib/ask.js";
import { Empty } from "../../ui/primitives.jsx";
import { RoutePlanner } from "./RoutePlanner.jsx";
import { RunDetail } from "./RunDetail.jsx";
export function RunHub({ s, setS, gainXp, onBack, startRun }) {
  const [mode, setMode] = useState("run");
  const [detail, setDetail] = useState(null);
  const runs = [...s.workouts].reverse().filter((w) => w.run).slice(0, 20);
  const saved = s.savedRoutes || [];
  const monthMi = s.workouts.filter((w) => w.date.startsWith(monthKey())).reduce((a, w) => a + (w.run?.miles || 0), 0);
  const best = runs.reduce((b, w) => (w.run.mode !== "walk" && w.run.miles >= 1 && (!b || w.run.pace < b.run.pace) ? w : b), null);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold flex-1">Run & steps</h1>
      </div>
      <div className="panel p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">{[["run", "Run"], ["walk", "Walk"]].map(([id, l]) => <button key={id} onClick={() => setMode(id)} className="py-2 text-sm font-semibold" style={{ borderRadius: 10, background: mode === id ? C.blue : C.glass, color: mode === id ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{l}</button>)}</div>
        <button onClick={() => startRun(mode, null)} className="w-full py-5 text-xl font-black flex items-center justify-center gap-2" style={{ borderRadius: 18, background: "linear-gradient(180deg,#3DF08A,#12A860)", color: "#021a0c", boxShadow: "0 10px 30px rgba(61,240,138,.25)" }}><Play size={24} />Start {mode === "walk" ? "walk" : "run"}</button>
        <div className="grid grid-cols-3 gap-2 text-center">{[["This month", `${monthMi.toFixed(1)} mi`], ["Runs logged", runs.length], ["Best pace", best ? fmtPace(best.run.pace) : "–"]].map(([l, v]) => <div key={l}><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold tabular-nums">{v}</div></div>)}</div>
        <div className="body text-xs" style={{ color: C.mute }}>Keep Ascend open with the screen on while you run. Phones pause GPS for websites when locked.</div>
      </div>
      <RoutePlanner s={s} setS={setS} onRun={(guide) => startRun(mode, guide)} />
      {saved.length > 0 && (
        <>
          <h2 className="text-lg font-bold">Saved routes</h2>
          <div className="space-y-2">{saved.map((rt) => (
            <div key={rt.id} className="panel p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0"><div className="font-semibold truncate">{rt.name}</div><div className="body text-xs" style={{ color: C.dim }}>{rt.miles} mi{rt.ascentFt != null ? ` · ${rt.ascentFt} ft climb` : ""}{rt.streets?.length ? ` · ${rt.streets.join(", ")}` : ""}</div></div>
              <button onClick={() => startRun(mode, { name: rt.name, poly: rt.poly })} className="btn px-3 py-2 text-sm">Run</button>
              <button aria-label={`Delete ${rt.name}`} onClick={() => ask(`Delete route "${rt.name}"?`, () => setS((p) => ({ ...p, savedRoutes: (p.savedRoutes || []).filter((x) => x.id !== rt.id) })), "Delete")} style={{ color: C.mute }}><Trash2 size={16} /></button>
            </div>
          ))}</div>
        </>
      )}
      <h2 className="text-lg font-bold">Recent runs</h2>
      {runs.length === 0 && <Empty>No runs yet. Tap Start run and your distance, pace, splits, and route map save here.</Empty>}
      <div className="space-y-2">{runs.map((w) => (
        <button key={w.id} onClick={() => setDetail(w)} className="panel p-3 w-full text-left flex items-center gap-3">
          <div className="shrink-0 flex items-center justify-center text-lg" style={{ width: 40, height: 40, borderRadius: 12, background: `${C.green}22` }}>{runKind(w.run) === "runwalk" ? "🏃🚶" : w.run.mode === "walk" ? "🚶" : "🏃"}</div>
          <div className="flex-1 min-w-0"><div className="font-semibold">{w.run.miles} mi{runKind(w.run) === "runwalk" ? " Run/Walk" : ""} <span className="body text-xs font-normal" style={{ color: C.dim }}>· {fmtDay(w.date)}</span></div><div className="body text-xs" style={{ color: C.dim }}>{fmtDur(w.run.secs)} · {fmtPace(w.run.pace)} /mi{w.run.guideName ? ` · ${w.run.guideName}` : ""}</div></div>
          <ChevronRight size={16} style={{ color: C.mute }} />
        </button>
      ))}</div>
      {detail && <RunDetail s={s} setS={setS} w={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
