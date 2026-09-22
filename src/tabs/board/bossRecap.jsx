import { useState } from "react";
import { AURAS } from "../../auras/catalog.js";
import { overallInfo } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { BOSSES, BOSS_XP } from "../train/bosses.js";
import { ReceiptButton, buildReceipt } from "../train/receipt.jsx";
import { BossArt } from "./bossArt.jsx";

// Everything you earned from a boss you helped kill, in one card you can also share
export const recapLoot = (bossId) => {
  const b = BOSSES.find((x) => x.id === bossId);
  return b ? [AURAS.find((a) => a.loot === b.id)?.name, b.title, "Bone crown"].filter(Boolean) : [];
};
export const recapShare = (rec) => Math.round((rec.mine / Math.max(1, rec.total)) * 100);
export function BossRecapCard({ s, rec, onDismiss }) {
  const boss = BOSSES.find((b) => b.id === rec.boss);
  const monthName = new Date(`${rec.mk}-01T12:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (!boss) return null;
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: `${boss.color}66` }}>
      <div className="flex items-center gap-3">
        <BossArt boss={boss} pct={0} dead size={56} />
        <div className="flex-1 min-w-0">
          <div className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>{monthName} · boss defeated</div>
          <div className="text-lg font-bold truncate" style={{ color: boss.color }}>{boss.name}</div>
          <div className="body text-xs" style={{ color: C.sub }}>{rec.mine.toLocaleString()} damage · {recapShare(rec)}% of the kill</div>
        </div>
      </div>
      <div className="body text-xs" style={{ color: C.dim }}>Loot: {recapLoot(rec.boss).join(", ")}, and {BOSS_XP} XP.</div>
      <div className="flex gap-2">
        {onDismiss && <button onClick={onDismiss} className="ghost flex-1 py-2 text-sm font-bold">Nice</button>}
        <ReceiptButton label="Share card" make={() => buildReceipt({ s, kind: "Boss defeated", headline: boss.name, sub: monthName, tierImg: Math.floor(overallInfo(s).score), rows: [["Your damage", rec.mine.toLocaleString()], ["Share of the kill", `${recapShare(rec)}%`], ["Fighters", rec.players], ["Loot", recapLoot(rec.boss)[0] || "—"]] })} />
      </div>
    </div>
  );
}
export function PastKills({ s }) {
  const [open, setOpen] = useState(false);
  const list = Object.entries(s.bossRecaps || {}).filter(([k]) => k.endsWith("_global")).map(([, v]) => v).sort((a, b) => (a.mk < b.mk ? 1 : -1));
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      <button onClick={() => setOpen(!open)} className="body text-xs underline" style={{ color: C.cyan }}>{open ? "Hide" : `Past kills (${list.length})`}</button>
      {open && list.map((rec) => <BossRecapCard key={rec.mk} s={s} rec={rec} />)}
    </div>
  );
}
// First app open after the kill: show the recap once, then it lives under the boss
export function BossRecapBanner({ s, setS }) {
  const entry = Object.entries(s.bossRecaps || {}).find(([k, v]) => k.endsWith("_global") && !v.seen);
  if (!entry) return null;
  const [key, rec] = entry;
  const seen = () => setS((p) => ({ ...p, bossRecaps: { ...(p.bossRecaps || {}), [key]: { ...p.bossRecaps[key], seen: true } } }));
  return <BossRecapCard s={s} rec={rec} onDismiss={seen} />;
}
