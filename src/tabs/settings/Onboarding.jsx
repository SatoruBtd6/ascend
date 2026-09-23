import { useState } from "react";
import { ACTIVITY, GOALS } from "../../data/foods.js";
import { today } from "../../lib/dates.js";
import { bodySex } from "../../math.js";
import { C } from "../../theme.js";
import { NumField } from "../../ui/NumField.jsx";
import { Avatar } from "../profile/Avatar.jsx";
import { seasonKey } from "../profile/season.js";
import { logTutorialWeight } from "./onboardingWeight.js";
export function Onboarding({ s, setS, step, onNext }) {
  const p = s.profile;
  const set = (k, v) => setS((x) => ({ ...x, profile: { ...x.profile, [k]: v } }));
  const [name, setName] = useState(p.name || "");
  const ft = Math.floor((p.height || 70) / 12), inch = Math.round((p.height || 70) % 12);
  const setHeight = (f, i2) => set("height", Math.max(48, Math.min(90, f * 12 + i2)));
  const wrap = (children) => (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-1.5 pt-2">{[0, 1, 2, 3].map((i) => <span key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 999, background: i <= step ? C.cyan : C.glassLine, transition: "width .2s" }} />)}</div>
      {children}
    </div>
  );
  if (step === 0) {
    return wrap(
      <div className="panel p-5 space-y-4">
        <img src="/logo.webp" alt="" style={{ width: 96, margin: "0 auto", display: "block" }} />
        <div className="text-center"><div className="text-2xl font-bold">Welcome to Ascend</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Your lifts get ranked E through S, scaled to your body. First, the basics.</div></div>
        <label className="body text-sm block">What should we call you?
          <input autoFocus className="inp mt-1" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && (set("name", name.trim()), onNext())} />
        </label>
        <button disabled={!name.trim()} onClick={() => { set("name", name.trim()); onNext(); }} className="btn w-full py-3" style={!name.trim() ? { opacity: 0.5 } : null}>Continue</button>
      </div>,
    );
  }
  if (step === 1) {
    const cur = bodySex(p);
    return wrap(
      <div className="panel p-5 space-y-4">
        <div><div className="text-xl font-bold">Body type</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Ranks and calorie targets use this so a given letter is equally hard for everyone. You can change it later; achievements, XP, titles, and cosmetics stay.</div></div>
        <div className="grid grid-cols-2 gap-2">
          {[["m", "Male"], ["f", "Female"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => set("sex", id)} className="py-4 font-bold" style={{ borderRadius: 12, background: cur === id ? C.blue : C.glass, color: cur === id ? "#fff" : C.text, border: `1px solid ${cur === id ? C.cyan : C.glassLine}` }}>{label}</button>
          ))}
        </div>
        <button onClick={onNext} className="btn w-full py-3">Continue</button>
      </div>,
    );
  }
  if (step === 2) {
    return wrap(
      <div className="panel p-5 space-y-4">
        <div><div className="text-xl font-bold">Your body stats</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Every rank target and calorie goal is built from these. You can change them any time.</div></div>
        <div className="grid grid-cols-2 gap-3 body text-sm">
          <label>Weight (lb)<NumField inputMode="decimal" className="inp mt-1" value={p.weight} onCommit={(v) => { if (v === "") return; set("weight", v); }} /></label>
          <label>Age<NumField inputMode="numeric" className="inp mt-1" value={p.age} onCommit={(v) => { if (v === "") return; set("age", v); }} /></label>
          <label className="col-span-2">Height<div className="flex gap-1 mt-1"><NumField inputMode="numeric" className="inp text-center" value={ft} onCommit={(v) => { if (v === "") return; setHeight(v, inch); }} aria-label="Feet" /><span className="self-center body text-xs" style={{ color: C.dim }}>ft</span><NumField inputMode="numeric" className="inp text-center" value={inch} onCommit={(v) => { if (v === "") return; setHeight(ft, v); }} aria-label="Inches" /><span className="self-center body text-xs" style={{ color: C.dim }}>in</span></div></label>
          <label className="col-span-2">Training now<select className="inp mt-1" value={p.activity} onChange={(e) => set("activity", +e.target.value)}>{ACTIVITY.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select></label>
          <label className="col-span-2">Goal<select className="inp mt-1" value={p.goal} onChange={(e) => set("goal", e.target.value)}>{GOALS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
        </div>
        <button onClick={() => { setS((x) => { const next = logTutorialWeight(x.weightLog, today(), x.profile.weight); return next === x.weightLog ? x : { ...x, weightLog: next }; }); onNext(); }} className="btn w-full py-3">Save stats</button>
      </div>,
    );
  }
  return wrap(
    <div className="panel p-5 space-y-4">
      <div><div className="text-xl font-bold">Join the season</div><div className="body text-sm mt-1" style={{ color: C.dim }}>Season {seasonKey().split("-S")[1]} is live. Joining puts you on the leaderboard, the feed, boss fights, and duels. Your food log and workout details stay private.</div></div>
      <div className="panel p-3 flex items-center gap-3" style={{ background: "transparent" }}>
        <Avatar name={p.name} size={44} ring={C.cyan} />
        <div className="min-w-0"><div className="font-bold truncate">{p.name}</div><div className="body text-xs" style={{ color: C.dim }}>{p.weight} lb · {ft}'{inch}" · {GOALS.find((g) => g.id === p.goal)?.label}</div></div>
      </div>
      <button onClick={() => { setS((x) => ({ ...x, lb: true })); onNext(); }} className="btn w-full py-3">Join the leaderboard</button>
      <button onClick={onNext} className="body text-sm w-full" style={{ color: C.mute }}>Skip for now</button>
    </div>,
  );
}

/* ---------- Crews ---------- */
