import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import { ACTIVITY, GOALS } from "../../data/foods.js";
import { today } from "../../lib/dates.js";
import { bodySex } from "../../math.js";
import { C } from "../../theme.js";
import { NumField } from "../../ui/NumField.jsx";
import { Avatar } from "../profile/Avatar.jsx";
import { logTutorialWeight } from "./onboardingWeight.js";

const HAIR = "1px solid rgba(255,255,255,.08)";
const focusScroll = (e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 350);

// The rounded visual container every step shares: card surface + hairline.
const Visual = ({ children, ghost = true }) => (
  <div className="panel w-full" aria-hidden={ghost || undefined} style={{ borderRadius: 20, padding: 16, pointerEvents: ghost ? "none" : "auto" }}>{children}</div>
);
// iOS grouped-list row for input steps: 52px, label left, control right.
const StatRow = ({ label, first, children }) => (
  <div className="flex items-center justify-between gap-3" style={{ height: 52, borderTop: first ? "none" : HAIR }}>
    <span className="min-w-0 truncate" style={{ fontSize: 16, color: C.text }}>{label}</span>
    <span className="flex items-center gap-1 shrink-0 min-w-0">{children}</span>
  </div>
);
// Bare right-aligned value inside a StatRow — no per-field box.
const bare = { font: "inherit", background: "none", border: "none", color: C.text, fontSize: 16, textAlign: "right", padding: 0, minWidth: 0 };

