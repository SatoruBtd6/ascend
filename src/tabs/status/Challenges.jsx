import { Trophy } from "lucide-react";
import { MONTHLY_POOL, MONTHLY_REPS, WEEKLY_POOL, WEEKLY_REPS } from "../../data/challenges.js";
import { monthKey, shift, weekStart } from "../../lib/dates.js";
import { fmtCredit, pickChallenges, rangeStats } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { Bar, ClaimBtn } from "../../ui/primitives.jsx";
export function ChallengeCard({ c, value, claimed, onClaim, color, first }) {
  const done = value >= c.target;
  const fmt = (v) => (c.unit === "workouts" ? fmtCredit(v) : c.unit === "lb" ? Math.round(v).toLocaleString() : c.unit === "mi" ? Math.round(v * 10) / 10 : Math.round(v));
  return (
    <div className="flex gap-3" style={{ padding: "14px 0", borderTop: first ? "none" : "1px solid rgba(255,255,255,.08)" }}>
      <Trophy size={20} className="shrink-0" style={{ color, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div className="font-semibold" style={{ fontSize: 16, color: C.text }}>{c.title}</div>
          <span className="text-sm font-bold whitespace-nowrap" style={{ color: C.gold }}>+{c.xp.toLocaleString()} XP</span>
        </div>
        {claimed ? (
          <div className="body" style={{ fontSize: 14, color: C.mute, marginTop: 2 }}>Claimed · +{c.xp.toLocaleString()} XP</div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2" style={{ marginTop: 2, minHeight: done ? 32 : 0 }}>
              <div className="body" style={{ fontSize: 14, color: C.dim }}>{fmt(value)} / {c.unit === "workouts" ? c.target : fmt(c.target)} {c.unit}</div>
              {done && <ClaimBtn onClick={onClaim} />}
            </div>
            <div style={{ marginTop: 6 }}><Bar pct={(value / c.target) * 100} color={color} h={4} /></div>
          </>
        )}
      </div>
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
      {weekly.map((c, i) => <ChallengeCard key={c.id} c={c} value={c.get(wst)} claimed={!!wClaimed[c.id]} onClaim={() => claimW(c)} color={C.orange} first={i === 0} />)}
      <h2 className="text-lg font-bold pt-2">{monthName} challenges</h2>
      {monthly.map((c, i) => <ChallengeCard key={c.id} c={c} value={c.get(mst)} claimed={!!mClaimed[c.id]} onClaim={() => claimM(c)} color="#B14BFF" first={i === 0} />)}
    </>
  );
}

/* ---------- Photo meal scanner ---------- */
/* ---------- Built-in synth themes (original, no licensing) ---------- */
