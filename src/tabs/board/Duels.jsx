import { useEffect, useState } from "react";
import { ChevronDown, Dumbbell, Footprints, Loader2, Swords, Zap } from "lucide-react";
import { ask } from "../../lib/ask.js";
import { today, uid } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { Disclosure, Empty } from "../../ui/primitives.jsx";
import { Avatar, FancyName } from "../profile/Avatar.jsx";
import { nemesisWins } from "../profile/rivalryStats.js";
import { fmtShort } from "../train/helpers.js";
import { readShared } from "../train/social.js";
import { DUEL_XP } from "../train/xpConstants.js";
import { WORKOUT_CREDIT } from "../../math.js";
import { DUEL_CONDS, DUEL_PENDING_MS, NEMESIS_REWARDS, duelState, isMutualNemesis, pendingOutgoingDuels, rivalRecord } from "./duels.js";
export function DuelButton({ s, targetId, targetName, targetUid, nemesis = false, onSent, duels = null, onCancelled }) {
  const [forfeit, setForfeit] = useState("");
  const [cond, setCond] = useState("xp");
  const [sent, setSent] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");
  const [selfPend, setSelfPend] = useState(null);
  useEffect(() => {
    if (duels) return; // caller keeps the list current
    let on = true;
    readShared("duel:").then((d) => { if (on) setSelfPend(pendingOutgoingDuels(d, s.playerId)); }).catch(() => { if (on) setSelfPend([]); });
    return () => { on = false; };
  }, [duels, s.playerId, sent]);
  const pend = duels ? pendingOutgoingDuels(duels, s.playerId) : (selfPend || []);
  const cancel = async (d) => {
    try { await window.storage.delete(d.key, true); } catch (e) { /* already gone */ }
    setSelfPend((p) => (p || []).filter((x) => x.id !== d.id));
    onCancelled?.(d);
  };
  const send = async () => {
    if (!s.lb || !s.profile.name) { setErr("Join the leaderboard first."); return; }
    try {
      const fresh = pendingOutgoingDuels(await readShared("duel:"), s.playerId);
      if (fresh.length) { setErr(`You already have a challenge out to ${fresh[0].toName}. Cancel it before sending another.`); return; }
      const id = uid();
      await window.storage.set(`duel:${id}`, JSON.stringify({ id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, cond, rule: WORKOUT_CREDIT.duelRule, forfeit: forfeit.trim().slice(0, 60), status: "pending", t: Date.now() }), true);
      setSent(true); onSent?.();
    } catch (e) { setErr("Couldn't send the duel. Check your connection."); }
  };
  if (sent) return <div className="body text-sm" style={{ color: C.green }}>Duel sent. It starts the day {targetName} accepts. Track it on Board → Crew.</div>;
  if (pend.length) return (
    <div className="panel p-3 space-y-2" style={nemesis ? { borderColor: "rgba(255,45,111,.5)" } : null}>
      <div className="body text-sm" style={{ color: C.dim }}>Challenge pending — waiting for <b style={{ color: C.text }}>{pend[0].toName}</b> to accept. One challenge can be out at a time.</div>
      <button onClick={() => cancel(pend[0])} className="ghost w-full py-2 text-sm font-bold">Cancel challenge</button>
    </div>
  );
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

export function RivalryCard({ s, setS, rows, openProfile, duels, setDuels }) {
  const [challenge, setChallenge] = useState(false);
  const pendOut = pendingOutgoingDuels(duels, s.playerId);
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
          <div className="panel p-3 space-y-2.5" style={{ borderColor: "rgba(255,45,111,.55)", background: "linear-gradient(160deg, rgba(122,0,25,.28), transparent 60%)" }}>
            <div className="flex items-center gap-2.5">
              <button onClick={() => openProfile(nemCard.id)} aria-label={`Open ${nemCard.name}'s profile`}><Avatar src={nemCard.avatar} name={nemCard.name} size={40} look={nemCard.look} /></button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: "#FF6B8F" }}>😈 Your Nemesis</div>
                <div className="font-bold truncate"><FancyName name={nemCard.name} look={nemCard.look} /></div>
              </div>
              <div className="font-extrabold tabular-nums shrink-0" aria-label={`Record ${rec.w} wins, ${rec.l} losses${rec.t ? `, ${rec.t} ties` : ""}`}><span style={{ color: C.green }}>{rec.w}</span><span style={{ color: C.mute }}>–</span><span style={{ color: "#FF6B8F" }}>{rec.l}</span>{rec.t ? <><span style={{ color: C.mute }}>–</span><span style={{ color: C.dim }}>{rec.t}</span></> : null}</div>
              {!challenge && !pendOut.length && <button onClick={() => setChallenge(true)} className="btn px-3 py-1.5 text-xs shrink-0 flex items-center gap-1"><Swords size={12} />Challenge</button>}
              {!challenge && pendOut.length > 0 && <button onClick={() => setChallenge(true)} className="ghost px-3 py-1.5 text-xs shrink-0 font-bold" style={{ color: C.dim }}>Pending</button>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {NEMESIS_REWARDS.map((r) => { const got = wins >= r.wins; return (
                <div key={r.wins} className="text-center py-2 px-1" style={{ borderRadius: 10, background: got ? "rgba(255,31,75,.16)" : C.glass, border: `1px solid ${got ? "#FF6B8F" : C.glassLine}` }}>
                  <div className="text-xs font-bold" style={{ color: got ? "#FFD9DF" : C.dim }}>{got ? "✓ " : ""}{r.kind}</div>
                  <div className="body" style={{ fontSize: 10.5, color: got ? C.sub : C.mute }}>{got ? r.name.replace(/ (badge|title|aura)$/, "") : `${Math.min(wins, r.wins)}/${r.wins} Nemesis wins`}</div>
                </div>
              ); })}
            </div>
            {challenge && <DuelButton s={s} targetId={nemCard.id} targetName={nemCard.name} targetUid={nemCard.uid} nemesis duels={duels} onSent={() => setChallenge(false)} onCancelled={(d) => { setDuels?.((x) => (x || []).filter((y) => y.key !== d.key)); setChallenge(false); }} />}
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

export function DuelsSection(props) {
  const { s } = props;
  const [open, setOpen] = useState(false);
  const [duels, setDuels] = useState(null);
  useEffect(() => { readShared("duel:").then((d) => setDuels(d.filter((x) => x.from === s.playerId || x.to === s.playerId).sort((a, b) => (b.t || 0) - (a.t || 0)))).catch(() => setDuels([])); }, []);
  const incoming = props.rows.filter((r) => r.rivalWith === s.playerId && r.id !== s.playerId && s.nemesis?.id !== r.id && !(s.rivalDeclined || {})[r.id]).length;
  const pending = (duels || []).filter((d) => d.status === "pending" && d.to === s.playerId && Date.now() - (d.t || 0) <= DUEL_PENDING_MS).length;
  const actionable = incoming + pending;
  const rec = s.nemesis?.id ? rivalRecord(s, s.nemesis.id) : null;
  const recTxt = rec ? `${rec.w}–${rec.l}${rec.t ? `–${rec.t}` : ""}` : "";
  const right = actionable ? `${actionable} action${actionable === 1 ? "" : "s"}${recTxt ? ` · ${recTxt}` : ""}` : recTxt;
  return <Disclosure title="Duels & rivalry" right={right} open={open} onToggle={() => setOpen((o) => !o)}><DuelsPanel {...props} duels={duels} setDuels={setDuels} /></Disclosure>;
}
export function DuelsPanel({ s, setS, gainXp, rows, openProfile, duels, setDuels }) {
  const [openId, setOpenId] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const cardOf = (id) => rows.find((r) => r.id === id || r.key === `lb:${id}`);
  const accept = async (d) => {
    const other = cardOf(d.from);
    const rec = { ...d, key: undefined, status: "on", start: today(), acceptedAt: Date.now(), nemesis: isMutualNemesis(s, other) };
    try { await window.storage.set(d.key, JSON.stringify(rec), true); setDuels((x) => x.map((y) => (y.key === d.key ? { ...rec, key: d.key } : y))); } catch (e) { /* ignore */ }
  };
  const remove = async (d) => { try { await window.storage.delete(d.key, true); setDuels((x) => x.filter((y) => y.key !== d.key)); } catch (e) { /* ignore */ } };
  const claim = (d) => { setS((p) => ({ ...p, duelClaimed: { ...(p.duelClaimed || {}), [d.id]: true } })); gainXp(DUEL_XP, "Duel win", `duel_${d.id}`); };
  const shown = showAll ? duels : duels?.slice(0, 5);
  return (
    <div className="pt-1">
      <RivalryCard s={s} setS={setS} rows={rows} openProfile={openProfile} duels={duels} setDuels={setDuels} />
      {duels === null && <div className="flex items-center gap-2 body text-sm mt-2" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading duels…</div>}
      {duels?.length === 0 && <Empty>No duels yet. Open someone's profile from the board and challenge them: most XP, most steps, or most workouts over 7 days.</Empty>}
      {shown?.map((d) => {
        const me = d.from === s.playerId, other = me ? d.toName : d.fromName, otherId = me ? d.to : d.from;
        const oc = cardOf(otherId), mc = cardOf(s.playerId);
        const saved = (s.duelResults || {})[d.id];
        const st = saved ? { ...duelState(d, s, oc), phase: "done", r: saved.r, mine: saved.mine, theirs: saved.theirs } : duelState(d, s, oc);
        const c = DUEL_CONDS[st.cond], fmtV = (v) => (v == null ? "?" : st.cond === "workouts" && (d.rule || 0) >= 1 ? (Math.round(Number(v) * 10) / 10).toFixed(1) : Number(v).toLocaleString());
        const expired = d.status === "pending" && Date.now() - (d.t || 0) > DUEL_PENDING_MS;
        const isOpen = openId === d.key;
        const word = expired ? ["Expired", C.mute]
          : d.status === "pending" ? (me ? ["Sent", C.dim] : ["Pending", C.cyan])
          : st.phase === "done" ? (st.r === "w" ? ["Won", C.gold] : st.r === "l" ? ["Lost", "#FF6B8F"] : ["Tied", C.dim])
          : st.phase === "live" ? [`Day ${st.day}/7`, C.cyan]
          : ["Waiting", C.dim];
        return (
          <div key={d.key} style={{ borderBottom: `1px solid rgba(255,255,255,.08)` }}>
            <button type="button" onClick={() => setOpenId(isOpen ? null : d.key)} aria-expanded={isOpen} className="w-full flex items-center gap-2 py-2.5 text-left">
              <span className="flex-1 min-w-0 truncate font-semibold text-sm">{other}{d.nemesis ? " 😈" : ""}</span>
              <span className="body text-xs shrink-0" style={{ color: C.dim }}>{st.w ? `${fmtShort(st.w.start)}–${fmtShort(st.w.end)}` : "—"}</span>
              <span className="body text-xs font-bold shrink-0" style={{ color: word[1] }}>{word[0]}</span>
              <ChevronDown size={14} className="shrink-0" style={{ color: C.mute, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .25s ease-out" }} />
            </button>
            <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
              <div style={{ overflow: "hidden", minHeight: 0, opacity: isOpen ? 1 : 0, transition: "opacity .22s ease-out" }}>
                {isOpen && (
                  <div className="pb-3 space-y-1.5">
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
                )}
              </div>
            </div>
          </div>
        );
      })}
      {duels?.length > 5 && !showAll && <button type="button" onClick={() => setShowAll(true)} className="ghost w-full py-2 mt-2 text-sm font-semibold">Show all {duels.length}</button>}
    </div>
  );
}

/* ---------- Dynamic warm-ups ---------- */

/* ---------- Muscle photos ---------- */

/* ---------- Chud King ---------- */
/* ---------- Boss illustrations (SVG, animated by CSS classes) ---------- */
// Every boss is drawn on a 120×120 canvas. Parts carry bs-* classes so they can breathe, flap, sway and glow.
// Swap-in: drop /public/bosses/<id>.webp (transparent, square) and BossArt uses it instead, with the same idle motion.
