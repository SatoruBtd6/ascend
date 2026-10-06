import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { C } from "../../theme.js";
import { AuraCanvas } from "../../auras/AuraCanvas.jsx";
import { auraById } from "../../auras/catalog.js";
import { loanStripAura, monthlyPrizeId, monthKey, monthXp, nextMonthStart, prevSeasonKey, seasonKey } from "../profile/season.js";
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
// Reigning rides the monthly cycle (phase 7p): the quarterly season is
// retired, so the live #1 is the top of the month board.
export function applyReigning(s, setS, rows) {
  const mk = monthKey();
  const xpOf = (r) => (r?.month?.key === mk ? r.month.xp : 0) || 0;
  const mine = monthXp(s, mk);
  const myId = s.playerId;
  const bestOther = (rows || []).filter((r) => (r.id || (r.key || "").slice(3)) !== myId).reduce((m, r) => Math.max(m, xpOf(r)), 0);
  const on = !!s.lb && !s.test && mine > 0 && mine > bestOther;
  // The monthly prize rides on #1 (phase 7p loan): an unstamped wearer who
  // drops off the top reverts to auraPrev, and whoever takes #1 unlocks it
  // instead. Stamped owners are never touched — the stamp always wins. This
  // is the pre-7o aura-swap strip resurrected with the stamp check the old
  // version lacked (that missing check is what stripped Finn's Ascended).
  setS((p) => {
    const look = { ...(p.profile.look || {}) };
    let changed = !!p.lbReigning !== on;
    const stripped = p.test ? null : loanStripAura(look, p.auraUnlocks, on, mk);
    if (stripped) { look.aura = stripped; changed = true; }
    if (!changed) return p;
    return { ...p, lbReigning: on, profile: { ...p.profile, look } };
  });
}
// Monthly prize banner — two columns, borderless surface. Variant A is the
// spec build: preview on the left, three stacked text lines on the right, the
// aura is the only colour. Variant B is the earlier labelled layout, kept for
// Brodan's phone pass at ?prize=1. The prize aura comes from MONTHLY_PRIZE —
// a month with no entry renders no banner. The preview mounts the prize at
// clock0=6s so it opens inside the spin-up surge, plays through the arrest
// and eye launch (landing around t=17s mid-watch — eyes over the avatar make
// a good still), then freezes so the podium #1 aura is the only one running
// on the board (phase 7p sequential handoff — the two never animate at once).
export function PrizeBanner({ variant = "a" }) {
  const mk = monthKey();
  const prize = auraById(monthlyPrizeId(mk));
  const monthName = new Date(mk + "-15T12:00").toLocaleDateString(undefined, { month: "long" });
  const days = Math.max(0, Math.ceil((new Date(nextMonthStart(mk) + "T00:00") - new Date()) / 86400000));
  if (!prize) return null;
  // The canvas stays at its approved 120px render size (the painter's small
  // gate switches art below ~110px); it is only DISPLAYED at 56px via a
  // transform, so the animation, glow and 11s freeze are untouched.
  const preview = (size = 120) => (
    <div className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      <div style={{ width: 120, height: 120, transform: `scale(${size / 120})`, transformOrigin: "top left" }}>
        <AuraCanvas aura={prize.id} w={120} h={120} clock0={6} freezeAfter={11000} />
      </div>
    </div>
  );
  if (variant === "b") {
    return (
      <div className="flex items-center justify-between gap-3 px-3 py-2" style={{ background: C.soft, borderRadius: 10 }}>
        <div className="min-w-0">
          <div className="body text-xs uppercase tracking-wider font-semibold" style={{ color: C.dim }}>{monthName} prize · monthly</div>
          <div className="text-lg font-extrabold" style={{ color: C.red }}>{prize.name}</div>
          <div className="body text-sm" style={{ color: C.sub }}>#1 on the month board takes it — awarded once, kept forever.</div>
        </div>
        <div className="shrink-0 text-center">
          {preview(120)}
          <div className="body text-xs font-bold tabular-nums" style={{ color: C.dim }}>{days} days left</div>
        </div>
      </div>
    );
  }
  return <PrizeRow preview={preview(56)} name={prize.name} days={days} monthName={monthName} />;
}
// Compact prize row (phase 7q): 56px aura thumb + name + days left, tap to
// expand the explanation. Collapsed children unmount after the animation,
// same as Disclosure.
function PrizeRow({ preview, name, days, monthName }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), 260);
    return () => clearTimeout(t);
  }, [open]);
  return (
    <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`${name} — this month's prize`} className="w-full flex items-center gap-3 text-left" style={{ padding: "8px 0", minHeight: 72 }}>
        {preview}
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate" style={{ fontSize: 17, color: C.text }}>{name}</div>
          <div className="body tabular-nums truncate" style={{ fontSize: 14, color: C.mute }}>{days === 1 ? `1 day left in ${monthName}` : `${days} days left in ${monthName}`}</div>
        </div>
        <ChevronRight size={18} className="shrink-0" style={{ color: C.mute, transform: open ? "rotate(90deg)" : "none", transition: "transform .25s ease-out" }} />
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
        <div style={{ overflow: "hidden", minHeight: 0, opacity: open ? 1 : 0, transition: "opacity .22s ease-out" }}>
          {mounted ? <div className="body pb-3" style={{ fontSize: 14, color: C.dim }}>#1 wears it. Finish the month 1st to keep it forever.</div> : null}
        </div>
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
