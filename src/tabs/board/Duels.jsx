import { useEffect, useState } from "react";
import { Dumbbell, Footprints, Loader2, Play, Swords, X, Zap } from "lucide-react";
import { ask } from "../../lib/ask.js";
import { shift, today, uid } from "../../lib/dates.js";
import { activeDays } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { Empty } from "../../ui/primitives.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { pointsOf } from "../profile/points.js";
import { nemesisWins } from "../profile/rivalryStats.js";
import { fmtShort } from "../train/helpers.js";
import { readShared } from "../train/social.js";
import { STERLING_SYS, askJson, sterlingSay } from "../train/sterling.js";
import { DUEL_XP } from "../train/xpConstants.js";
import { DUEL_CONDS, NEMESIS_REWARDS, duelState, isMutualNemesis, rivalRecord } from "./duels.js";
export function DuelButton({ s, targetId, targetName, targetUid, nemesis = false, onSent }) {
  const [forfeit, setForfeit] = useState("");
  const [cond, setCond] = useState("xp");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const send = async () => {
    if (!s.lb || !s.profile.name) { setErr("Join the leaderboard first."); return; }
    const id = uid();
    try {
      await window.storage.set(`duel:${id}`, JSON.stringify({ id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, cond, forfeit: forfeit.trim().slice(0, 60), status: "pending", t: Date.now() }), true);
      setSent(true); onSent?.();
    } catch (e) { setErr("Couldn't send the duel. Check your connection."); }
  };
  if (sent) return <div className="body text-sm" style={{ color: C.green }}>Duel sent. It starts the day {targetName} accepts. Track it on Board → Crew.</div>;
  if (!open) return <button onClick={() => setOpen(true)} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: nemesis ? "#FF6B8F" : C.cyan, borderColor: nemesis ? "rgba(255,45,111,.5)" : undefined }}><Swords size={16} />{nemesis ? "Challenge your Nemesis" : "Challenge to a 7-day duel"}</button>;
  return (
    <div className="panel p-3 space-y-2.5" style={nemesis ? { borderColor: "rgba(255,45,111,.5)" } : null}>
      <div className="text-sm font-bold">Win condition</div>
      <div role="radiogroup" aria-label="Win condition" className="grid grid-cols-3 gap-2">
        {Object.entries(DUEL_CONDS).map(([k, c]) => (
          <button key={k} role="radio" aria-checked={cond === k} onClick={() => setCond(k)} className="py-2 text-sm font-bold flex flex-col items-center gap-0.5" style={{ borderRadius: 12, background: cond === k ? `${C.cyan}1F` : C.glass, border: `1.5px solid ${cond === k ? C.cyan : C.glassLine}`, color: cond === k ? C.text : C.dim }}>
            {k === "xp" ? <Zap size={16} /> : k === "steps" ? <Footprints size={16} /> : <Dumbbell size={16} />}{c.label}
          </button>
        ))}
      </div>
      <div className="body text-xs" style={{ color: C.sub }}>Runs 7 days from the day {targetName} accepts. Winner gets {DUEL_XP} XP.{nemesis ? " This is a Nemesis duel: wins count toward your rivalry rewards." : ""}</div>
      <input className="inp text-sm" placeholder="Forfeit (optional), e.g. buys the shakes" value={forfeit} onChange={(e) => setForfeit(e.target.value)} />
      {err && <div className="body text-xs" style={{ color: C.red }}>{err}</div>}
      <div className="grid grid-cols-2 gap-2"><button onClick={() => setOpen(false)} className="ghost py-2 text-sm">Cancel</button><button onClick={send} className="btn py-2 text-sm">Send duel</button></div>
    </div>
  );
}

