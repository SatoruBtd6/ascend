import { useEffect, useState } from "react";
import { Check, ChevronRight, Dumbbell, Footprints } from "lucide-react";
import { today } from "../../lib/dates.js";
import { mealTotals, streakOf } from "../../lib/stats.js";
import { targets } from "../../math.js";
import { C } from "../../theme.js";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { GymCheckBtn } from "../board/gymHome.jsx";
export const SLEEP_OPTS = [5, 6, 7, 8, 9];
export const SCALE_COLORS = ["#FF4D6D", "#FF9340", "#FFD447", "#9BE15D", "#3DF08A"];
export const MOOD_OPTS = ["Wrecked", "Meh", "Good", "Fired up"];
export function Dashboard({ s, setS, goTrain, goRun, saveOk, saveAt, storageOk }) {
  const d = today();
  const t = targets(s.profile), tot = mealTotals(s.meals[d]);
  const day = s.days?.[d];
  const qDone = (day?.list || []).filter((q) => q.claimed).length, qAll = Math.max(3, (day?.list || []).length || 3);
  const ci = s.checkins?.[d] || {};
  const [ciEdit, setCiEdit] = useState(false);
  const setCi = (k, v) => {
    setS((p) => {
      const cur = { ...(p.checkins?.[d] || {}), [k]: v };
      delete cur.edit;
      return { ...p, checkins: { ...(p.checkins || {}), [d]: cur } };
    });
    setCiEdit(false);
  };
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 15000); return () => clearInterval(id); }, []);
  const ciDone = ci.sleep && ci.mood && !ciEdit;
  return (
    <div className="panel p-3 space-y-3">
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["Streak", `${streakOf(s)}d`, C.orange], ["Quests", `${qDone}/${qAll}`, C.gold], ["Cal left", Math.max(0, Math.round(t.cal - tot.cal)), C.cyan], ["Protein left", `${Math.max(0, Math.round(t.protein - tot.p))}g`, C.green]].map(([l, v, c]) => (
          <div key={l}><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      <button onClick={goRun} className="w-full flex items-center gap-3 px-1" aria-label="Open run and steps">
        <Footprints size={16} style={{ color: C.green }} />
        <div className="flex-1"><div className="h-1.5 overflow-hidden" style={{ borderRadius: 999, background: C.glassLine }}><div style={{ height: "100%", width: `${Math.min(100, ((s.steps?.[d] || 0) / (s.settings?.stepGoal || 10000)) * 100)}%`, background: C.green, borderRadius: 999 }} /></div></div>
        <span className="body text-xs tabular-nums" style={{ color: C.dim }}>{(s.steps?.[d] || 0).toLocaleString()} steps</span>
        <ChevronRight size={14} style={{ color: C.mute }} />
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={goTrain} className="btn py-2.5 text-sm flex items-center justify-center gap-2"><Dumbbell size={16} />{s.active ? "Resume workout" : "Start training"}</button>
        <GymCheckBtn s={s} setS={setS} />
      </div>
      {(() => {
        const blocked = storageOk === false;
        const bad = blocked || saveOk === false;
        const age = saveAt ? Math.round((Date.now() - saveAt) / 1000) : null;
        const when = age == null ? "" : age < 12 ? "just now" : age < 60 ? `${age}s ago` : age < 3600 ? `${Math.max(1, Math.round(age / 60))}m ago` : "a while ago";
        const text = blocked ? "Progress can't save on this device. Check your connection or sign back in." : bad ? "Last save didn't go through. Gyms eat signal — keep logging, we'll retry." : saveAt ? `You're good. Last saved ${when}.` : "You're good. Saves are landing.";
        return (
          <div className="flex items-center gap-2 body text-xs px-1" style={{ color: bad ? C.orange : C.green }}>
            <SaveMark />
            <span>{text}</span>
          </div>
        );
      })()}
      {ciDone ? (
        <button onClick={() => setCiEdit(true)} className="w-full flex items-center justify-between body text-xs px-1">
          <span style={{ color: C.dim }}>Checked in · +15 pts <Check size={12} className="inline" style={{ color: C.green }} /></span>
          <span><span style={{ color: SCALE_COLORS[SLEEP_OPTS.indexOf(ci.sleep)] }}>{ci.sleep}{ci.sleep === 9 ? "+" : ""}h sleep</span> · <span style={{ color: SCALE_COLORS[[0, 1, 3, 4][MOOD_OPTS.indexOf(ci.mood)]] }}>{ci.mood}</span></span>
        </button>
      ) : (
        <>
          <div className="flex items-center gap-1.5 flex-wrap body text-xs">
            <span className="w-10" style={{ color: C.dim }}>Sleep</span>
            {SLEEP_OPTS.map((h, i) => { const col = SCALE_COLORS[i], on = ci.sleep === h; return <button key={h} onClick={() => setCi("sleep", h)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.sleep && !on ? 0.45 : 1 }}>{h}{h === 9 ? "+" : ""}h</button>; })}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap body text-xs">
            <span className="w-10" style={{ color: C.dim }}>Mood</span>
            {MOOD_OPTS.map((m, i) => { const col = SCALE_COLORS[[0, 1, 3, 4][i]], on = ci.mood === m; return <button key={m} onClick={() => setCi("mood", m)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.mood && !on ? 0.45 : 1 }}>{m}</button>; })}
          </div>
        </>
      )}
    </div>
  );
}


/* ---------- Fuel extras ---------- */
