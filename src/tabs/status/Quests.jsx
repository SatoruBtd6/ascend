import { useEffect, useState } from "react";
import { Info, RefreshCw, Sparkles, Swords } from "lucide-react";
import { DAILY_REROLLS, QUEST_EX, questStep } from "../../data/quests.js";
import { today } from "../../lib/dates.js";
import { findEx } from "../../lib/exercises.js";
import { makeQuest, newDay } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { Bar, CHIP, ClaimBtn, Tap, Title } from "../../ui/primitives.jsx";
import { AnchoredMenu } from "../../ui/AnchoredMenu.jsx";
import { Challenges } from "./Challenges.jsx";

const HAIR = "1px solid rgba(255,255,255,.08)";
export function Quests({ s, setS, gainXp }) {
  const d = today();
  const day = s.days?.[d];
  const [openId, setOpenId] = useState(null);
  const [headInfo, setHeadInfo] = useState(null);
  const [qInfo, setQInfo] = useState(null);
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
      logged = { id: `quest_${d}_${q.id}`, date: d, source: "quest", xp: 0, volume: 0, exercises: [{ name: exName, sets }], bw: +s.profile?.weight || null };
    }
    // gate inside the updater: a second tap on the same quest sees claimed=true
    // and can't append a second row (the logged id is deterministic anyway)
    setS((p) => ({
      ...p,
      workouts: logged && !p.days[d].list.find((y) => y.id === q.id)?.claimed ? [...p.workouts, logged] : p.workouts,
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
  const closeMenus = () => { setHeadInfo(null); setQInfo(null); };
  const infoQuest = qInfo ? day.list.find((q) => q.id === qInfo.q) : null;

  return (
    <div className="space-y-4">
      <Title right={<span className="text-sm body flex items-center gap-1" style={{ color: C.dim }}><RefreshCw size={14} />{rerollsLeft} left</span>}>
        Daily quests
        <button type="button" aria-label="About daily quests" aria-haspopup="menu" aria-expanded={!!headInfo} onClick={(e) => { e.stopPropagation(); setQInfo(null); setHeadInfo(headInfo ? null : e.currentTarget); }} className="inline-flex items-center justify-center align-middle" style={{ width: 44, height: 44, margin: "-13px -8px -13px 0", color: C.mute }}><Info size={16} /></button>
      </Title>
      {headInfo && (
        <AnchoredMenu anchor={headInfo} onClose={() => setHeadInfo(null)} minWidth={240}>
          <div className="px-4 py-3 body text-xs space-y-2" style={{ color: C.mute }}>
            <div>Don't like a quest? Reroll it (3 per day). Clear a full set to unlock a harder one. Exercise quests link to your workouts both ways.</div>
            <div>Weekly and monthly progress is tracked automatically from your workouts, quests, fuel goals, and weigh-ins. New ones roll in every week and month.</div>
          </div>
        </AnchoredMenu>
      )}

      {tiers.map((t) => (
        <div key={t}>
          {t > 1 && <h2 className="text-lg font-bold pt-2" style={{ color: t >= 3 ? C.gold : C.cyan }}>Bonus set {t - 1} · {1 + 0.5 * (t - 1)}× difficulty</h2>}
          {day.list.filter((q) => q.tier === t).map((q, qi) => {
            const done = q.progress >= q.target;
            const quick = q.unit === "mi" ? [0.5, 1, 2] : q.unit === "min" ? [1, 5, 10] : q.unit === "cups" ? [1, 2] : q.unit === "steps" ? [500, 1000, 2500] : [5, 10, 25];
            const exName = QUEST_EX[q.qid];
            const label = /^[a-z]/.test(q.title) ? `${q.target.toLocaleString()} ${q.title}` : `${q.title} ${q.target.toLocaleString()} ${q.unit}`;
            const sep = qi ? { borderTop: HAIR } : null;
            if (q.claimed) return (
              <div key={q.id} style={{ padding: "14px 0", ...sep }}>
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{label}</span>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{q.xp} XP</span>
                </div>
                <div className="body" style={{ fontSize: 14, color: C.mute, marginTop: 2 }}>Claimed · +{q.xp} XP</div>
              </div>
            );
            const open = openId === q.id;
            const toggle = () => { closeMenus(); setOpenId(open ? null : q.id); };
            return (
              <div key={q.id} role="button" tabIndex={0} aria-expanded={open}
                onClick={(e) => { if (e.target.closest("button,input,a")) return; toggle(); }}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(); } }}
                style={{ padding: "14px 0", ...sep }}>
                <div className="flex items-center gap-2">
                  <span className="flex-1 min-w-0 truncate" style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{label}</span>
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{q.xp} XP</span>
                  {exName && (
                    <Tap tight label={`How ${label} links to workouts`} menu onClick={(e) => { setHeadInfo(null); setQInfo(qInfo?.q === q.id ? null : { q: q.id, anchor: e.currentTarget }); }}>
                      <Info size={16} style={{ color: C.mute }} />
                    </Tap>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2" style={{ marginTop: 2, minHeight: done ? 32 : 0 }}>
                  <div className="body" style={{ fontSize: 14, color: C.dim }}>{q.progress.toLocaleString()} / {q.target.toLocaleString()} {q.unit}</div>
                  {done && <ClaimBtn onClick={() => claim(q)} />}
                </div>
                <div style={{ marginTop: 6 }}><Bar pct={(q.progress / q.target) * 100} color={C.blue} h={4} /></div>
                <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
                  <div style={{ overflow: "hidden", minHeight: 0, opacity: open ? 1 : 0, transition: "opacity .22s ease-out" }}>
                    <div className="flex gap-1.5 items-center flex-wrap" style={{ paddingTop: 10 }}>
                      <Tap label="Reroll quest" disabled={rerollsLeft <= 0 || q.progress > 0} onClick={() => reroll(q.id)}>
                        <RefreshCw size={14} style={{ color: rerollsLeft > 0 && q.progress === 0 ? C.cyan : C.mute }} />
                      </Tap>
                      {quick.map((n) => (
                        <Tap key={n} label={`Add ${n} ${q.unit}`} onClick={() => setProg(q.id, Math.round((q.progress + n) * 100) / 100)}>
                          <span className="font-semibold inline-flex items-center" style={{ ...CHIP, color: C.cyan }}>+{n.toLocaleString()}</span>
                        </Tap>
                      ))}
                      {q.progress > 0 && (
                        <Tap label={`Subtract ${quick[0]} ${q.unit}`} onClick={() => setProg(q.id, Math.max(0, Math.round((q.progress - quick[0]) * 100) / 100))}>
                          <span className="inline-flex items-center" style={{ ...CHIP, color: C.mute }}>−{quick[0]}</span>
                        </Tap>
                      )}
                      <QuestAdd unit={q.unit} onAdd={(n) => setProg(q.id, Math.round((q.progress + n) * 100) / 100)} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {infoQuest && (() => {
        const exName = QUEST_EX[infoQuest.qid], step = questStep(infoQuest);
        return (
          <AnchoredMenu anchor={qInfo.anchor} onClose={() => setQInfo(null)} minWidth={240}>
            <div className="px-4 py-3 body text-xs" style={{ color: C.mute }}>Linked to {exName}: logging it in Train fills this quest, and claiming logs these {infoQuest.unit === "min" ? "minutes" : `reps in sets of ${step}`} to your history.{infoQuest.fromWorkout ? ` ${infoQuest.fromWorkout} already came from workouts.` : ""}</div>
          </AnchoredMenu>
        );
      })()}

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
      <input type="text" inputMode="decimal" className="inp text-sm" style={{ width: 62, padding: "5px 6px", height: 32 }} placeholder={unit} value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 350)}
        aria-label={`Add ${unit}`} />
      <button type="button" onClick={go} disabled={!(+v > 0)} className="btn text-sm font-bold" style={{ height: 32, padding: "0 14px" }}>Add</button>
    </div>
  );
}

/* ---------- Physique avatars ---------- */
