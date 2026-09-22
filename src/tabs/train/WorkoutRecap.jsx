import { useState, useEffect, useRef } from "react";
import { X, Bot, Loader2, ChevronDown } from "lucide-react";
import { C } from "../../theme.js";
import { findEx } from "../../lib/exercises.js";
import { streakOf, overallInfo } from "../../lib/stats.js";
import { sexLine } from "../../lib/dates.js";
import { RankBadge } from "./RankBadge.jsx";
import { ReceiptButton, buildReceipt } from "./receipt.jsx";
import { setLabel } from "./helpers.js";
import { askJson, STERLING_SYS } from "./sterling.js";
import { postFeed, workoutPayload } from "./social.js";
export function WorkoutRecap({ s, setS }) {
  const sum = s.lastSummary;
  const recap = sum.recap || { lifts: [], overall: null };
  const [open, setOpen] = useState(null);
  const fetched = useRef(false);
  useEffect(() => {
    if (fetched.current || sum.sterling) return;
    fetched.current = true;
    const lifts = recap.lifts.map((l) => `${l.name}${l.rank ? ` ${l.rank.label}` : ""} ${l.sets.map((st) => setLabel(findEx(s, l.name), st)).join(", ")}`).join(" | ");
    askJson(STERLING_SYS, `Just finished a workout titled "${sum.title || "untitled"}". Overall session rank: ${recap.overall?.label || "unranked"}. PRs: ${sum.prNames?.join(", ") || "none"}. Volume ${Math.round(sum.volume)} lb in ${sum.minutes || "?"} min. Lifts: ${lifts || "none"}. Bodyweight ${s.profile.weight} lb. ${sexLine(s.profile)} Give 3 specific tips to improve the next time they do this session. Respond ONLY with JSON: {"quip": "one short funny line", "tips": ["tip 1", "tip 2", "tip 3"]}`)
      .then((r) => setS((p) => p.lastSummary ? { ...p, lastSummary: { ...p.lastSummary, sterling: { quip: r.quip || "", tips: (r.tips || []).slice(0, 3).map(String) } } } : p))
      .catch(() => setS((p) => p.lastSummary ? { ...p, lastSummary: { ...p.lastSummary, sterling: { quip: "", tips: [], err: true } } } : p));
  }, []);
  const stl = sum.sterling;
  const overall = recap.overall;
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: overall?.rank.color || C.green }}>
      <div className="flex justify-between items-start gap-2">
        <div>
          <div className="font-bold">{sum.title ? `${sum.title} breakdown` : "Workout breakdown"}</div>
          <div className="body text-xs" style={{ color: C.dim }}>+{sum.xp} XP · {Math.round(sum.volume).toLocaleString()} lb{sum.minutes ? ` · ${sum.minutes} min` : ""}{sum.sets ? ` · ${sum.sets} sets` : ""}{sum.prs ? ` · ${sum.prs} PR${sum.prs > 1 ? "s" : ""}` : ""}</div>
        </div>
        <button aria-label="Dismiss" onClick={() => setS((p) => ({ ...p, lastSummary: null }))} style={{ color: C.mute }}><X size={16} /></button>
      </div>
      <div className="flex items-center gap-3">
        {overall ? <RankBadge rank={overall.rank} size={48} /> : <div className="font-bold" style={{ color: C.mute }}>Unranked</div>}
        <div>
          <div className="font-extrabold text-xl" style={{ color: overall?.rank.color || C.mute, textShadow: overall ? `0 0 12px ${overall.rank.glow}` : "none" }}>{overall ? overall.label : "Cardio / timed"}</div>
          <div className="body text-xs" style={{ color: C.dim }}>Overall session rank from the lifts you logged</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[["XP", `+${sum.xp}`], ["Volume", `${Math.round(sum.volume).toLocaleString()} lb`], ["Time", sum.minutes ? `${sum.minutes} min` : "–"], ["Sets", sum.sets || recap.lifts.reduce((a, l) => a + l.sets.length, 0)], ["PRs", sum.prs || 0], ["Streak", `${streakOf(s)}d`]].map(([l, v]) => (
          <div key={l} className="ghost py-2 px-1 text-center"><div className="text-xs body" style={{ color: C.dim }}>{l}</div><div className="font-bold glowtext">{v}</div></div>
        ))}
      </div>
      <div className="space-y-1">
        <div className="font-bold text-sm flex items-center gap-2"><Bot size={16} style={{ color: C.cyan }} />Sterling's next-session notes</div>
        {!stl && <div className="body text-sm flex items-center gap-2" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Reading your session…</div>}
        {stl?.err && <div className="body text-xs" style={{ color: C.mute }}>Couldn't reach Sterling. Your ranks below still stand.</div>}
        {stl?.quip && <div className="body text-sm italic" style={{ color: C.sub }}>"{stl.quip}"</div>}
        {(stl?.tips || []).map((t, i) => <div key={i} className="body text-sm" style={{ color: C.text }}>• {t}</div>)}
      </div>
      {sum.suggestions?.length > 0 && <div className="body text-xs" style={{ color: C.dim }}>Next time: {sum.suggestions.map((x) => `${x.name} ${x.next.w}×${x.next.r}`).join(" · ")}</div>}
      <div className="space-y-2">
        <div className="font-bold text-sm">Exercise ranks</div>
        {recap.lifts.map((l) => (
          <button key={l.name} onClick={() => setOpen(open === l.name ? null : l.name)} className="panel p-3 w-full text-left space-y-1">
            <div className="flex items-center gap-2">
              {l.rank ? <RankBadge rank={l.rank.rank} size={28} /> : <span className="body text-xs" style={{ color: C.mute }}>–</span>}
              <div className="flex-1 min-w-0"><div className="font-semibold truncate">{l.name}</div><div className="body text-xs" style={{ color: C.dim }}>{l.rank ? l.rank.label : "Unranked"} · {Math.round(l.vol).toLocaleString()} lb{l.drops ? ` · ${l.drops} drop${l.drops > 1 ? "s" : ""}` : ""}</div></div>
              <ChevronDown size={14} style={{ transform: open === l.name ? "rotate(180deg)" : "none", color: C.mute }} />
            </div>
            {open === l.name && <div className="body text-xs" style={{ color: C.sub }}>{l.sets.map((st) => setLabel(findEx(s, l.name), st)).join(" · ")}</div>}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <ReceiptButton label="Share card" make={() => buildReceipt({ s, kind: sum.prs ? "New PR" : "Workout complete", headline: overall ? `${overall.label} session` : (sum.title ? `${sum.title} day` : "Session done"), sub: recap.lifts.map((l) => `${l.name}${l.rank ? ` ${l.rank.label}` : ""}`).join(" · "), tierImg: Math.floor(overallInfo(s).score), rows: [["XP earned", `+${sum.xp}`], ["Volume", `${Math.round(sum.volume).toLocaleString()} lb`], ["Time", sum.minutes ? `${sum.minutes} min` : "–"], ["Overall", overall?.label || "–"], ["Streak", `${streakOf(s)} days`]] })} />
        {s.lb && sum.workoutId && <button onClick={() => { const w = s.workouts.find((x) => x.id === sum.workoutId); if (!w || w.shared) return; postFeed(s, "workout", `finished a ${w.title ? `${w.title} ` : ""}workout · +${w.xp || 0} XP`, { detail: w.exercises.map((ex) => ex.name).join(", "), workout: workoutPayload(s, w) }, `workout_${w.id}`); setS((p) => ({ ...p, workouts: p.workouts.map((x) => (x.id === w.id ? { ...x, shared: true } : x)) })); }} className="ghost flex-1 py-2 text-sm font-semibold" style={{ color: C.cyan }}>{s.workouts.find((x) => x.id === sum.workoutId)?.shared ? "Shared" : "Share to feed"}</button>}
      </div>
    </div>
  );
}
