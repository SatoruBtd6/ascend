import { useEffect, useState } from "react";
import { Check, RefreshCw, Sparkles, Swords } from "lucide-react";
import { DAILY_REROLLS, QUEST_EX, questStep } from "../../data/quests.js";
import { today, uid } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { makeQuest, newDay } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { Bar, Title } from "../../ui/primitives.jsx";
import { Challenges } from "./Challenges.jsx";
export function Quests({ s, setS, gainXp }) {
  const d = today();
  const day = s.days?.[d];
  useEffect(() => { if (!day) setS((p) => ({ ...p, days: { ...p.days, [d]: newDay() } })); }, [day, d]);
  if (!day) return null;

  const updDay = (fn) => setS((p) => ({ ...p, days: { ...p.days, [d]: fn(p.days[d]) } }));
  const setProg = (id, v) => updDay((x) => ({ ...x, list: x.list.map((q) => q.id === id ? { ...q, progress: Math.max(0, v) } : q) }));
  const reroll = (id) => updDay((x) => {
    const old = x.list.find((q) => q.id === id);
    const fresh = makeQuest(x.list.map((q) => q.qid), old.tier);
    return { ...x, rerolls: x.rerolls + 1, list: x.list.map((q) => q.id === id ? fresh : q) };
  });
  const claim = (q) => {
    const exName = QUEST_EX[q.qid];
    const extra = Math.max(0, q.progress - (q.fromWorkout || 0));
    let logged = null;
    if (exName && extra > 0) {
      const def = findEx(s, exName);
      const sets = [];
      if (def.type === "timed") sets.push({ w: "", r: extra, done: true });
      else { const size = questStep(q); let left = extra; while (left > 0) { sets.push({ w: "", r: Math.min(size, left), done: true }); left -= size; } }
      logged = { id: uid(), date: d, source: "quest", xp: 0, volume: 0, exercises: [{ name: exName, sets }] };
    }
    setS((p) => ({
      ...p,
      workouts: logged ? [...p.workouts, logged] : p.workouts,
      days: { ...p.days, [d]: { ...p.days[d], list: p.days[d].list.map((y) => y.id === q.id ? { ...y, claimed: true } : y) } },
    }));
    gainXp(q.xp, `Quest: ${q.title}`, `quest_${d}_${q.id}`);
  };

  const tiers = [...new Set(day.list.map((q) => q.tier))];
  const topTier = Math.max(...tiers);
  const tierDone = (t) => day.list.filter((q) => q.tier === t).every((q) => q.claimed);
  const canBonus = tierDone(topTier) && day.bonuses < topTier;
  const canMore = tierDone(topTier) && day.bonuses >= topTier;
  const rerollsLeft = DAILY_REROLLS - day.rerolls;


  return (
    <div className="space-y-4">
      <Title right={<span className="text-sm body flex items-center gap-1" style={{ color: C.dim }}><RefreshCw size={14} />{rerollsLeft} left</span>}>Daily quests</Title>
      <div className="body text-sm" style={{ color: C.dim }}>Don't like a quest? Reroll it (3 per day). Clear a full set to unlock a harder one. Exercise quests link to your workouts both ways.</div>

      {tiers.map((t) => (
        <div key={t} className="space-y-3">
          {t > 1 && <h2 className="text-lg font-bold pt-2" style={{ color: t >= 3 ? C.gold : C.cyan }}>Bonus set {t - 1} · {1 + 0.5 * (t - 1)}× difficulty</h2>}
          {day.list.filter((q) => q.tier === t).map((q) => {
            const done = q.progress >= q.target;
            const step = questStep(q);
            const quick = q.unit === "mi" ? [0.5, 1, 2] : q.unit === "min" ? [1, 5, 10] : q.unit === "cups" ? [1, 2] : q.unit === "steps" ? [500, 1000, 2500] : [5, 10, 25];
            const exName = QUEST_EX[q.qid];
            const label = /^[a-z]/.test(q.title) ? `${q.target.toLocaleString()} ${q.title}` : `${q.title} ${q.target.toLocaleString()} ${q.unit}`;
            return (
              <div key={q.id} className="panel p-4" style={q.claimed ? { borderColor: "rgba(79,209,139,.55)" } : null}>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-bold">{label}</div>
                    <div className="body text-sm" style={{ color: C.dim }}>{q.progress.toLocaleString()} / {q.target.toLocaleString()} {q.unit}</div>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{q.xp} XP</span>
                </div>
                <div className="my-3"><Bar pct={(q.progress / q.target) * 100} color={q.claimed ? C.green : C.blue} /></div>
                {exName && !q.claimed && <div className="body text-xs -mt-1 mb-3" style={{ color: C.mute }}>Linked to {exName}: logging it in Train fills this quest, and claiming logs these {q.unit === "min" ? "minutes" : `reps in sets of ${step}`} to your history.{q.fromWorkout ? ` ${q.fromWorkout} already came from workouts.` : ""}</div>}
                {q.claimed ? (
                  <div className="text-sm font-semibold flex items-center gap-1" style={{ color: C.green }}><Check size={16} />Cleared</div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <button aria-label="Reroll quest" disabled={rerollsLeft <= 0 || q.progress > 0} onClick={() => reroll(q.id)} className="ghost px-2.5 py-1.5" style={{ color: rerollsLeft > 0 && q.progress === 0 ? C.cyan : C.mute }}><RefreshCw size={14} /></button>
                      {quick.map((n) => <button key={n} onClick={() => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} className="ghost px-2.5 py-1.5 text-sm font-bold">+{n.toLocaleString()}</button>)}
                      <QuestAdd unit={q.unit} onAdd={(n) => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} />
                      {q.progress > 0 && <button aria-label="Undo" onClick={() => setProg(q.id, Math.max(0, Math.round((q.progress - quick[0]) * 100) / 100))} className="ghost px-2.5 py-1.5 text-sm" style={{ color: C.mute }}>−{quick[0]}</button>}
                    </div>
                    <button disabled={!done} onClick={() => claim(q)} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: done ? C.gold : C.soft, color: done ? "#0A1630" : C.mute, boxShadow: done ? "0 0 16px rgba(255,212,71,.5)" : "none" }}>{done ? "Claim" : `${Math.round((q.target - q.progress) * 100) / 100} ${q.unit} to go`}</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {canBonus && (
        <button onClick={() => { updDay((x) => ({ ...x, bonuses: x.bonuses + 1 })); gainXp(100 * topTier, "Set cleared", `bonus_${d}_${day.bonuses}`); }} className="w-full py-3 font-bold flex items-center justify-center gap-2" style={{ background: C.gold, color: "#0A1630", borderRadius: 4, boxShadow: "0 0 22px rgba(255,212,71,.55)" }}>
          <Sparkles size={18} />Claim set bonus +{100 * topTier} XP
        </button>
      )}
      {canMore && (
        <button onClick={() => updDay((x) => { const add = []; while (add.length < 3) add.push(makeQuest([...x.list.filter((q) => q.tier === topTier).map((q) => q.qid), ...add.map((q) => q.qid)], topTier + 1)); return { ...x, list: [...x.list, ...add] }; })} className="btn w-full py-3 flex items-center justify-center gap-2">
          <Swords size={18} />Take on 3 harder quests
        </button>
      )}

      <Challenges s={s} setS={setS} gainXp={gainXp} />
    </div>
  );
}

/* ---------- Fuel ---------- */



/* ---------- Calendar ---------- */
export function QuestAdd({ unit, onAdd }) {
  const [v, setV] = useState("");
  const go = () => { const n = +v; if (n > 0) { onAdd(n); setV(""); } };
  return (
    <div className="flex items-center gap-1">
      <input type="text" inputMode="decimal" className="inp text-sm" style={{ width: 62, padding: "5px 6px" }} placeholder={unit} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} aria-label={`Add ${unit}`} />
      <button onClick={go} disabled={!(+v > 0)} className="btn px-2.5 py-1.5 text-sm">Add</button>
    </div>
  );
}

/* ---------- Physique avatars ---------- */