export function Onboarding({ s, setS, step, onNext }) {
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  const [name, setName] = useState(p.name || "");
  const ft = Math.floor((p.height || 70) / 12), inch = Math.round((p.height || 70) % 12);
  const setHeight = (f, i2) => set("height", Math.max(48, Math.min(90, f * 12 + i2)));
  const reduced = (() => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } })();
  const dur = reduced ? 100 : 250, off = reduced ? 0 : 24;

  // Step transition: the old layer slides/fades out while the new one comes in
  // from the opposite side. No transition on first open (entered starts true).
  const prev = useRef(step);
  const [leaving, setLeaving] = useState(null);
  const [dir, setDir] = useState(1);
  const [entered, setEntered] = useState(true);
  useLayoutEffect(() => {
    if (step === prev.current) return;
    setDir(step > prev.current ? 1 : -1);
    setLeaving(prev.current);
    prev.current = step;
    setEntered(false);
  }, [step]);
  useEffect(() => {
    if (leaving === null) return;
    let raf1 = 0, raf2 = 0;
    raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setEntered(true)); });
    const to = setTimeout(() => setLeaving(null), dur + 60);
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(to); };
  }, [leaving, dur]);

  const primary = (label, onClick, disabled) => (
    <button onClick={onClick} disabled={disabled} className="btn w-full" style={{ height: 52, borderRadius: 14, fontSize: 17, ...(disabled ? { opacity: 0.5 } : null) }}>{label}</button>
  );
  const secondary = (label, onClick) => (
    <button onClick={onClick} className="body w-full" style={{ height: 44, color: C.mute, fontSize: 15, background: "none", border: "none" }}>{label}</button>
  );

  // --- step content (visual + text) ---
  const content = (which, live) => {
    if (which === 0) return (<>
      <Visual><img src="/logo.webp" alt="" style={{ width: 96, margin: "0 auto", display: "block", filter: `drop-shadow(0 0 18px ${C.glow})` }} /></Visual>
      <div className="panel w-full" style={{ borderRadius: 20, padding: "0 16px", marginTop: 12 }}>
        <StatRow label="Name" first>
          <input autoFocus={live} aria-label="What should we call you?" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} onFocus={focusScroll}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && (set("name", name.trim()), onNext())}
            style={{ ...bare, width: 180 }} />
        </StatRow>
      </div>
      <TextBlock h="Welcome to Ascend" sub="Your lifts get ranked E through S, scaled to your body." />
    </>);
    if (which === 1) return (<>
      <div className="w-full grid grid-cols-2 gap-3">
        {[["m", "Male"], ["f", "Female"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => set("sex", id)} className="font-bold" style={{ height: 120, borderRadius: 16, background: bodySex(p) === id ? C.blue : C.glass, color: bodySex(p) === id ? "#fff" : C.text, border: `1px solid ${bodySex(p) === id ? C.cyan : C.glassLine}`, fontSize: 17 }}>{label}</button>
        ))}
      </div>
      <div className="body text-center mt-3" style={{ fontSize: 13, color: C.dim }}>Change it any time. XP, titles and cosmetics stay.</div>
      <TextBlock h="Body type" sub="So every rank letter is equally hard for everyone." />
    </>);
    if (which === 2) return (<>
      <Visual ghost={false}>
        <StatRow label="Weight (lb)" first><NumField inputMode="decimal" aria-label="Weight" value={p.weight} onCommit={(v) => { if (v === "") return; set("weight", v); }} onFocus={focusScroll} style={{ ...bare, width: 64 }} /></StatRow>
        <StatRow label="Age"><NumField inputMode="numeric" aria-label="Age" value={p.age} onCommit={(v) => { if (v === "") return; set("age", v); }} onFocus={focusScroll} style={{ ...bare, width: 48 }} /></StatRow>
        <StatRow label="Height">
          <NumField inputMode="numeric" aria-label="Feet" value={ft} onCommit={(v) => { if (v === "") return; setHeight(v, inch); }} onFocus={focusScroll} style={{ ...bare, width: 30 }} />
          <span className="body" style={{ fontSize: 14, color: C.dim }}>ft</span>
          <NumField inputMode="numeric" aria-label="Inches" value={inch} onCommit={(v) => { if (v === "") return; setHeight(ft, v); }} onFocus={focusScroll} style={{ ...bare, width: 30 }} />
          <span className="body" style={{ fontSize: 14, color: C.dim }}>in</span>
        </StatRow>
        <StatRow label="Training now"><Pick value={p.activity} onChange={(e) => set("activity", +e.target.value)} opts={ACTIVITY} /></StatRow>
        <StatRow label="Goal"><Pick value={p.goal} onChange={(e) => set("goal", e.target.value)} opts={GOALS} /></StatRow>
      </Visual>
      <TextBlock h="Your body stats" sub="Every rank target and calorie goal is built from these." />
    </>);
    if (which === 3) return (<>
      <Visual>
        <LogMock />
      </Visual>
      <div className="w-full mt-3">
        <IconRow first icon={<span className="flex gap-0.5">{[C.blue, C.gold, C.green, C.orange].map((c) => <i key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />)}</span>}>Blue workout · Yellow quests · Green on target · Orange off target</IconRow>
        <IconRow icon={<CalendarDays size={20} />}>Tap a day to see it</IconRow>
        <IconRow icon={<ChevronRight size={20} />}>Details and More open the rest</IconRow>
      </div>
      <TextBlock h="Your log" sub="Your whole history, one tap at a time." />
    </>);
    return (<>
      <Visual>
        <BoardMock name={p.name} line={`${p.weight} lb · ${ft}'${inch}" · ${GOALS.find((g) => g.id === p.goal)?.label}`} xp={s.xp || 0} />
      </Visual>
      <TextBlock h="Join the board" sub="A fresh race every month. Your food log and workouts stay private." />
    </>);
  };
  const foot = (which) => {
    if (which === 0) return primary("Continue", () => { set("name", name.trim()); onNext(); }, !name.trim());
    if (which === 1) return primary("Continue", onNext);
    if (which === 2) return primary("Save stats", () => { setS((x) => { const next = logTutorialWeight(x.weightLog, today(), x.profile.weight); return next === x.weightLog ? x : { ...x, weightLog: next }; }); onNext(); });
    if (which === 3) return primary("Continue", onNext);
    return <>{primary("Join the leaderboard", () => { setS((x) => ({ ...x, lb: true })); onNext(); })}{secondary("Skip for now", onNext)}</>;
  };

  // Plain function calls (not components) so inputs keep their DOM nodes across
  // renders; key="in"/"out" makes each transition layer a fresh element that
  // mounts at its start offset — only the settle animates.
  const layer = (id) => {
    const isOut = id === "out";
    const which = isOut ? leaving : step;
    const x = isOut ? (entered ? -dir * off : 0) : id === "in" && !entered ? dir * off : 0;
    const op = isOut ? (entered ? 0 : 1) : id === "in" ? (entered ? 1 : 0) : 1;
    return (
      <div key={id} aria-hidden={isOut || undefined} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", transform: `translateX(${x}px)`, opacity: op, transition: `transform ${dur}ms ease-out, opacity ${dur}ms ease-out`, pointerEvents: isOut ? "none" : "auto" }}>
        <div className="ob-scroll" style={{ flex: 1, overflowY: "auto", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
          <div style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "12px 20px 8px", display: "flex", flexDirection: "column", alignItems: "center" }}>{content(which, !isOut)}</div>
        </div>
        <div style={{ padding: "4px 20px calc(env(safe-area-inset-bottom) + 16px)" }}>
          <div style={{ maxWidth: 440, margin: "0 auto" }}>{foot(which)}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, height: "100dvh", background: C.bg, display: "flex", flexDirection: "column", zIndex: 60 }}>
      <style>{`.ob-scroll::-webkit-scrollbar{display:none}`}</style>
      <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
        <img src="/logo-sm.webp" alt="" style={{ height: 32, width: "auto", margin: "0 auto", display: "block", opacity: 0.95 }} />
        <div className="flex items-center justify-center gap-1.5" style={{ marginTop: 12 }}>{[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: i === step ? 24 : 6, height: 6, borderRadius: 999, background: i === step ? C.cyan : C.glassLine, transition: "width .2s" }} />)}</div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {leaving === null ? layer("cur") : <>{layer("out")}{layer("in")}</>}
      </div>
    </div>
  );
}

