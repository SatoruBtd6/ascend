import { C } from "../../theme.js";
import { RankBadge } from "../train/RankBadge.jsx";

// Compact ranked-lift row: ~56px, no card, hairline-separated, with the
// progress bar as a 3px strip along the row's bottom edge. Shared by the
// Status "All lifts" disclosure and the muscle-group drill-down.
export function LiftRow({ x, first, onOpen }) {
  const { e, best, rank, label, pct, next, nextLabel } = x;
  const unit = e.type === "bodyweight" ? " reps" : " lb";
  return (
    <button onClick={() => onOpen?.(e.name)} className="w-full text-left relative" style={{ minHeight: 56, borderTop: first ? "none" : "1px solid rgba(255,255,255,.08)" }}>
      <div className="flex items-center gap-3" style={{ padding: "7px 2px 10px" }}>
        <RankBadge rank={rank} size={28} />
        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold" style={{ fontSize: 15, color: C.text }}>{e.name}</div>
          <div className="body truncate mt-0.5" style={{ fontSize: 13, color: C.mute }}>Best {Math.round(best)}{e.type === "bodyweight" ? " reps" : " lb"} · {next ? `${nextLabel} at ${next}${unit}` : "Maxed out"}</div>
        </div>
        <span className="ranklabel font-bold shrink-0" style={{ fontSize: 15, color: rank.color }}>{label}</span>
      </div>
      <div style={{ position: "absolute", left: 2, right: 2, bottom: 2, height: 3, borderRadius: 2, background: `${rank.color}22` }}>
        <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: rank.color, borderRadius: 2 }} />
      </div>
    </button>
  );
}
