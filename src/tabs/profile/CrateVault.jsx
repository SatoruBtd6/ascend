import { useState } from "react";
import { Check, ChevronRight, Crown, Loader2, Lock, Sparkles } from "lucide-react";
import { AuraCanvas } from "../../auras/AuraCanvas.jsx";
import { today } from "../../lib/dates.js";
import { ANIME_PITY_AT, ANIME_RARITY_ORDER } from "../../math.js";
import { C } from "../../theme.js";
import { SFX } from "../train/sfx.js";
import { XpSync } from "../../lib/xpSync.js";
import { AnimatedBorder } from "./Avatar.jsx";
import { ACTIVE_CRATE, CRATE_RARITY, CRATE_RARITY_DESC, applyCratePrize, commitCratePrize, crateOwned, cratePityOf, packCratePrize, rollCratePrize, secureRandom } from "./crate.js";
import { Groove, Jingle } from "./music.js";
import { crateAuraBest, crateBank } from "./points.js";
import { BORDERS } from "./unlock.js";
export function CrateTeaser({ s, onOpen }) {
  const crate = ACTIVE_CRATE;
  const bank = crateBank(s);
  return (
    <button type="button" onClick={onOpen} className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 text-left" style={{ borderRadius: 12, background: "linear-gradient(90deg, rgba(106,0,255,.18), rgba(255,212,71,.1))", border: `1px solid ${C.gold}55`, animation: "cratepulse 2.8s ease-in-out infinite" }}>
      <Crown size={18} style={{ color: C.gold }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{crate.name}</span>
        <span className="block body text-xs" style={{ color: C.dim }}>{s.test ? "Ghost sandbox · unlimited opens" : `${bank.toLocaleString()} pts ready · ${crate.cost} per open`}</span>
      </span>
      <ChevronRight size={16} style={{ color: C.gold }} />
    </button>
  );
}
export function CrateVault({ s, setS }) {
  const crate = ACTIVE_CRATE;
  const sandbox = !!s.test;
  const bank = crateBank(s);
  const pity = cratePityOf(s, sandbox);
  const log = sandbox ? (s.testCrate?.log || []) : (s.crateLog || []);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(null);
  const [typeTab, setTypeTab] = useState("aura");
  const [secretToast, setSecretToast] = useState(false);
  const [forceRarity, setForceRarity] = useState("");
  const [forcePrizeId, setForcePrizeId] = useState("");
  const [previewLook, setPreviewLook] = useState(null);
  const openOnce = (n = 1) => {
    if (busy) return;
    if (!sandbox && bank < crate.cost) return;
    setBusy(true);
    const forcePrize = forcePrizeId ? crate.prizes.find((x) => x.id === forcePrizeId) : null;
    const forceR = forceRarity || undefined;
    setForceRarity("");
    setForcePrizeId("");
    let cursor = s;
    const rolls = [];
    for (let i = 0; i < n; i++) {
      const prize = rollCratePrize(cursor, crate, secureRandom, { sandbox, pity: cratePityOf(cursor, sandbox), forceRarity: i === 0 ? forceR : undefined, forcePrize: i === 0 ? forcePrize : null });
      const rollId = `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
      rolls.push({ prize, rollId });
      cursor = sandbox ? commitCratePrize(cursor, prize, crate, rollId, { sandbox: true, equip: false }) : applyCratePrize(cursor, prize, crate, rollId);
    }
    const last = rolls[rolls.length - 1];
    const packed = { ...last.prize, ...packCratePrize(s, last.prize), sandbox };
    const secret = last.prize.rarity === "secret";
    if (secret) {
      document.documentElement.classList.add("black-sun-pull");
      Groove.stop(); Jingle.stop();
    }
    setTimeout(() => {
      setS((p) => {
        let next = p;
        rolls.forEach(({ prize, rollId }) => { next = sandbox ? commitCratePrize(next, prize, crate, rollId, { sandbox: true, equip: false }) : applyCratePrize(next, prize, crate, rollId); });
        return next;
      });
      setShow(packed);
      setBusy(false);
      document.documentElement.classList.remove("black-sun-pull");
      if (secret) {
        setSecretToast(true); setTimeout(() => setSecretToast(false), 4200);
        if (!sandbox) XpSync.add({ e: `crate_secret_${last.rollId}`, a: 0, m: "Anime Crate: Black Sun", d: today(), t: Date.now() });
      }
      if (["secret", "gilded", "mythic", "legendary"].includes(last.prize.rarity)) SFX.levelUp();
      else if (last.prize.rarity === "epic") SFX.achievement();
      else SFX.click();
    }, secret ? 800 : 900);
  };
  const roll = () => openOnce(1);
  const meta = show && CRATE_RARITY[show.rarity];
  const visible = crate.prizes.filter((p) => p.type === typeTab && (p.rarity !== "secret" || s.test || crateOwned(s, p) || show?.id === p.id)).sort((a, b) => CRATE_RARITY_DESC.indexOf(a.rarity) - CRATE_RARITY_DESC.indexOf(b.rarity));
  const secretLocked = typeTab === "aura" && !s.test && !s.crateUnlocks?.blacksun && show?.id !== "blacksun";
  const canOpen = sandbox || bank >= crate.cost;
  return (
    <>
    <div className="panel overflow-hidden" style={{ borderColor: `${crate.theme.gold}44` }}>
      <div className="px-4 pt-4 pb-3 space-y-1" style={{ background: "radial-gradient(80% 90% at 50% 0%, rgba(106,0,255,.28), transparent 70%)" }}>
        <div className="body text-xs uppercase tracking-wider font-bold" style={{ color: C.gold }}>{crate.tag}{sandbox ? " · sandbox" : ""}</div>
        <div className="text-xl font-bold">{crate.name}</div>
        <div className="body text-xs" style={{ color: C.dim }}>{sandbox ? "Ghost sandbox. Opens are free and do not save unlocks, points, or pity on your real account." : crate.blurb}</div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="body text-sm" style={{ color: C.dim }}>Board points</span>
          <span className="text-lg font-bold tabular-nums" style={{ color: sandbox || bank >= crate.cost ? C.gold : C.mute }}>{sandbox ? "Unlimited" : bank.toLocaleString()}</span>
        </div>
        {!sandbox && crateAuraBest(s) && <div className="body text-xs" style={{ color: C.gold }}>{crateAuraBest(s).name} · +{Math.round(crateAuraBest(s).ptsMult * 100)}% on all points</div>}
        <button type="button" disabled={busy || !canOpen} onClick={roll} className="btn w-full py-3 flex items-center justify-center gap-2" style={{ opacity: canOpen ? 1 : 0.5 }}>
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {busy ? "Opening…" : sandbox ? "Open · free" : `Open · ${crate.cost} pts`}
        </button>
        {!sandbox && bank < crate.cost && <div className="body text-xs text-center" style={{ color: C.mute }}>Need {(crate.cost - bank).toLocaleString()} more points.</div>}
        {sandbox && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => openOnce(10)} className="ghost py-2 text-sm font-bold">Open ×10</button>
              <button type="button" disabled={busy} onClick={() => setS((p) => ({ ...p, testCrate: { pity: 0, log: [] } }))} className="ghost py-2 text-sm font-bold">Reset sandbox</button>
            </div>
            <label className="body text-xs block" style={{ color: C.dim }}>Force rarity
              <select className="inp mt-1" value={forceRarity} onChange={(e) => { setForceRarity(e.target.value); if (e.target.value) setForcePrizeId(""); }} aria-label="Force rarity">
                <option value="">RNG</option>
                {ANIME_RARITY_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="body text-xs block" style={{ color: C.dim }}>Force prize
              <select className="inp mt-1" value={forcePrizeId} onChange={(e) => { setForcePrizeId(e.target.value); if (e.target.value) setForceRarity(""); }} aria-label="Force prize">
                <option value="">RNG</option>
                {crate.prizes.map((p) => <option key={p.id} value={p.id}>{p.rarity} · {p.name}</option>)}
              </select>
            </label>
          </div>
        )}
        <div className="px-2.5 py-2" style={{ borderRadius: 10, background: C.glass, border: `1px solid ${C.glassLine}` }}>
          <div className="body text-xs flex justify-between" style={{ color: C.mute }}><span>Legendary+ pity{sandbox ? " (sandbox)" : ""}</span><span>Secret stays 1/1000</span></div>
          <div className="text-sm font-bold tabular-nums">{Math.min(ANIME_PITY_AT - 1, pity)} / {ANIME_PITY_AT - 1} misses</div>
        </div>
        <div className="grid grid-cols-3 gap-1">{[["aura", "Auras"], ["title", "Titles"], ["border", "Borders"]].map(([id, label]) => <button key={id} onClick={() => setTypeTab(id)} className="py-2 text-xs font-bold" style={{ borderRadius: 9, background: typeTab === id ? C.cyan : C.soft, color: typeTab === id ? "#001018" : C.text }}>{label}</button>)}</div>
        <div className="space-y-1.5">
          {secretLocked && <div className="flex items-center gap-2 py-2 px-2" style={{ borderRadius: 10, background: "#050505", border: "1px solid #333" }}><Lock size={14} /><span className="w-20 text-xs font-bold uppercase">Secret</span><span className="flex-1 text-sm font-semibold">???</span><span className="body text-xs">undiscovered</span></div>}
          {visible.map((p) => {
            const r = CRATE_RARITY[p.rarity];
            const have = crateOwned(s, p);
            const gilded = p.rarity === "gilded";
            const mythic = p.rarity === "mythic";
            return (
              <div key={p.id} className="relative flex items-center gap-2 py-1.5 px-1.5 overflow-hidden" style={{ borderRadius: 10, background: gilded ? "linear-gradient(90deg, rgba(255,212,71,.14), transparent 70%)" : mythic ? "linear-gradient(90deg,rgba(168,85,247,.18),rgba(236,72,153,.12),transparent)" : "transparent", border: gilded ? "1px solid rgba(255,212,71,.35)" : mythic ? "1px solid rgba(236,72,153,.4)" : "1px solid transparent" }}>
                {gilded && <span aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}><span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "32%", background: "linear-gradient(90deg, transparent, rgba(255,246,201,.3), transparent)", animation: "gildsweep 4.8s ease-in-out infinite" }} /></span>}
                <span className="w-20 text-xs font-bold tracking-wider uppercase" style={{ color: r.color }}>{r.name}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-semibold truncate" style={{ color: have ? C.text : C.dim }}>{p.name}</span><span className="block body text-xs truncate" style={{ color: C.mute }}>{p.flavor}</span></span>
                {have ? <Check size={14} style={{ color: C.green }} /> : <Lock size={12} style={{ color: C.mute }} />}
                <span className="body text-xs tabular-nums w-12 text-right" style={{ color: C.mute }}>{r.chance}</span>
              </div>
            );
          })}
        </div>
        {log.length > 0 && (
          <div className="body text-xs" style={{ color: C.mute }}>Last: {log.slice(0, 6).map((x) => x.name).join(" · ")}</div>
        )}
      </div>
    </div>
      {(busy || show) && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-6" style={{ background: "rgba(2,4,12,.86)" }} onClick={() => !busy && setShow(null)}>
          {busy && <div className="w-28 h-28" style={{ borderRadius: 18, background: `conic-gradient(${crate.theme.gold}, ${crate.theme.void}, ${crate.theme.rose}, ${crate.theme.gold})`, animation: "cratespin 0.9s linear infinite", boxShadow: `0 0 40px ${crate.theme.gold}` }} />}
          {show && meta && (
            <div style={{ animation: "cratereveal .55s cubic-bezier(.2,.8,.2,1)", width: "100%", maxWidth: "24rem" }} onClick={(e) => e.stopPropagation()}>
              <div className="p-5 space-y-3 text-center" style={{ background: C.sheet, border: `1px solid ${meta.color}`, borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,.18)" }}>
              <div className="text-xs font-extrabold tracking-widest uppercase" style={{ color: meta.color }}>{meta.name}</div>
              {show.type === "aura" ? (
                <div className="relative mx-auto overflow-hidden" style={{ width: 160, height: 160 }}><AuraCanvas aura={previewLook?.aura || show.id} w={160} h={160} ringR={52} style={{ left: 0, top: 0 }} /></div>
              ) : show.type === "border" ? (
                <div className="relative mx-auto" style={{ width: 72, height: 72 }}><AnimatedBorder border={BORDERS.find((b) => b.id === show.id)} color={C.cyan} /><div className="absolute" style={{ inset: 7, borderRadius: 999, background: C.sheet }} /></div>
              ) : (
                <div className="text-3xl font-black tracking-wider uppercase" style={{ color: C.gold }}>{show.name}</div>
              )}
              <div className="text-xl font-bold">{show.name}</div>
              <div className="body text-sm" style={{ color: C.dim }}>{show.sandbox ? (show.dupe ? "Already owned on the real account. Sandbox didn't change it." : "Sandbox pull — not saved to the real account.") : (show.dupe ? `Already owned · ${show.refund} pts back` : "Unlocked. Equip it in Customize.")}</div>
              {show.sandbox && (
                <button type="button" className="ghost w-full py-3 font-bold" onClick={() => {
                  setS((p) => {
                    const look = { ...(p.profile.look || {}) };
                    const profile = { ...p.profile, look };
                    if (show.type === "aura") { look.auraPrev = look.aura; look.aura = show.id; }
                    else if (show.type === "border") look.border = show.id;
                    else if (show.type === "title") profile.title = show.id;
                    return { ...p, profile };
                  });
                  setPreviewLook(show.type === "aura" ? { aura: show.id } : show.type === "border" ? { border: show.id } : null);
                }}>Equip preview</button>
              )}
              <button type="button" onClick={() => { setShow(null); setPreviewLook(null); }} className="btn w-full py-3">Continue</button>
              </div>
            </div>
          )}
        </div>
      )}
      {secretToast && <div className="fixed z-[90] left-1/2 top-8 -translate-x-1/2 px-5 py-3 font-black tracking-widest uppercase" style={{ background: "#fff", color: "#000", boxShadow: "0 0 40px #fff", borderRadius: 10 }}>Secret found · Black Sun</div>}
    </>
  );
}
/* ---------- The Juice ---------- */
