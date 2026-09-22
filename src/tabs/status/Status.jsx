import { useState } from "react";
import { Flame, Settings as Gear, User, Zap } from "lucide-react";
import { GROUP_WEIGHT, RANKS, RANK_INFO } from "../../data/ranks.js";
import { overallInfo, rankFromScore, rankedLifts, streakOf } from "../../lib/stats.js";
import { levelFromXp } from "../../math.js";
import { C } from "../../theme.js";
import { Bar, Empty } from "../../ui/primitives.jsx";
import { BossRecapBanner } from "../board/BossFight.jsx";
import { NemesisAlert, RoastCard } from "../board/Duels.jsx";
import { GymSpotBanner } from "../board/Gym.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { CrateTeaser } from "../profile/CrateVault.jsx";
import { MogInbox } from "../profile/Mog.jsx";
import { Physique } from "../profile/Physique.jsx";
import { crateAuraBest, pointsOf, pointsParts } from "../profile/points.js";
import { StepsPanel } from "../run/StepsPanel.jsx";
import { RankBadge } from "../train/RankBadge.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { NextGoal } from "./NextGoal.jsx";
import { Nudges } from "./Nudges.jsx";
import { Profile } from "./Profile.jsx";
import { StreakRisk } from "./StreakRisk.jsx";
import { WeeklyReport } from "./WeeklyReport.jsx";
export function Status({ s, setS, gainXp, openAssistant, openSettings, openProfile, openMuscle, openExercise, goTrain, goRun, goQuests, openXp, openRival, saveOk, saveAt, storageOk, allowWipe }) {
  const { lvl, into, need } = levelFromXp(s.xp);
  const ranked = rankedLifts(s);
  const points = pointsOf(s);
  const overall = overallInfo(s);
  const streak = streakOf(s);
  const g = overall.groups;
  const stat = (...ks) => Math.min(100, Math.round((ks.reduce((a, k) => a + (g[k] || 0), 0) / ks.length) * (100 / 6)));
  const [editName, setEditName] = useState(!s.profile.name);
  const oc = overall.rank;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {editName ? (
          <input autoFocus className="inp text-lg font-bold" style={{ maxWidth: 220 }} placeholder="Your name" defaultValue={s.profile.name}
            onBlur={(e) => { setS((p) => ({ ...p, profile: { ...p.profile, name: e.target.value.trim() } })); setEditName(false); }} />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <button aria-label="Open your profile" onClick={openProfile}><Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={oc.color} look={s.profile.look} /></button>
            <button onClick={() => setEditName(true)} className="text-2xl font-bold tracking-wide truncate">{s.profile.name ? <FancyName name={s.profile.name} look={s.profile.look} className="glowtext" /> : "Set your name"}</button>
          </div>
        )}
        <div className="flex items-center gap-1 font-semibold" style={{ color: C.orange, textShadow: "0 0 10px rgba(255,147,64,.6)" }}><Flame size={20} />{streak}
          <button aria-label="XP history" onClick={() => openXp?.()} className="ml-3 p-1.5 ghost" style={{ color: C.gold, textShadow: "none" }}><Zap size={18} /></button>
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
      <div className="panel p-5 overflow-hidden">
        <div className="absolute -right-4 -top-10 font-extrabold select-none" style={{ fontSize: 170, color: oc.color, opacity: 0.07, lineHeight: 1 }}>{oc.id}</div>
        <div className="flex items-center gap-4 relative">
          <div className="flex-1 min-w-0">
            <div className="breathe inline-block" style={{ "--g": oc.glow }}><RankBadge rank={oc} size={60} /></div>
            <div className="text-sm body mt-2" style={{ color: C.dim }}>Overall rank · {RANK_INFO[oc.id][0]}</div>
            <div className="ranklabel text-4xl" style={{ color: oc.color }}>{overall.label}</div>
          </div>
          <Physique tier={overall.score} height={150} aura={s.profile.look?.aura} sex={s.profile.sex} />
        </div>
        <div className="mt-3 relative"><Bar pct={overall.divPct} color={oc.color} /></div>
        <button onClick={openProfile} className="btn mt-4 w-full py-2.5 text-sm flex items-center justify-center gap-2 relative"><User size={16} />Profile · achievements · weight chart</button>
        <div className="body text-xs mt-1 relative" style={{ color: C.mute }}>Overall counts every muscle group. Groups you haven't trained count as zero.</div>

        <div className="neonline my-4" />
        <div className="flex justify-between items-baseline relative">
          <span className="text-xl font-bold">Level {lvl}</span>
          <span className="text-sm body" style={{ color: C.dim }}>{into} / {need} XP</span>
        </div>
        <div className="mt-2"><Bar pct={(into / need) * 100} color={C.cyan} /></div>
        <div className="mt-4 flex justify-between items-baseline relative">
          <button onClick={() => openXp()} className="body text-sm underline" style={{ color: C.cyan }}>XP history</button>
          <span className="body text-sm" style={{ color: C.dim }}>Leaderboard points</span>
          <span className="text-xl font-bold" style={{ color: C.gold, textShadow: "0 0 12px rgba(255,212,71,.5)" }}>{points.toLocaleString()}</span>
        </div>
        {(() => {
          const pp = pointsParts(s);
          const aura = crateAuraBest(s);
          const bits = [];
          if (pp.fromHustle) bits.push("quests & daily XP count");
          if (pp.fromStreak) bits.push(`streak +${pp.fromStreak.toLocaleString()}`);
          if (pp.fromCheckins) bits.push(`check-ins +${pp.fromCheckins.toLocaleString()}`);
          if (aura) bits.push(`${aura.name} +${Math.round(aura.ptsMult * 100)}%`);
          if (pp.spent) bits.push(`${pp.spent.toLocaleString()} spent on crates`);
          return bits.length ? <div className="body text-xs mt-1 text-right" style={{ color: C.mute }}>{bits.join(" · ")}</div> : null;
        })()}
        <CrateTeaser s={s} onOpen={openProfile} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[["STR", stat("Legs", "Back")], ["PWR", stat("Chest", "Shoulders")], ["ARM", stat("Arms")], ["CORE", stat("Core")]].map(([k, v]) => (
          <div key={k} className="panel py-3 text-center">
            <div className="text-xs" style={{ color: C.dim }}>{k}</div>
            <div className="text-2xl font-bold glowtext">{v}</div>
          </div>
        ))}
      </div>

      <BossRecapBanner s={s} setS={setS} />
      <StreakRisk s={s} setS={setS} goTrain={goTrain} />
      <NextGoal s={s} openExercise={openExercise} goQuests={goQuests} />
      <GymSpotBanner s={s} setS={setS} />
      <Dashboard s={s} setS={setS} goTrain={goTrain} goRun={goRun} saveOk={saveOk} saveAt={saveAt} storageOk={storageOk} />
      <StepsPanel s={s} setS={setS} gainXp={gainXp} openRun={goRun} openAssistant={openAssistant} />
      <RoastCard s={s} setS={setS} />
      <NemesisAlert s={s} setS={setS} openProfile={openProfile} />
      <Nudges s={s} openExercise={openExercise} goTrain={goTrain} />
      <WeeklyReport s={s} />
      <MogInbox s={s} openProfile={openProfile} />

      <h2 className="text-lg font-bold glowtext">Muscle groups <span className="body text-sm font-normal" style={{ color: C.dim }}>tap one</span></h2>
      <div className="grid grid-cols-3 gap-2">
        {Object.keys(GROUP_WEIGHT).map((gk) => { const sc = g[gk] || 0; const rr = rankFromScore(sc); return (
          <button key={gk} onClick={() => openMuscle(gk)} className="panel p-2 flex flex-col items-center gap-1">
            <RankBadge rank={sc ? rr.rank : RANKS[0]} size={40} still={!sc} />
            <div className="text-xs font-bold">{gk}</div>
            <div className="ranklabel text-xs" style={{ color: sc ? rr.rank.color : C.mute }}>{sc ? rr.label : "–"}</div>
          </button>
        ); })}
      </div>

      <h2 className="text-lg font-bold glowtext">Lift ranks</h2>
      {ranked.length === 0 ? (
        <Empty>Log a workout in Train to get ranked on each lift. Check the Ranks tab to see what every rank takes for your height and weight.</Empty>
      ) : (
        <div className="space-y-2">
          {ranked.sort((a, b) => b.score - a.score).map(({ e, best, rank, label, pct, next, nextLabel }) => {
            const unit = e.type === "bodyweight" ? " reps" : " lb";
            return (
              <button key={e.name} onClick={() => openExercise(e.name)} className="panel p-3 flex items-center gap-4 w-full text-left">
                <RankBadge rank={rank} size={34} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold truncate">{e.name}</span>
                    <span className="ranklabel font-bold whitespace-nowrap" style={{ color: rank.color }}>{label}</span>
                  </div>
                  <div className="mt-1.5"><Bar pct={pct} color={rank.color} /></div>
                  <div className="text-xs body mt-1 flex justify-between gap-2" style={{ color: C.mute }}>
                    <span>Best {Math.round(best)}{e.type === "bodyweight" ? " reps" : " lb est. max"}</span>
                    <span>{next ? `${nextLabel} at ${next}${unit}` : "Maxed out"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Profile s={s} setS={setS} allowWipe={allowWipe} />
    </div>
  );
}
