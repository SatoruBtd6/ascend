import { useEffect, useState } from "react";
import { Loader2, Play, X } from "lucide-react";
import { shift, today } from "../../lib/dates.js";
import { activeDays } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { pointsOf } from "../profile/points.js";
import { readShared } from "../train/social.js";
import { STERLING_SYS, askJson, sterlingSay } from "../train/sterling.js";
import { isMutualNemesis } from "./duels.js";

/* ---------- Nemesis alerts (mutual rivals only) ---------- */
export function NemesisAlert({ s, setS, openProfile }) {
  const [card, setCard] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const nem = s.nemesis;
  useEffect(() => { if (!nem?.id) { setCard(null); return; } window.storage.get(`lb:${nem.id}`, true).then((r) => setCard(r?.value ? JSON.parse(r.value) : null)).catch(() => {}); }, [nem?.id]);
  useEffect(() => { if (!s.lb) return; readShared("lb:").then((rows) => setIncoming(rows.filter((r) => r.rivalWith === s.playerId && r.id !== s.playerId && s.nemesis?.id !== r.id && !(s.rivalDeclined || {})[r.id]))).catch(() => {}); }, [s.lb, s.nemesis?.id]);
  const mutual = isMutualNemesis(s, card);
  useEffect(() => { if (mutual && s.nemesisSeen?.workouts === undefined) setS((p) => ({ ...p, nemesisSeen: { workouts: card.stats?.workouts || 0, points: card.points || 0 } })); }, [mutual, card]);
  if (incoming.length) {
    const r = incoming[0];
    return (
      <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,45,111,.45)" }}>
        <span className="text-2xl">😈</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold" style={{ color: "#FF6B8F" }}>{r.name} wants you as their Nemesis</div>
          <div className="body text-sm" style={{ color: C.sub }}>Accept on their profile or in Board → Crew → Duels &amp; rivalry.</div>
          <button onClick={() => openProfile(r.id)} className="body text-sm font-semibold mt-1.5" style={{ color: C.cyan }}>View {r.name}</button>
        </div>
      </div>
    );
  }
  if (!mutual) return null;
  const seen = s.nemesisSeen || {};
  const myPoints = pointsOf(s);
  const alerts = [];
  if ((card.stats?.workouts || 0) > (seen.workouts ?? card.stats?.workouts ?? 0)) alerts.push(`${card.name} just logged a workout.`);
  if ((card.points || 0) > myPoints && (seen.points ?? 0) <= myPoints) alerts.push(`${card.name} passed you in points (${card.points.toLocaleString()} vs ${myPoints.toLocaleString()}).`);
  if (seen.workouts === undefined || !alerts.length) return null;
  const dismiss = () => setS((p) => ({ ...p, nemesisSeen: { workouts: card.stats?.workouts || 0, points: card.points || 0 } }));
  return (
    <div className="panel p-4 flex items-start gap-3" style={{ borderColor: "rgba(255,45,111,.45)" }}>
      <span className="text-2xl">😈</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold" style={{ color: "#FF6B8F" }}>Nemesis alert</div>
        {alerts.map((a, i) => <div key={i} className="body text-sm" style={{ color: C.text }}>{a}</div>)}
        <div className="flex gap-3 mt-2"><button onClick={() => { dismiss(); openProfile(nem.id); }} className="body text-sm font-semibold" style={{ color: C.cyan }}>View rival</button><button onClick={dismiss} className="body text-sm" style={{ color: C.dim }}>Dismiss</button></div>
      </div>
    </div>
  );
}

/* ---------- Proactive Sterling ---------- */
export function brokenStreak(s) {
  const days = [...activeDays(s)].sort();
  if (!days.length) return null;
  const last = days[days.length - 1];
  const gap = Math.round((new Date(today() + "T12:00") - new Date(last + "T12:00")) / 86400000);
  if (gap < 2) return null;
  let run = 1, d = last;
  while (days.includes(shift(d, -1))) { run++; d = shift(d, -1); }
  return run >= 2 ? { run, gap } : null;
}
export const ROAST_FALLBACK = [
  "A {run}-day streak, abandoned like a gym membership in February. The dumbbells have filed a missing persons report.",
  "{gap} days off. Even your shadow has been lifting more than you. Shall we fix that, or shall I inform the family?",
  "I had your {run}-day streak framed. I've now had to use the frame for kindling. Back to it.",
];
export function RoastCard({ s, setS }) {
  const d = today();
  const b = brokenStreak(s);
  const [busy, setBusy] = useState(false);
  if (!b || s.roasts?.[d]?.dismissed) return null;
  const cached = s.roasts?.[d]?.text;
  const play = async () => {
    if (cached) { sterlingSay(s, cached); return; }
    if (window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* unlock */ } }
    setBusy(true);
    let text = ROAST_FALLBACK[(b.run + b.gap) % ROAST_FALLBACK.length].replace("{run}", b.run).replace("{gap}", b.gap);
    try { const r = await askJson(STERLING_SYS, `The user had a ${b.run}-day training streak and has now skipped ${b.gap} days. Write a short, savage but affectionate roast in 2 sentences that ends by pushing them to train today. No insults about their body. Respond ONLY with JSON: {"text": "..."}`, 300); if (r.text) text = String(r.text).slice(0, 280); } catch (e) { /* fallback */ }
    setBusy(false);
    setS((p) => ({ ...p, roasts: { ...(p.roasts || {}), [d]: { text } } }));
    sterlingSay(s, text);
  };
  return (
    <div className="panel p-4 flex items-center gap-3">
      <button onClick={play} aria-label="Play Sterling's message" className="btn shrink-0 flex items-center justify-center" style={{ width: 46, height: 46, borderRadius: 999 }}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}</button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">Sterling left you a message</div>
        <div className="body text-xs" style={{ color: C.dim }}>{cached || `About that ${b.run}-day streak…`}</div>
      </div>
      <button aria-label="Dismiss" onClick={() => setS((p) => ({ ...p, roasts: { ...(p.roasts || {}), [d]: { ...(p.roasts?.[d] || {}), dismissed: true } } }))} style={{ color: C.mute }}><X size={16} /></button>
    </div>
  );
}
