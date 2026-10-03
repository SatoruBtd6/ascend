import { useEffect, useState } from "react";
import { ChevronRight, Dumbbell, Footprints } from "lucide-react";
import { today } from "../../lib/dates.js";
import { mealTotals, streakOf } from "../../lib/stats.js";
import { targets } from "../../math.js";
import { C } from "../../theme.js";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { GymCheckBtn } from "../board/gymHome.jsx";
import { StepsBody } from "../run/StepsPanel.jsx";
import { awardStepGoal } from "../run/stepGoal.js";
export const SLEEP_OPTS = [5, 6, 7, 8, 9];
export const SCALE_COLORS = ["#FF4D6D", "#FF9340", "#FFD447", "#9BE15D", "#3DF08A"];
export const MOOD_OPTS = ["Wrecked", "Meh", "Good", "Fired up"];
export function Dashboard({ s, setS, gainXp, goTrain, goRun, openAssistant, saveOk, storageOk }) {
  const d = today();
  const t = targets(s.profile), tot = mealTotals(s.meals[d]);
  const day = s.days?.[d];
  const qDone = (day?.list || []).filter((q) => q.claimed).length, qAll = Math.max(3, (day?.list || []).length || 3);
  const ci = s.checkins?.[d] || {};
  const [ciEdit, setCiEdit] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
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
  // Step-goal XP: the only place this is granted (StepsPanel no longer does
  // it), so it awards exactly once whether the steps section is open or not.
  useEffect(() => { awardStepGoal(s, setS, gainXp); }, [s.steps, s.stepXp, s.settings?.stepGoal]);
  const ciText = ci.sleep && ci.mood ? `Slept ${ci.sleep}${ci.sleep === 9 ? "+" : ""}h · Feeling ${ci.mood}` : ci.sleep ? `Slept ${ci.sleep}${ci.sleep === 9 ? "+" : ""}h` : ci.mood ? `Feeling ${ci.mood}` : "";
  const ciLogged = ci.sleep && ci.mood && !ciEdit;
  return (
    <div className="panel p-3 space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <button onClick={goTrain} className="btn py-2.5 text-sm flex items-center justify-center gap-2"><Dumbbell size={16} />{s.active ? "Resume workout" : "Start training"}</button>
        <GymCheckBtn s={s} setS={setS} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[["Streak", `${streakOf(s)}d`, C.orange], ["Quests", `${qDone}/${qAll}`, C.gold], ["Cal left", Math.max(0, Math.round(t.cal - tot.cal)), C.cyan], ["Protein left", `${Math.max(0, Math.round(t.protein - tot.p))}g`, C.green]].map(([l, v, c]) => (
          <div key={l}><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold" style={{ color: c }}>{v}</div></div>
        ))}
      </div>
      <div>
        <button onClick={() => setStepsOpen((v) => !v)} aria-expanded={stepsOpen} className="w-full flex items-center gap-3 px-1" aria-label="Steps details">
          <Footprints size={16} style={{ color: C.green }} />
          <div className="flex-1"><div className="h-1.5 overflow-hidden" style={{ borderRadius: 999, background: C.glassLine }}><div style={{ height: "100%", width: `${Math.min(100, ((s.steps?.[d] || 0) / (s.settings?.stepGoal || 10000)) * 100)}%`, background: C.green, borderRadius: 999 }} /></div></div>
          <span className="body text-xs tabular-nums" style={{ color: C.dim }}>{(s.steps?.[d] || 0).toLocaleString()} steps</span>
          <ChevronRight size={14} style={{ color: C.mute, transform: stepsOpen ? "rotate(90deg)" : "none", transition: "transform .25s ease-out" }} />
        </button>
        <div style={{ display: "grid", gridTemplateRows: stepsOpen ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
          <div style={{ overflow: "hidden", minHeight: 0, opacity: stepsOpen ? 1 : 0, transition: "opacity .22s ease-out" }}>
            <StepsBody s={s} setS={setS} openRun={goRun} openAssistant={openAssistant} />
          </div>
        </div>
      </div>
      {(() => {
        const blocked = storageOk === false;
        const bad = blocked || saveOk === false;
        if (!bad) return null;
        const text = blocked ? "Progress can't save on this device. Check your connection or sign back in." : "Last save didn't go through. Gyms eat signal — keep logging, we'll retry.";
        return (
          <div className="flex items-center gap-2 body text-xs px-1" style={{ color: C.orange }}>
            <SaveMark />
            <span>{text}</span>
          </div>
        );
      })()}
      {ciLogged ? (
        <button onClick={() => setCiEdit(true)} className="w-full flex items-center justify-between px-1">
          <span className="body" style={{ fontSize: 15, color: C.dim }}>{ciText}</span>
          <span className="body text-xs flex items-center gap-0.5" style={{ color: C.mute }}>Change <ChevronRight size={13} /></span>
        </button>
      ) : (
        <>
          {(ci.sleep && !ciEdit) ? (
            <button onClick={() => setCiEdit(true)} className="body px-1 text-left" style={{ fontSize: 15, color: C.dim }}>Slept {ci.sleep}{ci.sleep === 9 ? "+" : ""}h</button>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap body text-xs">
              <span className="w-10" style={{ color: C.dim }}>Sleep</span>
              {SLEEP_OPTS.map((h, i) => { const col = SCALE_COLORS[i], on = ci.sleep === h; return <button key={h} onClick={() => setCi("sleep", h)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.sleep && !on ? 0.45 : 1 }}>{h}{h === 9 ? "+" : ""}h</button>; })}
            </div>
          )}
          {(ci.mood && !ciEdit) ? (
            <button onClick={() => setCiEdit(true)} className="body px-1 text-left" style={{ fontSize: 15, color: C.dim }}>Feeling {ci.mood}</button>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap body text-xs">
              <span className="w-10" style={{ color: C.dim }}>Mood</span>
              {MOOD_OPTS.map((m, i) => { const col = SCALE_COLORS[[0, 1, 3, 4][i]], on = ci.mood === m; return <button key={m} onClick={() => setCi("mood", m)} className="px-2.5 py-1 font-bold" style={{ borderRadius: 999, background: on ? col : "transparent", color: on ? "#06101A" : col, border: `1px solid ${col}`, opacity: ci.mood && !on ? 0.45 : 1 }}>{m}</button>; })}
            </div>
          )}
        </>
      )}
    </div>
  );
}


/* ---------- Fuel extras ---------- */