// Profile head-to-head: propose / accept / show the rivalry
export function RivalryButton({ s, setS, them }) {
  const mineOn = s.nemesis?.id === them.id, theirsOn = them.rivalWith === s.playerId;
  const rec = rivalRecord(s, them.id);
  const set = (n) => setS((p) => ({ ...p, nemesis: n, nemesisSeen: {} }));
  const replace = (fn) => (s.nemesis?.id && s.nemesis.id !== them.id ? ask(`Replace ${s.nemesis.name || "your current Nemesis"} with ${them.name}? Your record against them stays saved.`, fn, "Replace") : fn());
  const style = { color: "#FF6B8F", borderColor: "rgba(255,45,111,.5)" };
  if (mineOn && theirsOn) return <button onClick={() => ask(`End your rivalry with ${them.name}? Your ${rec.w}–${rec.l}${rec.t ? `–${rec.t}` : ""} record stays saved.`, () => set(null), "End rivalry")} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={style}>😈 Your Nemesis · {rec.w}–{rec.l}{rec.t ? `–${rec.t}` : ""}</button>;
  if (mineOn) return <button onClick={() => set(null)} className="ghost w-full py-2.5 text-sm font-semibold" style={{ color: C.dim }}>Rivalry proposed · waiting for {them.name} · tap to cancel</button>;
  if (theirsOn) return <button onClick={() => replace(() => set({ id: them.id, name: them.name, since: today() }))} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2">😈 Accept {them.name}'s rivalry</button>;
  return <button onClick={() => replace(() => set({ id: them.id, name: them.name, since: today() }))} className="ghost w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2" style={style}>😈 Propose a Nemesis rivalry</button>;
}

export function RivalryCard({ s, setS, rows, openProfile }) {
  const [challenge, setChallenge] = useState(false);
  const cardOf = (id) => rows.find((r) => r.id === id);
  const nemCard = s.nemesis?.id ? cardOf(s.nemesis.id) : null;
  const mutual = isMutualNemesis(s, nemCard);
  const incoming = rows.filter((r) => r.rivalWith === s.playerId && r.id !== s.playerId && s.nemesis?.id !== r.id && !(s.rivalDeclined || {})[r.id]);
  const wins = nemesisWins(s);
  const accept = (r) => {
    const go = () => setS((p) => ({ ...p, nemesis: { id: r.id, name: r.name, since: today() }, nemesisSeen: {} }));
    if (s.nemesis?.id) ask(`Replace ${s.nemesis.name || "your current Nemesis"} with ${r.name}? Your record against them stays saved.`, go, "Replace"); else go();
  };
  return (
    <div className="space-y-2">
      {incoming.map((r) => (
        <div key={r.id} className="panel p-3 flex items-center gap-3" style={{ borderColor: "rgba(255,45,111,.5)" }}>
          <Avatar src={r.avatar} name={r.name} size={36} look={r.look} />
          <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate"><FancyName name={r.name} look={r.look} /> wants you as their Nemesis</div><div className="body text-xs" style={{ color: C.dim }}>Accept to make it official. Duels between you count toward rivalry rewards.</div></div>
          <div className="flex flex-col gap-1.5 shrink-0"><button onClick={() => accept(r)} className="btn px-3 py-1.5 text-xs">Accept</button><button onClick={() => setS((p) => ({ ...p, rivalDeclined: { ...(p.rivalDeclined || {}), [r.id]: Date.now() } }))} className="ghost px-3 py-1.5 text-xs">Decline</button></div>
        </div>
      ))}
      {s.nemesis?.id && mutual ? (() => {
        const rec = rivalRecord(s, s.nemesis.id);
        return (
          <div className="panel p-4 space-y-3" style={{ borderColor: "rgba(255,45,111,.55)", background: "linear-gradient(160deg, rgba(122,0,25,.28), transparent 60%)" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => openProfile(nemCard.id)} aria-label={`Open ${nemCard.name}'s profile`}><Avatar src={nemCard.avatar} name={nemCard.name} size={52} look={nemCard.look} /></button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FF6B8F" }}>😈 Your Nemesis</div>
                <div className="text-lg font-bold truncate"><FancyName name={nemCard.name} look={nemCard.look} /></div>
                <div className="body text-xs" style={{ color: C.dim }}>Rivals since {fmtShort(s.nemesis.since || today())}</div>
              </div>
              <div className="text-center shrink-0">
                <div className="text-2xl font-extrabold tabular-nums" aria-label={`Record ${rec.w} wins, ${rec.l} losses${rec.t ? `, ${rec.t} ties` : ""}`}><span style={{ color: C.green }}>{rec.w}</span><span style={{ color: C.mute }}>–</span><span style={{ color: "#FF6B8F" }}>{rec.l}</span>{rec.t ? <><span style={{ color: C.mute }}>–</span><span style={{ color: C.dim }}>{rec.t}</span></> : null}</div>
                <div className="body" style={{ fontSize: 10.5, color: C.mute }}>lifetime W–L{rec.t ? "–T" : ""}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NEMESIS_REWARDS.map((r) => { const got = wins >= r.wins; return (
                <div key={r.wins} className="text-center py-2 px-1" style={{ borderRadius: 10, background: got ? "rgba(255,31,75,.16)" : C.glass, border: `1px solid ${got ? "#FF6B8F" : C.glassLine}` }}>
                  <div className="text-xs font-bold" style={{ color: got ? "#FFD9DF" : C.dim }}>{got ? "✓ " : ""}{r.kind}</div>
                  <div className="body" style={{ fontSize: 10.5, color: got ? C.sub : C.mute }}>{got ? r.name.replace(/ (badge|title|aura)$/, "") : `${Math.min(wins, r.wins)}/${r.wins} Nemesis wins`}</div>
                </div>
              ); })}
            </div>
            {challenge ? <DuelButton s={s} targetId={nemCard.id} targetName={nemCard.name} targetUid={nemCard.uid} nemesis onSent={() => setChallenge(false)} /> : <button onClick={() => setChallenge(true)} className="btn w-full py-2.5 text-sm flex items-center justify-center gap-2"><Swords size={16} />Challenge {nemCard.name}</button>}
          </div>
        );
      })() : s.nemesis?.id ? (
        <div className="panel p-3 body text-sm flex items-center justify-between gap-2" style={{ color: C.dim }}><span>Rivalry proposed to <b style={{ color: C.text }}>{s.nemesis.name}</b>. Waiting for them to accept.</span><button onClick={() => setS((p) => ({ ...p, nemesis: null }))} className="text-xs underline shrink-0" style={{ color: C.mute }}>Cancel</button></div>
      ) : !incoming.length ? (
        <div className="body text-xs" style={{ color: C.dim }}>No Nemesis yet. Open a player's profile from the board and propose a rivalry. Beat your Nemesis in duels to earn the Rivalbreaker badge (1 win), Nemesis Slayer title (3) and Vendetta aura (5).</div>
      ) : null}
    </div>
  );
}

