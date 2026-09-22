import { RANKS } from "../../data/ranks.js";
export function RankChip({ rank, div, size = "xs" }) {
  const r = RANKS.find((x) => x.id === rank);
  if (!r) return null;
  return <span className={`ranklabel shrink-0 px-1.5 text-${size}`} style={{ borderRadius: 4, color: r.color, background: `${r.color}1F`, border: `1px solid ${r.color}66`, lineHeight: 1.5 }}>{r.id}{div ? ` ${div}` : ""}</span>;
}
