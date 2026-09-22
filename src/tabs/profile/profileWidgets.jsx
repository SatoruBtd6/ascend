import { Swords } from "lucide-react";
import { RANKS } from "../../data/ranks.js";
import { C } from "../../theme.js";
import { isMutualNemesis } from "../board/duels.js";
import { DuelButton, RivalryButton } from "../board/Duels.jsx";
import { MogSection } from "./Mog.jsx";
import { profileCard } from "./profileCard.js";
import { VersusSide } from "./VersusSide.jsx";
export function VersusPanel({ s, data, me, id, setS, gainXp }) {
  const mine = profileCard(s);
  const them = data;
  const mr = RANKS.find((r) => r.id === mine.rank) || RANKS[0], tr = RANKS.find((r) => r.id === them.rank) || RANKS[0];
  const row = (label, a, b, fmt = (v) => v) => {
    const av = a ?? 0, bv = b ?? 0;
    return <div key={label} className="grid items-center text-sm" style={{ gridTemplateColumns: "1fr auto 1fr" }}><span className="text-right font-bold" style={{ color: av > bv ? C.green : av < bv ? C.dim : C.text }}>{fmt(av)}</span><span className="body text-xs px-3" style={{ color: C.mute }}>{label}</span><span className="font-bold" style={{ color: bv > av ? C.green : bv < av ? C.dim : C.text }}>{fmt(bv)}</span></div>;
  };
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: "#FF2D6F" }}>
      <div className="flex items-center justify-between"><div className="font-bold flex items-center gap-2"><Swords size={18} style={{ color: "#FF2D6F" }} />Versus</div><span className="body text-xs" style={{ color: C.dim }}>duels & mog-offs</span></div>
      <div className="flex items-center gap-2">
        <VersusSide c={mine} r={mr} />
        <div className="text-3xl font-extrabold shrink-0" style={{ color: "#FF2D6F", textShadow: "0 0 14px rgba(255,45,111,.7)", fontFamily: "'Cinzel', serif" }}>VS</div>
        <VersusSide c={them} r={tr} />
      </div>
      <div className="space-y-1 py-2" style={{ borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
        {row("level", mine.lvl, them.lvl)}
        {row("points", mine.points, them.points, (v) => v.toLocaleString())}
        {row("streak", mine.streak, them.streak, (v) => `${v}d`)}
        {row("XP this week", mine.weekXp, them.weekOf === mine.weekOf ? them.weekXp : 0, (v) => v.toLocaleString())}
        {row("workouts", mine.stats?.workouts, them.stats?.workouts)}
      </div>
      <RivalryButton s={s} setS={setS} them={{ ...them, id }} />
      <DuelButton s={s} targetId={id} targetName={them.name} targetUid={them.uid} nemesis={isMutualNemesis(s, { ...them, id })} />
      <MogSection s={s} setS={setS} gainXp={gainXp} me={me} targetId={id} targetName={them.name} targetUid={them.uid} embedded />
    </div>
  );
}


export const MEDAL = ["", "🥇", "🥈", "🥉"];
export function SeasonBadges({ badges }) {
  const list = Object.entries(badges || {}).sort(([a], [b]) => (a < b ? 1 : -1));
  if (!list.length) return null;
  return <div className="flex gap-2 flex-wrap">{list.map(([k, b]) => <span key={k} className="px-2.5 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: "rgba(255,212,71,.12)", border: "1px solid rgba(255,212,71,.35)", color: "#FFD447" }}>{MEDAL[b.place]} {k.replace("-S", " S")}</span>)}</div>;
}

/* ---------- PVP: 7-day duels + mutual Nemesis ---------- */
export function RivalBadge({ wins, size = "sm" }) {
  if (!wins) return null;
  return (
    <span title={`Beat their Nemesis ${wins} time${wins === 1 ? "" : "s"}`} className={`inline-flex items-center gap-1 font-bold shrink-0 ${size === "sm" ? "text-xs px-1.5" : "text-sm px-2 py-0.5"}`} style={{ borderRadius: 999, color: "#FFD9DF", background: "linear-gradient(135deg,#7A0019,#FF1F4B)", border: "1px solid #FF6B8F", boxShadow: "0 0 10px rgba(255,31,75,.45)" }}>
      <Swords size={size === "sm" ? 11 : 13} />Rivalbreaker{wins > 1 ? ` ×${wins}` : ""}
    </span>
  );
}

export function CrewBanner({ count = 1, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5" style={{ borderRadius: 999, border: `1px solid ${C.cyan}66`, background: "rgba(56,198,255,.12)" }}>
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 1h10v11l-5-3-5 3z" fill={C.cyan} opacity="0.85" />
        <path d="M3 1h10v11l-5-3-5 3z" fill="none" stroke={C.cyan} strokeWidth="1" />
      </svg>
      <span className="body text-xs font-bold" style={{ color: C.cyan }}>Crew banner{count > 1 ? ` ×${count}` : ""}</span>
    </span>
  );
}
// Shared weekly quests for the crew. Pooled across members, targets scale with headcount,
// and none of it touches boss HP or boss damage.
