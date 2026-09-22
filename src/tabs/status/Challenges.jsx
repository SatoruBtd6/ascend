import { Check, Trophy } from "lucide-react";
import { MONTHLY_POOL, MONTHLY_REPS, WEEKLY_POOL, WEEKLY_REPS } from "../../data/challenges.js";
import { monthKey, shift, weekStart } from "../../lib/dates.js";
import { fmtCredit, pickChallenges, rangeStats } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { Bar } from "../../ui/primitives.jsx";
export function ChallengeCard({ c, value, claimed, onClaim, color }) {
  const done = value >= c.target;
  const fmt = (v) => (c.unit === "workouts" ? fmtCredit(v) : c.unit === "lb" ? Math.round(v).toLocaleString() : c.unit === "mi" ? Math.round(v * 10) / 10 : Math.round(v));
  return (
    <div className="panel p-4" style={claimed ? { borderColor: "rgba(79,209,139,.55)" } : null}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex gap-3 items-center"><Trophy style={{ color }} /><div><div className="font-bold">{c.title}</div><div className="body text-sm" style={{ color: C.dim }}>{fmt(value)} / {c.unit === "workouts" ? c.target : fmt(c.target)} {c.unit}</div></div></div>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{c.xp.toLocaleString()} XP</span>
      </div>
      <div className="my-3"><Bar pct={(value / c.target) * 100} color={claimed ? C.green : color} /></div>
      {claimed ? <div className="text-sm font-semibold flex items-center gap-1" style={{ color: C.green }}><Check size={16} />Cleared</div> :
        <button disabled={!done} onClick={onClaim} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: done ? C.gold : C.soft, color: done ? "#0A1630" : C.mute, boxShadow: done ? "0 0 16px rgba(255,212,71,.5)" : "none" }}>Claim</button>}
    </div>
  );
}
export function Challenges({ s, setS, gainXp }) {
  const ws = weekStart(), we = shift(ws, 6), mk = monthKey(), mStart = `${mk}-01`, mEnd = `${mk}-31`;
  const wst = rangeStats(s, ws, we), mst = rangeStats(s, mStart, mEnd);
  const weekly = [...pickChallenges(WEEKLY_POOL, ws, 3), WEEKLY_REPS], monthly = [...pickChallenges(MONTHLY_POOL, mk, 3), MONTHLY_REPS];
  const wc = s.weekly?.[ws]; const wClaimed = wc === true ? { "w-train4": true } : (wc || {});
  const mClaimed = s.monthly?.[mk] || {};
  const claimW = (c) => { setS((p) => { const cur = p.weekly?.[ws]; const obj = cur === true ? { "w-train4": true } : (cur || {}); return { ...p, weekly: { ...(p.weekly || {}), [ws]: { ...obj, [c.id]: true } } }; }); gainXp(c.xp, `Weekly: ${c.title}`, `wk_${ws}_${c.id}`); };
  const claimM = (c) => { setS((p) => ({ ...p, monthly: { ...(p.monthly || {}), [mk]: { ...(p.monthly?.[mk] || {}), [c.id]: true } } })); gainXp(c.xp, `Monthly: ${c.title}`, `mo_${mk}_${c.id}`); };
  const monthName = new Date(mStart + "T12:00").toLocaleDateString(undefined, { month: "long" });
  return (
    <>
      {!s.settings?.creditSeen && (
        <div className="panel p-4 space-y-2" style={{ borderColor: C.cyan }}>
          <div className="body text-sm">Longer sessions count for a bit more. Runs and walks count as part of a workout based on how long they last.</div>
          <button type="button" onClick={() => setS((p) => ({ ...p, settings: { ...p.settings, creditSeen: true } }))} className="btn w-full py-2 text-sm">Got it</button>
        </div>
      )}
      <h2 className="text-lg font-bold pt-2">Weekly challenges <span className="body text-sm font-normal" style={{ color: C.dim }}>resets Sunday</span></h2>
      {weekly.map((c) => <ChallengeCard key={c.id} c={c} value={c.get(wst)} claimed={!!wClaimed[c.id]} onClaim={() => claimW(c)} color={C.orange} />)}
      <h2 className="text-lg font-bold pt-2">{monthName} challenges <span className="body text-sm font-normal" style={{ color: C.dim }}>big XP</span></h2>
      {monthly.map((c) => <ChallengeCard key={c.id} c={c} value={c.get(mst)} claimed={!!mClaimed[c.id]} onClaim={() => claimM(c)} color="#B14BFF" />)}
      <div className="body text-xs" style={{ color: C.mute }}>Weekly and monthly progress is tracked automatically from your workouts, quests, fuel goals, and weigh-ins. New ones roll in every week and month.</div>
    </>
  );
}

/* ---------- Photo meal scanner ---------- */
/* ---------- Built-in synth themes (original, no licensing) ---------- */
