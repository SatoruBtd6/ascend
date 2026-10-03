import { useState } from "react";
import { ChevronRight, Dumbbell, Flame, Info, Settings as Gear, Zap } from "lucide-react";
import { GROUP_WEIGHT, RANKS, RANK_INFO } from "../../data/ranks.js";
import { overallInfo, rankFromScore, rankedLifts, streakOf } from "../../lib/stats.js";
import { levelFromXp } from "../../math.js";
import { C } from "../../theme.js";
import { Bar, Disclosure, Empty } from "../../ui/primitives.jsx";
import { BossRecapBanner } from "../board/bossRecap.jsx";
import { NemesisAlert, RoastCard } from "../board/duelHome.jsx";
import { GymSpotBanner } from "../board/gymHome.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { CrateTeaser } from "../profile/crateTeaser.jsx";
import { MogInbox } from "../profile/Mog.jsx";
import { Physique } from "../profile/Physique.jsx";
import { crateAuraBest, pointsOf, pointsParts } from "../profile/points.js";
import { RankBadge } from "../train/RankBadge.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { LiftRow } from "./LiftRow.jsx";
import { NextGoal } from "./NextGoal.jsx";
import { Nudges } from "./Nudges.jsx";
import { Profile } from "./Profile.jsx";
import { StreakRisk } from "./StreakRisk.jsx";
import { WeeklyReport } from "./WeeklyReport.jsx";
export function Status({ s, setS, gainXp, openAssistant, openSettings, openProfile, openMuscle, openExercise, goTrain, goRun, goQuests, openXp, openCredit, saveOk, saveAt, storageOk, allowWipe }) {
  const { lvl, into, need } = levelFromXp(s.xp);
  const ranked = rankedLifts(s);
  const points = pointsOf(s);
  const overall = overallInfo(s);
  const streak = streakOf(s);
  const g = overall.groups;
  const stat = (...ks) => Math.min(100, Math.round((ks.reduce((a, k) => a + (g[k] || 0), 0) / ks.length) * (100 / 6)));
  const oc = overall.rank;
  const [info, setInfo] = useState(false);
  const [ptsOpen, setPtsOpen] = useState(false);
  const [liftsOpen, setLiftsOpen] = useState(false);
  const [groupSel, setGroupSel] = useState(null);
  const sorted = [...ranked].sort((a, b) => b.score - a.score);
  const groupLifts = groupSel ? sorted.filter((x) => x.e.group === groupSel) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button aria-label="Open your profile" onClick={openProfile}><Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={oc.color} look={s.profile.look} /></button>
          <button aria-label="Open your profile" onClick={openProfile} className="text-2xl font-bold tracking-wide truncate">{s.profile.name ? <FancyName name={s.profile.name} look={s.profile.look} className="glowtext" /> : "Set your name"}</button>
        </div>
        <div className="flex items-center gap-1 font-semibold" style={{ color: C.orange, textShadow: "0 0 10px rgba(255,147,64,.6)" }}><Flame size={20} />{streak}
          <button aria-label="XP history" onClick={() => openXp?.()} className="ml-3 p-1.5 ghost" style={{ color: C.gold, textShadow: "none" }}><Zap size={18} /></button>
          <button aria-label="Workout credit" title="Workout credit" onClick={() => openCredit?.()} className="ml-1.5 p-1.5 ghost" style={{ color: C.cyan }}><Dumbbell size={18} /></button>
          <button aria-label="Settings" onClick={openSettings} className="ml-1.5 p-1.5 ghost" style={{ color: C.cyan }}><Gear size={18} /></button></div>
      </div>

      {s.xpRecount && !s.xpRecount.seen && (
        <div className="panel p-4 space-y-2" style={{ borderColor: `${C.gold}66` }}>
          <div className="font-bold flex items-center gap-2"><Zap size={16} style={{ color: C.gold }} />Your XP was recounted</div>
          <div className="body text-sm" style={{ color: C.sub }}>{s.xpRecount.before.toLocaleString()} → <b style={{ color: C.text }}>{s.xpRecount.after.toLocaleString()} XP</b>. PR bonuses now count once per exercise per workout.{s.xpRecount.floor ? ` Your level was kept (+${s.xpRecount.floor.toLocaleString()} XP).` : ""}{s.xpRecount.gravemaw ? ` The Gravemaw crew-boss exploit was also undone (−${s.xpRecount.gravemaw} XP and its loot).` : ""}</div>
          <div className="flex gap-2">
            <button onClick={() => { setS((p) => ({ ...p, xpRecount: { ...p.xpRecount, seen: true } })); openXp?.(); }} className="btn px-4 py-2 text-sm">See XP history</button>
            <button onClick={() => setS((p) => ({ ...p, xpRecount: { ...p.xpRecount, seen: true } }))} className="ghost px-4 py-2 text-sm font-bold">Got it</button>
          </div>
        </div>
      )}

      {s.bwNotice === "7n" && (
        <div className="panel p-4 space-y-2" style={{ borderColor: `${C.cyan}66` }}>
          <div className="font-bold flex items-center gap-2"><Zap size={16} style={{ color: C.cyan }} />Bodyweight exercises were rebalanced</div>
          <div className="body text-sm" style={{ color: C.sub }}>Push-ups, pull-ups, air squats and the other rep-based movements now scale to your size. Each rep is more work on a bigger frame, so heavier athletes need fewer reps for the same tier — and lighter frames need a few more. We re-ranked every bodyweight exercise and rechecked your achievements, so some ranks, badges and XP may have moved. Everything you logged is still there.</div>
          <button onClick={() => setS((p) => ({ ...p, bwNotice: "7n-seen" }))} className="btn px-4 py-2 text-sm">Got it</button>
        </div>
      )}
      <div className="panel p-3 overflow-hidden">
        <div className="absolute -right-4 -top-10 font-extrabold select-none" style={{ fontSize: 170, color: oc.color, opacity: 0.07, lineHeight: 1 }}>{oc.id}</div>
        <div className="flex items-center gap-4 relative">
          <div className="flex-1 min-w-0">
            <div className="breathe inline-block" style={{ "--g": oc.glow }}><RankBadge rank={oc} size={60} /></div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-sm body" style={{ color: C.dim }}>Overall rank · {RANK_INFO[oc.id][0]}</span>
              <button type="button" aria-label="How overall rank works" onClick={() => setInfo((i) => !i)} className="p-0.5" style={{ color: info ? C.cyan : C.mute }}><Info size={13} /></button>
            </div>
            {info && <div className="body text-xs mt-1 relative" style={{ color: C.mute }}>Overall counts every muscle group. Groups you haven't trained count as zero.</div>}
            <div className="ranklabel text-4xl" style={{ color: oc.color }}>{overall.label}</div>
          </div>
          <Physique tier={overall.score} height={116} aura={s.profile.look?.aura} sex={s.profile.sex} />
        </div>
        <div className="mt-2 relative"><Bar pct={overall.divPct} color={oc.color} /></div>
        <button onClick={openProfile} className="mt-2 flex items-center gap-1 relative body font-semibold" style={{ fontSize: 15, color: C.cyan }}>Profile <ChevronRight size={15} /></button>

        <div className="mt-3 flex justify-between items-baseline relative">
          <span className="text-xl font-bold">Level {lvl}</span>
          <span className="text-sm body" style={{ color: C.dim }}>{into} / {need} XP</span>
        </div>
        <div className="mt-2"><Bar pct={(into / need) * 100} color={C.cyan} /></div>
        <div className="mt-2 flex justify-between items-center relative">
          <button onClick={() => openXp()} className="body flex items-center gap-0.5" style={{ fontSize: 15, color: C.cyan }}>XP history <ChevronRight size={14} /></button>
          <button onClick={() => setPtsOpen((v) => !v)} aria-expanded={ptsOpen} className="text-xl font-bold" style={{ color: C.gold, textShadow: "0 0 12px rgba(255,212,71,.5)" }}>{points.toLocaleString()} pts</button>
        </div>
        {ptsOpen && (() => {
          const pp = pointsParts(s);
          const aura = crateAuraBest(s);
          const bits = [];
          if (pp.fromHustle) bits.push("quests & daily XP count");
          if (pp.fromStreak) bits.push(`streak +${pp.fromStreak.toLocaleString()}`);
          if (pp.fromCheckins) bits.push(`check-ins +${pp.fromCheckins.toLocaleString()}`);
          if (aura) bits.push(`${aura.name} +${Math.round(aura.ptsMult * 100)}%`);
          if (pp.spent) bits.push(`${pp.spent.toLocaleString()} spent on spins`);
          return bits.length ? <div className="body text-xs mt-1 text-right relative" style={{ color: C.mute }}>{bits.join(" · ")}</div> : null;
        })()}
        <CrateTeaser s={s} onOpen={openProfile} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["STR", stat("Legs", "Back")], ["PWR", stat("Chest", "Shoulders")], ["ARM", stat("Arms")], ["CORE", stat("Core")]].map(([k, v]) => (
          <div key={k} className="panel py-1.5 text-center">
            <div className="text-xs" style={{ color: C.dim }}>{k}</div>
            <div className="text-2xl font-bold glowtext">{v}</div>
          </div>
        ))}
      </div>

      <BossRecapBanner s={s} setS={setS} />
      <StreakRisk s={s} setS={setS} goTrain={goTrain} />
      <NextGoal s={s} openExercise={openExercise} goQuests={goQuests} />
      <GymSpotBanner s={s} setS={setS} />
      <Dashboard s={s} setS={setS} gainXp={gainXp} goTrain={goTrain} goRun={goRun} openAssistant={openAssistant} saveOk={saveOk} saveAt={saveAt} storageOk={storageOk} />
      <Profile s={s} setS={setS} allowWipe={allowWipe} />
      <RoastCard s={s} setS={setS} />
      <NemesisAlert s={s} setS={setS} openProfile={openProfile} />
      <Nudges s={s} openExercise={openExercise} goTrain={goTrain} />
      <WeeklyReport s={s} />
      <MogInbox s={s} openProfile={openProfile} />

      <h2 className="text-lg font-bold glowtext">Muscle groups</h2>
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(GROUP_WEIGHT).map((gk) => { const sc = g[gk] || 0; const rr = rankFromScore(sc); return (
          <button key={gk} onClick={() => setGroupSel(groupSel === gk ? null : gk)} aria-expanded={groupSel === gk} className="panel p-2 flex flex-col items-center gap-1">
            <RankBadge rank={sc ? rr.rank : RANKS[0]} size={40} still={!sc} />
            <div className="text-xs font-bold">{gk}</div>
            <div className="ranklabel text-xs" style={{ color: sc ? rr.rank.color : C.mute }}>{sc ? rr.label : "–"}</div>
          </button>
        ); })}
      </div>
      <div style={{ display: "grid", gridTemplateRows: groupSel ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
        <div style={{ overflow: "hidden", minHeight: 0, opacity: groupSel ? 1 : 0, transition: "opacity .22s ease-out" }}>
          {groupSel && (
            <div>
              {groupLifts.length === 0 && <div className="body py-3" style={{ fontSize: 15, color: C.mute }}>Nothing logged for {groupSel} yet.</div>}
              {groupLifts.map((x, i) => <LiftRow key={x.e.name} x={x} first={i === 0} onOpen={openExercise} />)}
              <button onClick={() => openMuscle(groupSel)} className="w-full flex items-center justify-between py-3 body font-semibold" style={{ fontSize: 15, color: C.cyan, borderTop: groupLifts.length ? "1px solid rgba(255,255,255,.08)" : "none" }}>{groupSel} details <ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <Empty>Log a workout in Train to get ranked on each lift. Check the Ranks tab to see what every rank takes for your height and weight.</Empty>
      ) : (
        <Disclosure title="All lifts" right={String(sorted.length)} open={liftsOpen} onToggle={() => setLiftsOpen((v) => !v)}>
          <div className="pb-1">
            {sorted.map((x, i) => <LiftRow key={x.e.name} x={x} first={i === 0} onOpen={openExercise} />)}
          </div>
        </Disclosure>
      )}
    </div>
  );
}
