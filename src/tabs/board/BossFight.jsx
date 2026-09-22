import { useEffect, useRef, useState } from "react";
import { AURAS } from "../../auras/catalog.js";
import { fmtDay, monthKey, today } from "../../lib/dates.js";
import { isWorkout, overallInfo } from "../../lib/stats.js";
import { RAID_NEED, raidActive, resolveWorldFirst } from "../../math.js";
import { C } from "../../theme.js";
import { FancyName } from "../profile/Avatar.jsx";
import { bossDamage, buffToday } from "../profile/bossDamage.js";
import { fmtClock } from "../train/beeper.js";
import { BOSSES, BOSS_XP, crewBossHp, globalBossHp } from "../train/bosses.js";
import { juice } from "../train/juice.js";
import { readRaid } from "../train/raidIO.js";
import { ReceiptButton, buildReceipt } from "../train/receipt.jsx";
import { liveBoard, readShared } from "../train/social.js";
import { BossArt } from "./bossArt.jsx";
import { loadCrewRoster, readCrew } from "./crewIO.js";
export function BossFight({ s, setS, gainXp, rows, openProfile, scope = "global", crewId = null }) {
  const mk = monthKey();
  const [crew, setCrew] = useState(null);
  const [roster, setRoster] = useState(null);
  useEffect(() => { if (crewId) readCrew(crewId).then(setCrew); }, [crewId]);
  useEffect(() => {
    if (scope !== "crew" || !crewId) { setRoster(null); return; }
    let stop = false;
    loadCrewRoster(crewId, s, rows).then((got) => { if (!stop) { setRoster(got.rows); if (got.rec) setCrew(got.rec); } }).catch(() => {});
    return () => { stop = true; };
  }, [scope, crewId, rows, s.playerId, s.crew?.since]);
  const mi = (parseInt(mk.slice(5, 7), 10) - 1) % BOSSES.length;
  const boss = scope === "crew" ? BOSSES[(mi + 6) % BOSSES.length] : BOSSES[mi];
  // Crew members are whoever's board card, crew record, or join key says they're in this crew
  const meRow = rows.find((r) => r.id === s.playerId) || { id: s.playerId, name: s.profile.name, look: s.profile.look };
  const crewRows = liveBoard(scope === "crew" ? (roster?.length ? roster : [meRow, ...rows.filter((r) => r.id !== s.playerId && r.crew?.code === crewId)]) : rows).filter((r) => !(s.test && r.id === s.playerId));
  const players = Math.max(1, crewRows.length);
  const hp = scope === "crew" ? crewBossHp(players) : globalBossHp(players);
  const sinceOf = (r) => (scope !== "crew" ? `${mk}-01` : r.id === s.playerId ? s.crew?.since || today() : r.crew?.since || today());
  const dmg = crewRows.map((r) => ({ r, d: bossDamage(r, mk, r.id === s.playerId ? s : null, sinceOf(r)) })).sort((a, b) => b.d - a.d);
  const total = dmg.reduce((a, x) => a + x.d, 0);
  const left = Math.max(0, hp - total), dead = left === 0, pct = left / hp;
  const mine = dmg.find((x) => x.r.id === s.playerId)?.d || 0;
  const claimed = s.loot?.claimed?.[`${mk}_${scope}`] || (scope === "global" && s.loot?.claimed?.[mk]);
  const [hit, setHit] = useState(false);
  const [raid, setRaid] = useState(null);
  const prev = useRef(total);
  // Kill recap: saved once, the first time you see the global boss dead with damage of your own on it
  useEffect(() => {
    if (scope !== "global" || !dead || mine <= 0) return;
    const key = `${mk}_global`;
    setS((p) => (p.bossRecaps?.[key] ? p : { ...p, bossRecaps: { ...(p.bossRecaps || {}), [key]: { boss: boss.id, name: boss.name, mk, mine, total, players, hp, t: Date.now(), seen: false } } }));
  }, [scope, dead, mine, total, players, hp, mk, boss.id]);
  // World First: claim the killing blow if the boss was still alive before my latest workout,
  // stamped with when that workout ended so every device resolves the same winner.
  const [worldFirst, setWorldFirst] = useState(null);
  useEffect(() => {
    if (scope !== "global" || !dead || mine <= 0 || s.test || s.wfClaim?.[mk] || !window.storage?.set) return;
    const mineW = (s.workouts || []).filter((w) => isWorkout(w) && w.date.startsWith(mk));
    const lastW = mineW[mineW.length - 1];
    if (!lastW) return;
    const before = bossDamage(meRow, mk, { ...s, workouts: (s.workouts || []).filter((w) => w.id !== lastW.id) }, sinceOf(meRow));
    if (total - (mine - before) >= hp) return;
    const t = lastW.startedAt ? lastW.startedAt + (lastW.minutes || 0) * 60000 : Date.now();
    (async () => {
      try {
        await window.storage.set(`wfclaim:${mk}:${s.playerId}`, JSON.stringify({ id: s.playerId, name: s.profile.name, t, boss: boss.id }), true);
        setS((p) => ({ ...p, wfClaim: { ...(p.wfClaim || {}), [mk]: true } }));
      } catch { /* offline, try again next open */ }
    })();
  }, [scope, dead, mine, total, hp, mk]);
  useEffect(() => {
    if (scope !== "global" || !window.storage?.list) return;
    let stop = false;
    const pull = async () => {
      try {
        const win = resolveWorldFirst(await readShared(`wfclaim:${mk}:`));
        if (stop) return;
        setWorldFirst(win);
        if (win && win.id === s.playerId) setS((p) => (p.worldFirsts?.[mk] ? p : { ...p, worldFirsts: { ...(p.worldFirsts || {}), [mk]: boss.id } }));
      } catch { /* offline */ }
    };
    pull();
    const id = setInterval(pull, 30000);
    return () => { stop = true; clearInterval(id); };
  }, [scope, mk, dead, s.wfClaim?.[mk]]);
  useEffect(() => { if (total > prev.current) { setHit(true); const t = setTimeout(() => setHit(false), 500); prev.current = total; return () => clearTimeout(t); } prev.current = total; }, [total]);
  useEffect(() => {
    if (scope !== "crew" || !crewId) { setRaid(null); return; }
    let stop = false;
    const pull = async () => { try { const r = await readRaid(crewId); if (!stop) setRaid(r); } catch { /* */ } };
    pull();
    const id = setInterval(pull, 8000);
    return () => { stop = true; clearInterval(id); };
  }, [scope, crewId]);
  const monthName = new Date(`${mk}-01T12:00`).toLocaleDateString(undefined, { month: "long" });
  const claim = () => {
    setS((p) => ({ ...p, loot: { ...(p.loot || {}), bosses: [...new Set([...(p.loot?.bosses || []), boss.id])], claimed: { ...(p.loot?.claimed || {}), [`${mk}_${scope}`]: true } } }));
    gainXp(BOSS_XP, `Defeated ${boss.name}`, `boss_${mk}_${boss.id}${crewId ? `_${crewId}` : ""}`); juice("pr");
  };
  return (
    <div className="panel p-5 space-y-4 overflow-hidden" style={{ borderColor: `${boss.color}55` }}>
      <div className="relative -mx-5 -mt-5 px-5 pt-4 pb-1 flex flex-col items-center text-center" style={{ background: dead ? "none" : `radial-gradient(70% 75% at 50% 48%, ${pct <= 0.5 ? "rgba(255,45,45,.16)" : `${boss.color}22`}, transparent 72%)` }}>
        <div className="flex items-center gap-2">
          <span className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>{scope === "crew" ? `${crew?.name || "Crew"} boss` : `Global boss · ${monthName}`}</span>
          {pct <= 0.5 && !dead && <span className="text-xs font-extrabold px-2" style={{ borderRadius: 999, color: "#fff", background: "#D61F3A", boxShadow: "0 0 12px rgba(255,45,45,.6)", animation: "aurapulse 1.1s ease-in-out infinite" }}>Enraged</span>}
        </div>
        <div className="relative mt-2" style={{ width: 156, height: 156 }}>
          <div aria-hidden="true" style={{ position: "absolute", left: "12%", right: "12%", bottom: 2, height: 14, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,.55), transparent)" }} />
          <BossArt boss={boss} pct={pct} dead={dead} hit={hit} size={156} />
        </div>
        <div className="text-xl font-bold mt-1" style={{ color: dead ? C.dim : C.text, textDecoration: dead ? "line-through" : "none" }}>{boss.name}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{boss.tag}</div>
        {scope === "global" && worldFirst && <div className="body text-xs font-semibold mt-1" style={{ color: "#C2001F" }}>World First · {worldFirst.id === s.playerId ? "you" : worldFirst.name} landed the killing blow</div>}
      </div>
      <div>
        <div className="h-4 overflow-hidden relative" style={{ borderRadius: 999, background: "rgba(255,255,255,.08)", boxShadow: pct <= 0.5 && !dead ? "0 0 14px rgba(255,45,45,.5)" : "none" }}>
          <div className="h-full" style={{ width: `${(left / hp) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, #FF2D6F, ${boss.color})`, transition: "width .8s cubic-bezier(.2,.8,.2,1)", boxShadow: `0 0 14px ${boss.color}` }} />
        </div>
        <div className="flex justify-between body text-xs mt-1.5" style={{ color: C.dim }}><span>{dead ? "Defeated" : `${left.toLocaleString()} HP left`}</span><span>{hp.toLocaleString()} HP</span></div>
      </div>
      {scope === "crew" && raidActive(raid) && (
        <div className="body text-xs font-bold flex justify-between" style={{ color: C.orange }}>
          <span>Raid night live · {fmtClock(Math.max(0, Math.ceil((raid.end - Date.now()) / 1000)))}</span>
          <span>{Object.keys(raid.hits || {}).length}/{RAID_NEED} logged{raid.cleared ? " · cleared" : ""}</span>
        </div>
      )}
      <div className="body text-xs" style={{ color: C.dim }}>{scope === "crew" ? `Crew HP is ${hp.toLocaleString()} for ${players} member${players === 1 ? "" : "s"} (same formula as the global boss: 150k + 150k per person). Only damage after you joined counts (joined ${fmtDay(s.crew?.since || today())}).` : `Scaled to the ${players} player${players === 1 ? "" : "s"} in the season (${hp.toLocaleString()} HP).`} Every pound lifted is 1 damage, every rep is 5, and every cardio mile is 800. Logging 8h sleep and a good mood adds up to a 1.1× multiplier today (yours: {buffToday(s)}×). Loot: the {AURAS.find((a) => a.loot === boss.id)?.name} aura, the {boss.title} title, the Bone crown border, and {BOSS_XP} XP for everyone who hit it.</div>
      {dmg.filter((x) => x.d > 0).length > 0 && (
        <div className="space-y-1.5">
          {dmg.filter((x) => x.d > 0).map(({ r, d }) => (
            <button key={r.key || r.id} onClick={() => openProfile(r.id)} className="w-full flex items-center gap-2 text-sm">
              <span className="flex-1 text-left truncate"><FancyName name={r.name} look={r.look} /></span>
              <span className="body text-xs" style={{ color: C.dim }}>{Math.round((d / Math.max(1, total)) * 100)}%</span>
              <span className="font-semibold tabular-nums">{d.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}
      {dead && mine > 0 && !claimed && <button onClick={claim} className="btn w-full py-3">Claim loot</button>}
      {claimed && <div className="body text-sm text-center" style={{ color: C.green }}>Loot claimed. Equip it in Profile → Customize.</div>}
      {dead && mine === 0 && <div className="body text-xs text-center" style={{ color: C.dim }}>Log a workout this month to earn a share of the loot.</div>}
      {scope === "global" && <PastKills s={s} />}
    </div>
  );
}
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

/* ---------- Seasons ---------- */
