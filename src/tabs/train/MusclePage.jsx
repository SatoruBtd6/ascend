import { useState } from "react";
import { ChevronLeft, ChevronRight, Bot, Loader2, Youtube, Info } from "lucide-react";
import { C } from "../../theme.js";
import { RANKS, GROUP_WEIGHT } from "../../data/ranks.js";
import { findEx } from "../../lib/exercises.js";
import { groupScores, rankedLifts, rankFromScore } from "../../lib/stats.js";
import { sexLine, today, shift } from "../../lib/dates.js";
import { Empty, Bar, ExpandBox, MoreRow, Tap } from "../../ui/primitives.jsx";
import { AnchoredMenu } from "../../ui/AnchoredMenu.jsx";
import { RankBadge } from "./RankBadge.jsx";
import { MusclePhoto } from "./MusclePhoto.jsx";
import { askJson, STERLING_SYS } from "./sterling.js";
import { ytUrl } from "./yt.js";

const HAIR = "1px solid rgba(255,255,255,.08)";

export const MUSCLE_INFO = {
  Chest: { name: "Chest", key: ["Bench Press", "Incline Bench Press", "Dumbbell Press"], tips: ["Anchor the group on a heavy press (barbell or dumbbell) for 3–5 sets of 5–8, adding weight or a rep every week.", "Add an incline press for the upper chest and a fly or cable crossover for a stretch under load.", "Chest rank uses your best press. Push the estimated max up with heavier low-rep sets, not just more volume."] },
  Back: { name: "Back", key: ["Deadlift", "Barbell Row", "Pull-up", "Lat Pulldown"], tips: ["Pull twice as much as you push: one vertical pull (pull-ups or pulldowns) and one horizontal pull (rows) every week.", "Deadlift or trap-bar deadlift moves this rank fastest because its factor is the highest of any lift.", "Log weighted pull-ups with the added weight in the +lb column, it counts extra."] },
  Legs: { name: "Legs", key: ["Squat", "Leg Press", "Romanian Deadlift", "Hack Squat"], tips: ["Squat or hack squat heavy once a week, then a second lighter leg day with leg press, RDLs, and single-leg work.", "Legs count the most toward overall rank, so this is the highest-value muscle group to grind.", "Leg press numbers need to be big to rank: the machine's threshold is 2.4× your bench standard."] },
  Shoulders: { name: "Shoulders", key: ["Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise"], tips: ["Overhead press is the rank driver here. Press standing, strict, 4–5 sets of 5–8.", "Lateral raises and rear delt work add width but rank slowly; their thresholds are strict on purpose.", "Shoulders are held to a 25% stricter standard, so expect this group to lag your chest by a rank or so."] },
  Arms: { name: "Arms", key: ["Barbell Curl", "Tricep Pushdown", "Close-Grip Bench Press"], tips: ["Barbell curl and close-grip bench move arm rank fastest, they have the highest factors in the group.", "Two exercises each for biceps and triceps, 3 sets of 8–12, and add a little weight every week.", "Arms only count 8% of overall rank, so treat this as the finisher, not the priority."] },
  Core: { name: "Core", key: ["Cable Crunch", "Hanging Leg Raise", "Ab Crunch Machine"], tips: ["Weighted core work ranks: cable crunches or the crunch machine with real load, 3 sets of 10–15.", "Hanging leg raises count by reps. Strict, slow reps with no swing.", "Planks and holds earn XP but don't affect rank since they're timed."] },
};
export function MusclePage({ s, group, onBack, openExercise }) {
  const [preview, setPreview] = useState(null);
  const [moreStats, setMoreStats] = useState(false);
  const [allLifts, setAllLifts] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [photoInfo, setPhotoInfo] = useState(null);
  const info = MUSCLE_INFO[group] || { name: group, key: [], tips: [] };
  const sc = groupScores(s)[group] || 0;
  const r = rankFromScore(sc);
  const lifts = rankedLifts(s).filter((x) => x.e.group === group).sort((a, b) => b.score - a.score);
  const shown = lifts.slice(0, 5);
  const since30 = shift(today(), -30);
  let sets30 = 0, vol30 = 0, sessions30 = new Set(), volAll = 0;
  s.workouts.forEach((w) => w.exercises.forEach((ex) => { const d = findEx(s, ex.name); if (d.group !== group || d.type === "timed") return; const v = ex.sets.reduce((a, st) => a + (+st.w || 0) * (+st.r || 0), 0); volAll += v; if (w.date >= since30) { sets30 += ex.sets.length; vol30 += v; sessions30.add(w.date); } }));
  const [ai, setAi] = useState({ status: "idle", text: "", next: [] });
  const askAi = async () => {
    setAi({ status: "loading", text: "", next: [] });
    try {
      const rr = await askJson(STERLING_SYS, `Muscle group: ${group}. Current group rank ${sc ? r.label : "untrained"} (score ${sc.toFixed(2)} of 6). Lifts logged: ${lifts.map((x) => `${x.e.name} ${x.label} best ${Math.round(x.best)}${x.e.type === "bodyweight" ? " reps" : " lb est max"}${x.next ? `, next rank at ${x.next}` : ""}`).join("; ") || "none"}. Last 30 days: ${sessions30.size} sessions, ${sets30} sets, ${Math.round(vol30).toLocaleString()} lb volume. Bodyweight ${s.profile.weight} lb. ${sexLine(s.profile)} Give a specific plan to raise this muscle group's rank. Respond ONLY with JSON: {"quip": "one funny line", "plan": "2-3 sentences of specific advice", "next": [{"exercise": "name", "scheme": "e.g. 4×6", "why": "under 10 words"}]}`);
      setAi({ status: "done", text: `${rr.quip ? `"${rr.quip}" ` : ""}${rr.plan || ""}`, next: (rr.next || []).slice(0, 3) });
    } catch (e) { setAi({ status: "error", text: "", next: [] }); }
  };
  const steps = [0, 1, 2, 3, 4, 5];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">{info.name}</h1>
        <span className="font-extrabold text-xl" style={{ color: sc ? r.rank.color : C.mute, textShadow: `0 0 12px ${r.rank.glow}` }}>{sc ? r.label : "Untrained"}</span>
      </div>
      <div>
        <MusclePhoto group={group} tier={preview ?? sc} height={300} sex={s.profile.sex} />
        <div className="relative flex items-center justify-center mb-2">
          <div className="body text-xs text-center" style={{ color: preview !== null ? C.cyan : C.dim, padding: "0 40px" }}>{preview !== null ? `Preview: ${RANKS[preview].id}-rank ${info.name.toLowerCase()} · tap again to go back` : `Your ${info.name.toLowerCase()} at ${sc ? r.label : "untrained"} · tap a rank to preview`}</div>
          <div className="absolute right-0" style={{ top: "50%", transform: "translateY(-50%)" }}>
            <Tap tight label="How group rank works" menu onClick={(e) => setPhotoInfo(photoInfo ? null : e.currentTarget)}>
              <Info size={16} style={{ color: C.mute }} />
            </Tap>
          </div>
        </div>
        <div className="flex justify-between items-center px-1">
          {[0, 1, 2, 3, 4, 5, 6].map((t) => { const rk = RANKS[t]; const reached = sc >= t; return <button key={t} onClick={() => setPreview(preview === t ? null : t)} className="flex flex-col items-center gap-1" style={{ opacity: reached || preview === t ? 1 : 0.4, transform: preview === t ? "scale(1.15)" : "none", transition: "transform .2s" }}><RankBadge rank={rk} size={26} still /><span className="text-xs body" style={{ color: reached ? rk.color : C.mute }}>{rk.id}</span></button>; })}
        </div>
        <div className="mt-2"><Bar pct={(sc / 6) * 100} color={sc ? r.rank.color : C.mute} /></div>
      </div>
      {photoInfo && (
        <AnchoredMenu anchor={photoInfo} onClose={() => setPhotoInfo(null)} minWidth={240}>
          <div className="px-4 py-3 body text-xs" style={{ color: C.mute }}>The photo grows as your best lift in this group climbs. Group rank = your best-ranked lift here.</div>
        </AnchoredMenu>
      )}

      <div>
        <div className="body" style={{ fontSize: 13, color: C.mute }}>Last 30 days</div>
        <div className="grid grid-cols-3" style={{ padding: "10px 0" }}>
          {[["Sessions", sessions30.size], ["Sets", sets30], ["Volume", `${Math.round(vol30 / 1000)}k lb`]].map(([l, v]) => (
            <div key={l} className="text-center">
              <div className="font-bold" style={{ fontSize: 20, color: C.text }}>{v}</div>
              <div className="body" style={{ fontSize: 14, color: C.mute }}>{l}</div>
            </div>
          ))}
        </div>
        <MoreRow label="More" open={moreStats} onToggle={() => { setPhotoInfo(null); setMoreStats(!moreStats); }} />
        <ExpandBox open={moreStats}>
          {[["Lifetime volume", volAll >= 1000000 ? `${(volAll / 1000000).toFixed(1)}M lb` : `${Math.round(volAll / 1000)}k lb`], ["Lifts ranked", lifts.length], ["Counts toward overall", `${Math.round(((GROUP_WEIGHT[group] || 0) / Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0)) * 100)}%`]].map(([l, v]) => (
            <div key={l} className="flex items-center justify-between" style={{ padding: "10px 0", borderTop: HAIR }}>
              <span className="body" style={{ fontSize: 14, color: C.mute }}>{l}</span>
              <span style={{ fontSize: 16, color: C.text }}>{v}</span>
            </div>
          ))}
        </ExpandBox>
      </div>

      <div>
        <h2 className="text-lg font-bold" style={{ color: C.text }}>Your lifts here</h2>
        {lifts.length === 0 && <Empty>Nothing logged for {info.name} yet. Start with {info.key.slice(0, 2).join(" or ")}.</Empty>}
        {shown.map((x, i) => (
          <div key={x.e.name} role="button" tabIndex={0} aria-label={`Open ${x.e.name}`}
            onClick={(e) => { if (e.target.closest("button,input,a")) return; openExercise?.(x.e.name); }}
            onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openExercise?.(x.e.name); } }}
            className="flex items-center gap-3" style={{ padding: "14px 0", borderTop: i ? HAIR : null }}>
            <RankBadge rank={x.rank} size={32} />
            <div className="flex-1 min-w-0">
              <div className="truncate" style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{x.e.name}</div>
              <div className="body" style={{ fontSize: 14, color: C.dim, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>Best {Math.round(x.best)}{x.e.type === "bodyweight" ? " reps" : " lb est. max"}{x.next ? ` · ${x.nextLabel} at ${x.next}` : " · maxed"}</div>
            </div>
            <span className="shrink-0" style={{ fontSize: 17, fontWeight: 700, color: x.rank.color }}>{x.label}</span>
          </div>
        ))}
        {lifts.length > 5 && <MoreRow label={allLifts ? "Show fewer" : `Show all ${lifts.length}`} open={allLifts} onToggle={() => { setPhotoInfo(null); setAllLifts(!allLifts); }} />}
        <ExpandBox open={allLifts}>
          {lifts.slice(5).map((x) => (
            <div key={x.e.name} role="button" tabIndex={0} aria-label={`Open ${x.e.name}`}
              onClick={(e) => { if (e.target.closest("button,input,a")) return; openExercise?.(x.e.name); }}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openExercise?.(x.e.name); } }}
              className="flex items-center gap-3" style={{ padding: "14px 0", borderTop: HAIR }}>
              <RankBadge rank={x.rank} size={32} />
              <div className="flex-1 min-w-0">
                <div className="truncate" style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{x.e.name}</div>
                <div className="body" style={{ fontSize: 14, color: C.dim, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>Best {Math.round(x.best)}{x.e.type === "bodyweight" ? " reps" : " lb est. max"}{x.next ? ` · ${x.nextLabel} at ${x.next}` : " · maxed"}</div>
              </div>
              <span className="shrink-0" style={{ fontSize: 17, fontWeight: 700, color: x.rank.color }}>{x.label}</span>
            </div>
          ))}
        </ExpandBox>
      </div>

      <div>
        <div role="button" tabIndex={0} aria-expanded={tipsOpen}
          onClick={(e) => { if (e.target.closest("button,input,a")) return; setPhotoInfo(null); setTipsOpen(!tipsOpen); }}
          onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setPhotoInfo(null); setTipsOpen(!tipsOpen); } }}
          className="flex items-center gap-1" style={{ minHeight: 44 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>How to rank up</span>
          <ChevronRight size={18} className="ml-auto shrink-0" style={{ color: C.mute, transform: tipsOpen ? "rotate(90deg)" : "none", transition: "transform .25s ease-out" }} />
        </div>
        <ExpandBox open={tipsOpen}>
          <div className="space-y-2" style={{ paddingTop: 4 }}>
            {info.tips.map((t, i) => <div key={i} className="body flex gap-2" style={{ fontSize: 16, color: C.text }}><span style={{ color: C.cyan }}>▸</span><span>{t}</span></div>)}
            <div className="body" style={{ fontSize: 14, color: C.mute, paddingTop: 4 }}>Rank-driving lifts: {info.key.join(", ")}.</div>
          </div>
        </ExpandBox>
      </div>

      <div style={{ borderTop: HAIR, paddingTop: 4 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Bot size={20} className="shrink-0" style={{ color: C.cyan }} />
          <span style={{ flex: "1 1 150px", minWidth: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Sterling's plan for your {info.name.toLowerCase()}</span>
          {ai.status === "idle" && (
            <button type="button" onClick={askAi} aria-label="Build me a plan" style={{ flex: "1 1 130px", minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", padding: 0 }}>
              <span className="btn flex items-center justify-center w-full" style={{ height: 32, borderRadius: 999, fontSize: 14 }}>Build me a plan</span>
            </button>
          )}
        </div>
        {(ai.status !== "idle") && (
          <div className="space-y-2" style={{ borderTop: HAIR, marginTop: 10, paddingTop: 10 }}>
            {ai.status === "loading" && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Sterling is measuring your {info.name.toLowerCase()} with a tape…</div>}
            {ai.status === "error" && <button onClick={askAi} className="ghost w-full py-2 text-sm">Couldn't reach Sterling. Try again</button>}
            {ai.text && <div className="body text-sm" style={{ color: C.text }}>{ai.text}</div>}
            {ai.next.map((n, i) => <div key={i} className="ghost p-2 flex items-center gap-2 text-sm"><div className="flex-1 min-w-0"><span className="font-semibold">{n.exercise}</span> <span style={{ color: C.dim }}>{n.scheme}{n.why ? ` · ${n.why}` : ""}</span></div><a href={ytUrl(n.exercise)} target="_blank" rel="noreferrer" aria-label={`How to ${n.exercise}`} style={{ color: C.mute }}><Youtube size={16} /></a></div>)}
            {ai.status === "done" && <button onClick={askAi} className="body text-xs underline" style={{ color: C.mute }}>New plan</button>}
          </div>
        )}
      </div>
    </div>
  );
}
