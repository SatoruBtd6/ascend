import { useState } from "react";
import { Check, Lock, Plus, X } from "lucide-react";
import { AuraCanvas } from "../../auras/AuraCanvas.jsx";
import { AURAS } from "../../auras/catalog.js";
import { overallInfo } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { AnimatedBorder, Avatar, FancyName } from "./Avatar.jsx";
import { AURA_GROUPS, NAME_ANIMS, NAME_COLORS, NAME_FONTS, PROFILE_BGS, lookStyle, titleGroup } from "./lookConsts.js";
import { Physique } from "./Physique.jsx";
import { RankChip } from "./RankChip.jsx";
import { TITLES, equippedTitle, titleEarned } from "./titles.js";
import { AURA_TASKS, BORDERS, unlocked } from "./unlock.js";
export function StudioTabs({ tab, setTab, tabs }) {
  const i = Math.max(0, tabs.findIndex((t) => t[0] === tab));
  return (
    <div role="tablist" aria-label="Customize" className="relative grid p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, borderRadius: 14, background: C.soft, border: `1px solid ${C.glassLine}` }}>
      <span aria-hidden="true" style={{ position: "absolute", top: 4, bottom: 4, left: `calc(${(i / tabs.length) * 100}% + 4px)`, width: `calc(${100 / tabs.length}% - 8px)`, borderRadius: 10, background: `linear-gradient(180deg, ${C.cyan}, ${C.blue})`, boxShadow: `0 4px 14px ${C.glow}`, transition: "left .28s cubic-bezier(.2,.8,.2,1)" }} />
      {tabs.map(([id, label, count]) => (
        <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="relative py-2 text-sm font-bold flex items-center justify-center gap-1.5" style={{ color: tab === id ? "#001018" : C.text, transition: "color .2s" }}>
          {label}{count && <span className="body text-xs font-semibold tabular-nums" style={{ opacity: 0.7 }}>{count}</span>}
        </button>
      ))}
    </div>
  );
}
export function StudioHead({ children, note }) {
  return <div className="flex items-baseline justify-between gap-2 pt-1"><div className="text-sm font-bold">{children}</div>{note && <div className="body text-xs text-right" style={{ color: C.mute }}>{note}</div>}</div>;
}
export function AuraTile({ a, s, sel, onPick }) {
  const ok = unlocked(a, s);
  const prog = a.task ? AURA_TASKS[a.task](s) : null;
  const gilded = !!a.gilded;
  return (
    <button onClick={() => ok && onPick(a.id)} aria-pressed={sel} aria-disabled={!ok} aria-label={`${a.name}${ok ? "" : `, locked: ${a.how}`}`} className="relative flex flex-col items-center text-center px-1.5 pt-2 pb-2 overflow-visible" style={{ borderRadius: 14, background: sel ? `${C.cyan}14` : gilded ? "linear-gradient(180deg, rgba(255,212,71,.16), rgba(201,150,46,.06))" : C.glass, border: `1px solid ${sel ? C.cyan : gilded ? "rgba(255,212,71,.55)" : C.glassLine}`, boxShadow: sel ? `0 0 0 1px ${C.cyan}, 0 6px 20px ${C.glow}` : gilded ? "0 0 18px rgba(255,212,71,.22)" : "none", cursor: ok ? "pointer" : "default", transition: "border-color .2s, box-shadow .2s" }}>
      {gilded && <span aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 14, pointerEvents: "none" }}><span style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "38%", background: "linear-gradient(90deg, transparent, rgba(255,246,201,.28), transparent)", animation: "gildsweep 4.8s ease-in-out infinite" }} /></span>}
      <span className="relative flex items-center justify-center overflow-visible" style={{ width: 88, height: 88 }}>
        {a.id !== "none" && <span style={{ position: "absolute", inset: 0, opacity: ok ? 1 : 0.5, filter: ok ? "none" : "saturate(.6)", overflow: "visible" }}><AuraCanvas aura={a.id} w={88} h={88} ringR={28} style={{ left: 0, top: 0 }}><span className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 999, background: C.sheet, border: `1px solid ${gilded ? "rgba(255,212,71,.45)" : C.glassLine}` }}>{!ok ? <Lock size={14} style={{ color: C.mute }} /> : sel ? <Check size={16} style={{ color: C.cyan }} /> : null}</span></AuraCanvas></span>}
        {a.id === "none" && <span className="relative flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: 999, background: C.sheet, border: `1px solid ${C.glassLine}` }}><X size={14} style={{ color: C.mute }} /></span>}
      </span>
      {gilded && <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xs font-extrabold tracking-widest uppercase" style={{ color: "#E8C56A", fontSize: 9, letterSpacing: ".14em", zIndex: 1 }}>Gilded</span>}
      <span className="text-xs font-bold leading-tight mt-0.5" style={{ color: ok ? C.text : C.dim }}>{a.name}</span>
      {ok && a.ptsMult ? <span className="body leading-tight" style={{ fontSize: 10.5, color: C.gold }}>+{Math.round(a.ptsMult * 100)}% pts</span> : null}
      {!ok && !prog && <span className="body leading-tight mt-0.5" style={{ fontSize: 10.5, color: C.mute }}>{a.how}</span>}
      {!ok && prog && (
        <span className="w-full mt-1 px-1">
          <span className="block body leading-tight" style={{ fontSize: 10.5, color: C.mute }}>{a.how}</span>
          {prog.goal > 1 && <span className="block mt-1 h-1 overflow-hidden" style={{ borderRadius: 999, background: C.track }}><span className="block h-full" style={{ width: `${(prog.v / prog.goal) * 100}%`, borderRadius: 999, background: a.colors[0] }} /></span>}
          <span className="block body leading-tight mt-0.5 tabular-nums" style={{ fontSize: 10, color: C.dim }}>{prog.label}</span>
        </span>
      )}
    </button>
  );
}
export function LookStudio({ s, setS }) {
  const [tab, setTab] = useState("auras");
  const look = s.profile.look || {};
  const setLook = (patch) => setS((p) => ({ ...p, profile: { ...p.profile, look: { ...(p.profile.look || {}), ...patch } } }));
  const oi = overallInfo(s);
  const curTitle = equippedTitle(s);
  const titleName = curTitle?.name || null;
  const aurasOk = AURAS.filter((a) => a.id !== "none" && unlocked(a, s)).length;
  const titlesOk = TITLES.filter((t) => titleEarned(t, s)).length;
  const selAura = look.aura || "none";
  const auraName = AURAS.find((a) => a.id === selAura)?.name;
  return (
    <div className="panel overflow-hidden">
      <div className="relative px-4 pt-4 pb-3 flex items-center gap-3" style={{ backgroundImage: lookStyle(look, 0.5)?.background || `radial-gradient(120% 90% at 20% 30%, ${oi.rank.glow}, transparent 60%)`, backgroundSize: "cover", borderBottom: `1px solid ${C.glassLine}` }}>
        <div className="shrink-0" style={{ width: 104 }}><Physique tier={oi.score} height={150} aura={look.aura} sex={s.profile.sex} /></div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={s.profile.avatar} name={s.profile.name} size={44} ring={look.accent || oi.rank.color} look={{ ...look, aura: "none" }} />
            <div className="min-w-0">
              <div className="text-lg font-bold truncate leading-tight"><FancyName name={s.profile.name} look={look} className="glowtext" /></div>
              {titleName && <div className="text-xs font-bold tracking-wider uppercase truncate" style={{ color: look.accent || C.cyan }}>{titleName}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap"><RankChip rank={oi.rank.id} div={oi.div} /><span className="body text-xs" style={{ color: C.dim }}>{selAura === "none" ? "No aura" : `${auraName} aura`}</span></div>
          <div className="body text-xs" style={{ color: C.mute }}>This is how you show up on the board and in the feed.</div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <StudioTabs tab={tab} setTab={setTab} tabs={[["auras", "Auras", `${aurasOk}/${AURAS.length - 1}`], ["titles", "Titles", `${titlesOk}/${TITLES.length}`], ["themes", "Themes", null]]} />

        {tab === "auras" && AURA_GROUPS.map(([g, label, note]) => {
          const list = AURAS.filter((a) => (a.group === g || (g === "rank" && a.id === "none")) && (a.id !== "blacksun" || unlocked(a, s)));
          const have = list.filter((a) => a.id !== "none" && unlocked(a, s)).length;
          return (
            <div key={g} className="space-y-2">
              <StudioHead note={`${have} of ${list.filter((a) => a.id !== "none").length}`}>{label}</StudioHead>
              {note && <div className="body text-xs -mt-1.5" style={{ color: C.dim }}>{note}</div>}
              <div className="grid grid-cols-3 gap-2">{list.map((a) => <AuraTile key={a.id} a={a} s={s} sel={selAura === a.id} onPick={(id) => setLook({ aura: id, ...(id !== (look.aura || "none") && look.aura && look.aura !== "none" && look.aura !== "ascended" ? { auraPrev: look.aura } : {}) })} />)}</div>
            </div>
          );
        })}

        {tab === "titles" && [["progress", "Milestones"], ["crate", "Anime Crate"], ["boss", "Boss slayer"], ["rivalry", "Rivalry"], ["season", "Seasons"], ["soon", "Coming soon"]].map(([g, label]) => {
          const list = TITLES.filter((t) => titleGroup(t) === g);
          return (
            <div key={g} className="space-y-2">
              <StudioHead note={`${list.filter((t) => titleEarned(t, s)).length} of ${list.length}`}>{label}</StudioHead>
              <div className="grid grid-cols-2 gap-2">
                {list.map((t) => {
                  const ok = titleEarned(t, s), sel = curTitle.id === t.id;
                  return (
                    <button key={t.id} onClick={() => ok && setS((p) => ({ ...p, profile: { ...p.profile, title: t.id } }))} aria-pressed={sel} aria-disabled={!ok} className="text-left px-3 py-2.5 flex items-start gap-2" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : C.glass, border: `1px solid ${sel ? C.cyan : C.glassLine}`, boxShadow: sel ? `0 0 0 1px ${C.cyan}` : "none", cursor: ok ? "pointer" : "default" }}>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold tracking-wider uppercase truncate" style={{ color: ok ? (sel ? look.accent || C.cyan : C.text) : C.mute }}>{t.name}</span>
                        <span className="block body leading-tight mt-0.5" style={{ fontSize: 10.5, color: C.mute }}>{t.how}</span>
                      </span>
                      {sel ? <Check size={14} className="shrink-0 mt-0.5" style={{ color: C.cyan }} /> : !ok ? <Lock size={12} className="shrink-0 mt-0.5" style={{ color: C.mute }} /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {tab === "titles" && (
          <div className="space-y-2">
            <StudioHead>Exclusive achievements</StudioHead>
            <div className="body text-xs -mt-1.5" style={{ color: C.dim }}>Not earnable yet. They're here so the grind has a ceiling to chase.</div>
            <div className="grid grid-cols-2 gap-2">
              {[["Perfect Season", "Hit every daily quest for a full season"], ["First Blood", "Land the first hit on a new global boss"], ["Untouchable", "Hold #1 for 30 days straight"]].map(([name, how]) => (
                <div key={name} className="text-left px-3 py-2.5 flex items-start gap-2" style={{ borderRadius: 12, background: C.glass, border: `1px solid ${C.glassLine}` }}>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-bold tracking-wider uppercase truncate" style={{ color: C.mute }}>{name}</span>
                    <span className="block body leading-tight mt-0.5" style={{ fontSize: 10.5, color: C.mute }}>{how}</span>
                  </span>
                  <Lock size={12} className="shrink-0 mt-0.5" style={{ color: C.mute }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "themes" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <StudioHead>Card background</StudioHead>
              <div className="grid grid-cols-5 gap-2">
                {PROFILE_BGS.map((b) => { const sel = (look.bg || "none") === b.id; return (
                  <button key={b.id} onClick={() => setLook({ bg: b.id })} aria-pressed={sel} aria-label={`${b.name} background`} className="flex flex-col items-center gap-1">
                    <span className="w-full flex items-center justify-center" style={{ aspectRatio: "4 / 3", borderRadius: 10, background: b.css || C.soft, border: `2px solid ${sel ? C.cyan : C.glassLine}`, boxShadow: sel ? `0 0 12px ${C.glow}` : "none" }}>{sel && <Check size={14} style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }} />}</span>
                    <span className="body truncate w-full text-center" style={{ fontSize: 10.5, color: sel ? C.text : C.dim }}>{b.name}</span>
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead note={`${BORDERS.filter((b) => unlocked(b, s)).length} of ${BORDERS.length}`}>Photo border</StudioHead>
              <div className="grid grid-cols-4 gap-2">
                {BORDERS.map((b) => { const ok = unlocked(b, s), sel = (look.border || "none") === b.id; return (
                  <button key={b.id} onClick={() => ok && setLook({ border: b.id })} aria-pressed={sel} aria-disabled={!ok} className="flex flex-col items-center gap-1 py-2 px-1" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : "transparent", border: `1px solid ${sel ? C.cyan : "transparent"}`, cursor: ok ? "pointer" : "default" }}>
                    <span className="relative flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 999, background: b.img || b.effect ? "transparent" : (b.css || C.cyan), opacity: ok ? 1 : 0.35, animation: (b.spin || b.img) && !b.effect && ok ? "rkspin 8s linear infinite" : "none" }}>
                      {b.effect && <AnimatedBorder border={b} color={look.accent || C.cyan} />}
                      {b.img && <img src={b.img} alt="" style={{ position: "absolute", inset: -2, width: 44, height: 44, objectFit: "contain" }} />}
                      <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 999, background: C.sheet }}>{!ok && <Lock size={12} style={{ color: C.mute }} />}</span>
                    </span>
                    <span className="text-xs font-semibold leading-tight text-center" style={{ color: ok ? C.text : C.mute }}>{b.name}</span>
                    {!ok && <span className="body leading-tight text-center" style={{ fontSize: 10, color: C.mute }}>{b.how}</span>}
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead>Name font</StudioHead>
              <div className="grid grid-cols-2 gap-2">
                {NAME_FONTS.map((f) => { const sel = (look.font || "default") === f.id; return (
                  <button key={f.id} onClick={() => setLook({ font: f.id })} aria-pressed={sel} className="px-3 py-2.5 text-left min-w-0" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : C.glass, border: `1px solid ${sel ? C.cyan : C.glassLine}` }}>
                    <span className="block truncate" style={{ fontSize: 17 }}><FancyName name={s.profile.name || "Your name"} look={{ font: f.id, accent: look.accent }} /></span>
                    <span className="block body text-xs mt-0.5" style={{ color: C.mute }}>{f.name}</span>
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead>Name effect</StudioHead>
              <div className="grid grid-cols-4 gap-2">
                {NAME_ANIMS.map((a) => { const sel = (look.anim || "none") === a.id; return (
                  <button key={a.id} onClick={() => setLook({ anim: a.id })} aria-pressed={sel} className="py-2.5 px-1 text-sm font-bold overflow-hidden" style={{ borderRadius: 12, background: sel ? `${C.cyan}14` : C.glass, border: `1px solid ${sel ? C.cyan : C.glassLine}` }}>
                    <FancyName name={a.name} look={{ anim: a.id, accent: look.accent || C.cyan }} />
                  </button>
                ); })}
              </div>
            </div>
            <div className="space-y-2">
              <StudioHead>Name color</StudioHead>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setLook({ accent: null })} aria-pressed={!look.accent} aria-label="Default color" className="flex items-center justify-center text-xs font-bold" style={{ width: 34, height: 34, borderRadius: 999, background: C.soft, border: `2px solid ${!look.accent ? C.cyan : C.glassLine}`, color: C.dim }}>Auto</button>
                {NAME_COLORS.map((c) => { const sel = (look.accent || "").toLowerCase() === c.toLowerCase(); return <button key={c} onClick={() => setLook({ accent: c })} aria-pressed={sel} aria-label={`Name color ${c}`} style={{ width: 34, height: 34, borderRadius: 999, background: c, border: `2px solid ${sel ? C.text : "transparent"}`, boxShadow: sel ? `0 0 0 2px ${C.sheet} inset, 0 0 12px ${c}` : "none" }} />; })}
                <label className="relative flex items-center justify-center" style={{ width: 34, height: 34, borderRadius: 999, background: "conic-gradient(#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)", border: `2px solid ${look.accent && !NAME_COLORS.some((c) => c.toLowerCase() === look.accent.toLowerCase()) ? C.text : "transparent"}`, cursor: "pointer" }}>
                  <Plus size={14} style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.6))" }} />
                  <input type="color" value={look.accent || "#00D9FF"} onChange={(e) => setLook({ accent: e.target.value })} aria-label="Custom name color" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Rank emblems ---------- */
/* ---------- Meal builder ---------- */
/* ---------- Mog-off ---------- */
