import { useState } from "react";
import { GROUPS, GROUP_WEIGHT, RANKS, RANK_INFO } from "../../data/ranks.js";
import { sexLabel } from "../../lib/dates.js";
import { allExercises } from "../../lib/exercises.js";
import { computeBests, overallInfo, rankFor, rankFromScore } from "../../lib/stats.js";
import { thresholds } from "../../math.js";
import { C } from "../../theme.js";
import { Bar } from "../../ui/primitives.jsx";
import { RankBadge } from "../train/RankBadge.jsx";
export function RankGuideRow({ e, p, bests }) {
  const steps = thresholds(e, p);
  const cur = bests[e.name] ? rankFor(e, bests[e.name], p) : null;
  return (
    <div className="grid items-center gap-1 py-2 text-sm" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)", borderTop: `1px solid rgba(0,217,255,.10)` }}>
      <div className="min-w-0">
        <div className="font-semibold truncate">{e.name}{e.perHand ? <span className="body text-xs font-normal" style={{ color: C.mute }}> /hand</span> : null}</div>
        <div className="body text-xs" style={{ color: cur ? cur.rank.color : C.mute }}>{cur ? `You: ${cur.label}` : "Not logged"}</div>
      </div>
      {steps.map((v, i) => {
        const reached = cur && cur.score >= i + 1;
        return <div key={i} className="text-center font-semibold tabular-nums" style={{ color: reached ? RANKS[i + 1].color : C.sub, textShadow: reached ? `0 0 8px ${RANKS[i + 1].glow}` : "none" }}>{v}</div>;
      })}
    </div>
  );
}


export function Ranks({ s, openMuscle }) {
  const p = s.profile;
  const [pick, setPick] = useState("Bench Press");
  const overall = overallInfo(s);
  const key = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up"];
  const all = allExercises(s).filter((e) => e.type !== "timed" && e.type !== "assisted");
  const bests = computeBests(s);
  const ft = Math.floor(p.height / 12), inch = Math.round(p.height % 12);
  const totalW = Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-wide glowtext">Ranks</h1>
      <div className="body text-sm" style={{ color: C.dim }}>
        Targets are built for you: {p.weight} lb, {ft}'{inch}", {sexLabel(p)}. Heavier lifters need to lift more, and taller frames need more too, because a strong physique at that height means carrying more muscle. Update your body stats on the Status tab whenever they change.
      </div>

      <div className="space-y-2">
        {[...RANKS].reverse().filter((r) => r.id !== "SS" || overall.score >= 6).map((r) => {
          const mine = overall.rank.id === r.id;
          return (
            <div key={r.id} className="panel p-3 flex items-center gap-4" style={mine ? { borderColor: r.color, boxShadow: `0 0 22px ${r.glow}` } : null}>
              <RankBadge rank={r} size={36} />
              <div className="flex-1 ml-1">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold" style={{ color: r.color }}>{r.id}-Rank · {RANK_INFO[r.id][0]}</span>
                  {mine && <span className="text-xs font-bold" style={{ color: r.color }}>You · {overall.label}</span>}
                </div>
                <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{RANK_INFO[r.id][1]}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>Each rank has three divisions: III, II, then I. S I sits 35% past the S line. Rumour has it there's something above S.</div>

      <h2 className="text-lg font-bold glowtext pt-2">What each rank takes</h2>
      <div className="panel p-3">
        <div className="grid gap-1 pb-1 text-xs font-bold" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)" }}>
          <span style={{ color: C.dim }}>Lift</span>
          {RANKS.slice(1, 6).map((r) => <span key={r.id} className="text-center" style={{ color: r.color, textShadow: `0 0 8px ${r.glow}` }}>{r.id}</span>)}
        </div>
        {key.map((n) => { const e = all.find((x) => x.name === n); return e ? <RankGuideRow key={n} e={e} p={p} bests={bests} /> : null; })}
        <div className="body text-xs pt-2" style={{ color: C.mute }}>Weighted lifts show estimated one-rep max in lb, so 225 × 5 counts as about a 263 lb max. Lifts marked /hand use the weight in one hand. Pull-ups show strict reps in one set, and added weight counts extra. Shoulders and arms are held to a stricter standard.</div>
      </div>

      <div className="panel p-3 space-y-2">
        <label className="body text-sm block" style={{ color: C.dim }}>Look up any exercise
          <select className="inp mt-1" value={pick} onChange={(e) => setPick(e.target.value)}>
            {GROUPS.filter((g) => g !== "Cardio").map((g) => (
              <optgroup key={g} label={g}>{all.filter((e) => e.group === g).map((e) => <option key={e.name}>{e.name}</option>)}</optgroup>
            ))}
          </select>
        </label>
        {all.find((e) => e.name === pick) && <RankGuideRow e={all.find((e) => e.name === pick)} p={p} bests={bests} />}
      </div>

      <h2 className="text-lg font-bold glowtext pt-2">How overall rank works</h2>
      <div className="panel p-4 space-y-3">
        <div className="body text-sm" style={{ color: C.dim }}>Your best lift in each muscle group counts, weighted like this. To be overall S, you need to be elite across your whole body, not on one machine.</div>
        {Object.entries(GROUP_WEIGHT).map(([k, w]) => {
          const sc = overall.groups[k] || 0;
          const r = rankFromScore(sc);
          return (
            <button key={k} onClick={() => openMuscle?.(k)} className="w-full text-left">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{k} <span className="body text-xs" style={{ color: C.mute }}>counts {Math.round((w / totalW) * 100)}% · tap</span></span>
                <span className="font-bold" style={{ color: sc ? r.rank.color : C.mute }}>{sc ? r.label : "Untrained"}</span>
              </div>
              <div className="mt-1"><Bar pct={(sc / 6) * 100} color={sc ? r.rank.color : C.mute} /></div>
            </button>
          );
        })}
        <div className="body text-xs" style={{ color: C.mute }}>Cardio and timed exercises earn XP but don't affect rank.</div>
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
