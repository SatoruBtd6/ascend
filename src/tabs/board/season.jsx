import { C } from "../../theme.js";
import { AuraCanvas } from "../../auras/AuraCanvas.jsx";
import { auraById } from "../../auras/catalog.js";
import { monthKey, nextMonthStart, nextSeasonStart, prevSeasonKey, seasonKey, seasonXp } from "../profile/season.js";
export async function settleSeason(s, setS, rows) {
  const last = prevSeasonKey(seasonKey());
  let rec = null;
  try { const r = await window.storage.get(`season:${last}`, true); rec = r?.value ? JSON.parse(r.value) : null; } catch (e) { rec = null; }
  if (!rec) {
    const ranked = rows.filter((r) => r.prevSeason?.key === last && r.prevSeason.xp > 0).sort((a, b) => b.prevSeason.xp - a.prevSeason.xp).slice(0, 3);
    if (!ranked.length) return;
    rec = { key: last, winners: ranked.map((r, i) => ({ id: r.id, name: r.name, xp: r.prevSeason.xp, place: i + 1 })), t: Date.now() };
    try { await window.storage.set(`season:${last}`, JSON.stringify(rec), true); } catch (e) { /* someone else already wrote it */ }
  }
  const mine = rec.winners?.find((w) => w.id === s.playerId);
  if (mine && !s.seasonBadges?.[last]) setS((p) => ({ ...p, seasonBadges: { ...(p.seasonBadges || {}), [last]: { place: mine.place, xp: mine.xp } } }));
}
export function applyReigning(s, setS, rows) {
  const sk = seasonKey();
  const xpOf = (r) => (r?.season?.key === sk ? r.season.xp : 0) || 0;
  const mine = seasonXp(s, sk);
  const myId = s.playerId;
  const bestOther = (rows || []).filter((r) => (r.id || (r.key || "").slice(3)) !== myId).reduce((m, r) => Math.max(m, xpOf(r)), 0);
  const on = !!s.lb && !s.test && mine > 0 && mine > bestOther;
  // Ascended is a permanent award now — holding it no longer rides on #1, and
  // losing #1 must never unequip it. The aura swap was the only runtime strip
  // path; it is gone on purpose (phase 7o Part A). lbReigning still updates
  // for the Reigning title and board highlights.
  setS((p) => (!!p.lbReigning === on ? p : { ...p, lbReigning: on }));
}
export function SeasonBanner() {
  const key = seasonKey();
  const days = Math.max(0, Math.ceil((new Date(nextSeasonStart(key) + "T00:00") - new Date()) / 86400000));
  return (
    <div className="panel px-4 py-3 flex items-center justify-between">
      <div><div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>Season {key.split("-S")[1]} · {key.slice(0, 4)}</div><div className="text-sm font-semibold">Finish the season #1 to keep the Ophanim border.</div></div>
      <div className="text-right"><div className="text-xl font-bold tabular-nums">{days}</div><div className="body text-xs" style={{ color: C.dim }}>days left</div></div>
    </div>
  );
}
// Monthly prize banner — two columns, borderless surface. Variant A is the
// spec build: preview on the left, three stacked text lines on the right, the
// aura is the only colour. Variant B is the earlier labelled layout, kept for
// Brodan's phone pass at ?prize=1. The preview mounts Descended at clock0=6s
// so it opens inside the spin-up surge, then loops the normal 45s cycle —
// painter timeline untouched.
export function PrizeBanner({ variant = "a" }) {
  const mk = monthKey();
  const monthName = new Date(mk + "-15T12:00").toLocaleDateString(undefined, { month: "long" });
  const days = Math.max(0, Math.ceil((new Date(nextMonthStart(mk) + "T00:00") - new Date()) / 86400000));
  const preview = (
    <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
      <AuraCanvas aura="descended" w={120} h={120} clock0={6} />
    </div>
  );
  if (variant === "b") {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: C.soft, borderRadius: 10 }}>
        <div className="min-w-0">
          <div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>{monthName} prize · monthly</div>
          <div className="text-lg font-extrabold" style={{ color: C.red }}>Descended</div>
          <div className="body text-sm" style={{ color: C.sub }}>#1 on the month board takes it — awarded once, kept forever.</div>
        </div>
        <div className="shrink-0 text-center">
          {preview}
          <div className="body text-xs font-bold tabular-nums" style={{ color: C.dim }}>{days} days left</div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-3 py-2" style={{ background: C.soft, borderRadius: 10 }}>
      {preview}
      <div className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="font-extrabold" style={{ fontSize: 22, lineHeight: 1.15, color: C.text }}>{auraById("descended").name}</div>
        <div className="body" style={{ fontSize: 15, lineHeight: 1.3, color: C.dim }}>#1 wears it. Finish the month 1st to keep it forever.</div>
        <div className="body tabular-nums" style={{ fontSize: 13, lineHeight: 1.3, color: C.mute }}>{days === 1 ? `1 day left in ${monthName}` : `${days} days left in ${monthName}`}</div>
      </div>
    </div>
  );
}
// DEV-only side-by-side for ?prize=1 — variants A and B at phone width.
export function DevPrizeBanner() {
  return (
    <div style={{ maxWidth: 390, margin: "24px auto", padding: 12 }}>
      <div className="body text-xs uppercase tracking-wider" style={{ color: C.mute, marginBottom: 6 }}>variant A — spec</div>
      <PrizeBanner />
      <div className="body text-xs uppercase tracking-wider" style={{ color: C.mute, margin: "18px 0 6px" }}>variant B — labelled</div>
      <PrizeBanner variant="b" />
    </div>
  );
}
