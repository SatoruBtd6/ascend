import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { C } from "../../theme.js";
import { GROUP_WEIGHT } from "../../data/ranks.js";
import { allExercises } from "../../lib/exercises.js";
import { rankedLifts, groupScores } from "../../lib/stats.js";
import { sexLine, uid } from "../../lib/dates.js";
import { askJson, STERLING_SYS, exerciseNameList } from "./sterling.js";
export function PlanGenerator({ s, setS }) {
  const [state, setState] = useState({ status: "idle", days: [] });
  const build = async () => {
    setState({ status: "loading", days: [] });
    try {
      const names = exerciseNameList(s, 80);
      const ranks = rankedLifts(s).slice(0, 12).map((r) => `${r.e.name} ${r.label}`).join(", ");
      const titles = [...new Set(s.workouts.map((w) => w.title).filter(Boolean))].join(", ");
      const g = groupScores(s);
      const weak = Object.keys(GROUP_WEIGHT).sort((a, b) => (g[a] || 0) - (g[b] || 0)).slice(0, 2).join(" and ");
      const r = await askJson(STERLING_SYS, `Write a 4-day training week for this lifter. Ranks: ${ranks || "none yet"}. Weakest groups: ${weak}. Titles they usually use: ${titles || "none"}. Bodyweight ${s.profile.weight} lb. ${sexLine(s.profile)} Use exercise names ONLY from this list, spelled exactly: ${names}. 5 to 7 exercises per day, 3 to 4 sets each, sensible splits. Respond ONLY with JSON: {"quip": "one funny line", "days": [{"name": "short day title", "exercises": [{"name": "exact name", "sets": n}]}]}`, 700);
      const valid = new Set(allExercises(s).map((e) => e.name));
      const days = (r.days || []).map((d) => ({ name: String(d.name || "Day").slice(0, 24), exercises: (d.exercises || []).filter((e) => valid.has(e.name)).map((e) => ({ name: e.name, sets: Math.max(1, Math.min(6, +e.sets || 3)) })) })).filter((d) => d.exercises.length);
      if (!days.length) throw new Error("empty");
      setState({ status: "done", days, quip: r.quip });
    } catch (e) { setState({ status: "error", days: [] }); }
  };
  const save = () => { setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => !state.days.some((d) => d.name === x.name)), ...state.days.map((d) => ({ id: uid(), name: d.name, exercises: d.exercises }))] })); setState({ status: "saved", days: [] }); };
  return (
    <div className="space-y-2">
      {state.status === "idle" && <button onClick={build} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Bot size={16} />Sterling, build my week</button>}
      {state.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Drafting a week that respects your weaknesses…</div>}
      {state.status === "error" && <button onClick={build} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
      {state.status === "saved" && <div className="body text-sm" style={{ color: C.green }}>Saved as presets. Load one to start.</div>}
      {state.status === "done" && (
        <div className="panel p-3 space-y-2">
          {state.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{state.quip}"</div>}
          {state.days.map((d, i) => <div key={i} className="body text-sm"><span className="font-bold" style={{ color: C.cyan }}>{d.name}:</span> <span style={{ color: C.sub }}>{d.exercises.map((e) => `${e.name} ×${e.sets}`).join(", ")}</span></div>)}
          <div className="grid grid-cols-2 gap-2"><button onClick={build} className="ghost py-2 text-sm">Redo</button><button onClick={save} className="btn py-2 text-sm">Save all as presets</button></div>
        </div>
      )}
    </div>
  );
}