export function DuelsPanel({ s, setS, gainXp, rows, openProfile }) {
  const [duels, setDuels] = useState(null);
  useEffect(() => { readShared("duel:").then((d) => setDuels(d.filter((x) => x.from === s.playerId || x.to === s.playerId).sort((a, b) => (b.t || 0) - (a.t || 0)))).catch(() => setDuels([])); }, []);
  const cardOf = (id) => rows.find((r) => r.id === id || r.key === `lb:${id}`);
  const accept = async (d) => {
    const other = cardOf(d.from);
    const rec = { ...d, key: undefined, status: "on", start: today(), acceptedAt: Date.now(), nemesis: isMutualNemesis(s, other) };
    try { await window.storage.set(d.key, JSON.stringify(rec), true); setDuels((x) => x.map((y) => (y.key === d.key ? { ...rec, key: d.key } : y))); } catch (e) { /* ignore */ }
  };
  const remove = async (d) => { try { await window.storage.delete(d.key, true); setDuels((x) => x.filter((y) => y.key !== d.key)); } catch (e) { /* ignore */ } };
  const claim = (d) => { setS((p) => ({ ...p, duelClaimed: { ...(p.duelClaimed || {}), [d.id]: true } })); gainXp(DUEL_XP, "Duel win", `duel_${d.id}`); };
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold flex items-center gap-2"><Swords size={18} />Duels &amp; rivalry</h2>
      <RivalryCard s={s} setS={setS} rows={rows} openProfile={openProfile} />
      {duels === null && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading duels…</div>}
      {duels?.length === 0 && <Empty>No duels yet. Open someone's profile from the board and challenge them: most XP, most steps, or most workouts over 7 days.</Empty>}
      {duels?.map((d) => {
        const me = d.from === s.playerId, other = me ? d.toName : d.fromName, otherId = me ? d.to : d.from;
        const oc = cardOf(otherId), mc = cardOf(s.playerId);
        const saved = (s.duelResults || {})[d.id];
        const st = saved ? { ...duelState(d, s, oc), phase: "done", r: saved.r, mine: saved.mine, theirs: saved.theirs } : duelState(d, s, oc);
        const c = DUEL_CONDS[st.cond], fmtV = (v) => (v === null || v === undefined ? "?" : Number(v).toLocaleString());
        const expired = d.status === "pending" && Date.now() - (d.t || 0) > 7 * 86400000;
        return (
          <div key={d.key} className="panel p-3 space-y-1.5" style={d.nemesis ? { borderColor: "rgba(255,45,111,.5)" } : null}>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-right min-w-0"><div className="font-bold text-sm truncate"><FancyName name={s.profile.name} look={s.profile.look} /></div>{mc?.title && <div className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: s.profile.look?.accent || C.cyan }}>{mc.title}</div>}</div>
              <span className="font-extrabold px-2" style={{ color: "#FF2D6F", fontFamily: "'Cinzel', serif" }}>VS</span>
              <button onClick={() => openProfile(otherId)} className="flex-1 text-left min-w-0"><div className="font-bold text-sm truncate"><FancyName name={other} look={oc?.look} /></div>{oc?.title && <div className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: oc?.look?.accent || C.cyan }}>{oc.title}</div>}</button>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap body text-xs" style={{ color: C.dim }}>
              <span className="font-bold px-2" style={{ borderRadius: 999, color: C.cyan, border: `1px solid ${C.cyan}55` }}>{c.label}</span>
              {d.nemesis && <span className="font-bold px-2" style={{ borderRadius: 999, color: "#FF6B8F", border: "1px solid rgba(255,45,111,.5)" }}>😈 Nemesis duel</span>}
              <span>{st.w ? `${fmtShort(st.w.start)} – ${fmtShort(st.w.end)}` : "Starts the day it's accepted"}{st.phase === "live" ? ` · day ${st.day} of 7` : ""}</span>
            </div>
            {d.forfeit && <div className="body text-xs text-center" style={{ color: C.orange }}>Loser: {d.forfeit}</div>}
            {expired ? <div className="body text-xs text-center" style={{ color: C.mute }}>Expired. Never accepted.</div>
              : d.status === "pending" && !me ? <div className="grid grid-cols-2 gap-2"><button onClick={() => remove(d)} className="ghost py-2 text-sm">Decline</button><button onClick={() => accept(d)} className="btn py-2 text-sm">Accept · starts today</button></div>
              : d.status === "pending" ? <div className="body text-xs text-center" style={{ color: C.dim }}>Waiting for {other} to accept.</div> : null}
            {st.phase === "live" && <div className="body text-sm text-center">You <b className="tabular-nums">{fmtV(st.mine)}</b> · {other} <b className="tabular-nums">{fmtV(st.theirs)}</b> <span style={{ color: C.dim }}>{c.unit}</span></div>}
            {st.phase === "waiting" && <div className="body text-xs text-center" style={{ color: C.dim }}>Finished. Waiting for {other} to open the app so their final score posts.</div>}
            {st.phase === "done" && (
              <div className="font-bold text-center" style={{ color: st.r === "w" ? C.gold : st.r === "l" ? "#FF6B8F" : C.dim }}>
                {st.r === "t" ? `Dead heat, ${fmtV(st.mine)} each.` : st.r === "w" ? `You won ${fmtV(st.mine)} to ${fmtV(st.theirs)}` : `${other} won ${fmtV(st.theirs)} to ${fmtV(st.mine)}`}
                {st.r === "w" && !(s.duelClaimed || {})[d.id] && <button onClick={() => claim(d)} className="btn px-3 py-1 text-xs ml-2">Claim {DUEL_XP} XP</button>}
              </div>
            )}
            <div className="text-center"><button onClick={() => ask("Delete this duel? Your win/loss record stays saved.", () => remove(d), "Delete")} className="body text-xs underline" style={{ color: C.mute }}>Delete</button></div>
          </div>
        );
      })}
    </div>
  );
}

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

/* ---------- Dynamic warm-ups ---------- */

/* ---------- Muscle photos ---------- */

/* ---------- Chud King ---------- */
/* ---------- Boss illustrations (SVG, animated by CSS classes) ---------- */
// Every boss is drawn on a 120×120 canvas. Parts carry bs-* classes so they can breathe, flap, sway and glow.
// Swap-in: drop /public/bosses/<id>.webp (transparent, square) and BossArt uses it instead, with the same idle motion.