const TextBlock = ({ h, sub }) => (
  <div style={{ marginTop: 24, textAlign: "center" }}>
    <div style={{ fontSize: 28, fontWeight: 700, color: C.text }}>{h}</div>
    <div className="body" style={{ fontSize: 16, color: C.dim, maxWidth: 320, margin: "8px auto 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{sub}</div>
  </div>
);
const IconRow = ({ icon, children, first }) => (
  <div className="flex items-center gap-3" style={{ minHeight: 44, padding: "6px 0", borderTop: first ? "none" : HAIR }}>
    <span className="flex items-center justify-center shrink-0" style={{ width: 24, color: C.dim }}>{icon}</span>
    <span className="body" style={{ fontSize: 14, color: C.dim }}>{children}</span>
  </div>
);
// Right-aligned select rendered like an iOS Settings value.
const Pick = ({ value, onChange, opts }) => (
  <span className="relative flex items-center min-w-0">
    <select value={value} onChange={onChange} onFocus={focusScroll} style={{ font: "inherit", appearance: "none", WebkitAppearance: "none", background: "none", border: "none", color: C.text, fontSize: 16, maxWidth: "min(180px, 56vw)", textAlign: "right", paddingRight: 18 }}>
      {opts.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
    <ChevronDown size={14} style={{ position: "absolute", right: 0, color: C.mute, pointerEvents: "none" }} />
  </span>
);
// Static copy of the Log week view — decorative only, no state.
const LogMock = () => {
  const cells = [
    ["28", [C.blue, C.gold]], ["29", []], ["30", [C.blue]], ["1", []], ["2", [C.gold, C.orange]], ["3", []], ["4", [C.blue, C.green], true],
  ];
  return (
    <div>
      <div className="flex justify-center">
        <div className="flex" style={{ background: C.glass, border: `1px solid ${C.glassLine}`, borderRadius: 999, padding: 2 }}>
          {["Month", "Week"].map((l, i) => <span key={l} className="inline-flex items-center justify-center" style={{ width: 72, height: 32, borderRadius: 999, fontSize: 14, fontWeight: 600, background: i === 1 ? C.cyan : "transparent", color: i === 1 ? "#0A1630" : C.mute }}>{l}</span>)}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mt-3 mb-1" style={{ color: C.mute }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((x, i) => <span key={i}>{x}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map(([num, dots, sel]) => (
          <span key={num} className="aspect-square flex flex-col items-center justify-center gap-1" style={{ borderRadius: 3, background: sel ? "rgba(47,140,255,.28)" : dots.length ? "rgba(47,140,255,.1)" : "transparent", border: sel ? `1px solid ${C.cyan}` : "1px solid transparent" }}>
            <span className="text-sm font-semibold">{num}</span>
            <span className="flex gap-0.5 h-1.5">{dots.map((c, i) => <i key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 4px ${c}` }} />)}</span>
          </span>
        ))}
      </div>
      <div className="flex items-baseline justify-between mt-3">
        <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>Sun, Oct 4</span>
        <span className="text-sm font-bold" style={{ color: C.gold }}>920 XP</span>
      </div>
      <div className="flex justify-between items-center gap-2" style={{ padding: "12px 0", borderTop: HAIR, marginTop: 4 }}>
        <span className="min-w-0">
          <span className="block truncate" style={{ fontSize: 16, fontWeight: 600, color: C.text }}>Back, Biceps, Shoulders</span>
          <span className="body block" style={{ fontSize: 14, color: C.dim, marginTop: 1 }}>11 exercises · 60 min</span>
        </span>
        <span className="body shrink-0" style={{ fontSize: 14, color: C.cyan }}>Details ›</span>
      </div>
      <div className="flex items-center gap-2" style={{ height: 44 }}>
        <span className="body" style={{ fontSize: 14, color: C.mute }}>More</span>
        <ChevronRight size={16} className="ml-auto shrink-0" style={{ color: C.mute }} />
      </div>
    </div>
  );
};
// Static leaderboard preview — dummy players around the real player card.
const BoardMock = ({ name, line, xp }) => {
  const Row = ({ rank, who, sub, xpText, you }) => (
    <div className="flex items-center gap-3" style={{ padding: "10px 10px", borderRadius: 12, border: you ? `1px solid ${C.line}` : "1px solid transparent" }}>
      <span className="body shrink-0" style={{ width: 16, fontSize: 14, color: C.dim }}>{rank}</span>
      <Avatar name={who} size={36} ring={you ? C.cyan : C.mute} />
      <span className="min-w-0 flex-1">
        <span className="block truncate" style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{who}</span>
        {sub && <span className="body block truncate" style={{ fontSize: 14, color: C.dim }}>{sub}</span>}
      </span>
      <span className="text-sm font-bold shrink-0" style={{ color: C.gold }}>{xpText}</span>
    </div>
  );
  return (
    <div>
      <Row rank={1} who="Alex" xpText="2,480 XP" />
      <div style={{ borderTop: HAIR }} />
      <Row rank={2} who={name || "You"} sub={line} xpText={`${xp.toLocaleString()} XP`} you />
      <div style={{ borderTop: HAIR }} />
      <Row rank={3} who="Sam" xpText="640 XP" />
    </div>
  );
};

/* ---------- Crews ---------- */
