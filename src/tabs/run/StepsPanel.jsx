import { useState, useEffect } from "react";
import { Bot, BookOpen, Check, ChevronDown } from "lucide-react";
import { C } from "../../theme.js";
import { today, shift, fmtDay } from "../../lib/dates.js";
import { ask } from "../../lib/ask.js";
import { STEP_GOAL_XP } from "../train/xpConstants.js";
import { stepSyncStatus, agoText, STEP_SHORTCUT_URL, sha256hex, STEP_SYNC_URL } from "./stepSync.js";
export function StepsPanel({ s, setS, gainXp, openRun, openAssistant }) {
  const d = today();
  const goal = s.settings?.stepGoal || 10000;
  const todaySteps = s.steps?.[d] || 0;
  const [manual, setManual] = useState("");
  const [setup, setSetup] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [sync, setSync] = useState(null);
  const [fixing, setFixing] = useState(false);
  const loadSync = async () => { if (!s.stepToken) return; const st = await stepSyncStatus(s.stepTokenHash, s.stepToken).catch(() => null); if (st) setSync(st); };
  useEffect(() => { loadSync(); const v = () => document.visibilityState === "visible" && loadSync(); document.addEventListener("visibilitychange", v); return () => document.removeEventListener("visibilitychange", v); }, [s.stepToken]);
  const reRegister = async () => { setFixing(true); try { await window.ascendAuth.registerStepToken(s.stepTokenHash, null); await loadSync(); } catch (e) { setErr("Couldn't register the code. Check your connection."); } setFixing(false); };
  const last = sync?.log?.[0], lastOk = sync?.log?.find((x) => x.ok && x.steps > 0);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  const [err, setErr] = useState("");
  const week = Array.from({ length: 7 }, (_, i) => { const k = shift(d, i - 6); return { k, n: s.steps?.[k] || 0 }; });
  const maxN = Math.max(goal, ...week.map((w) => w.n));
  useEffect(() => {
    if (todaySteps >= goal && !s.stepXp?.[d]) { setS((p) => ({ ...p, stepXp: { ...(p.stepXp || {}), [d]: true } })); gainXp(STEP_GOAL_XP, "Step goal", `steps_${d}`); }
  }, [todaySteps, goal]);
  const saveManual = () => {
    const n = Math.round(+manual); if (!(n >= 0) || manual === "") return;
    setS((p) => { const base = { ...p, steps: { ...(p.steps || {}), [d]: n } }; const day = base.days?.[d]; return day ? { ...base, days: { ...base.days, [d]: { ...day, list: day.list.map((q) => (q.qid === "steps" && !q.claimed ? { ...q, progress: Math.max(q.progress, n) } : q)) } } } : base; });
    setManual("");
  };
  const makeCode = async () => {
    setBusy(true); setErr("");
    try {
      const code = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const hash = await sha256hex(code);
      await window.ascendAuth.registerStepToken(hash, s.stepTokenHash || null);
      setS((p) => ({ ...p, stepToken: code, stepTokenHash: hash }));
    } catch (e) { setErr("Couldn't create a sync code. Check your connection, and make sure the steps SQL was run in Supabase."); }
    setBusy(false);
  };
  const copy = async (text, label) => { try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 1800); } catch (e) { /* select manually */ } };
  // Always the www address: redirects from other addresses can turn the POST into a GET and lose the data
  const url = typeof window !== "undefined" && !/ascendfit\.site$|vercel\.app$/.test(window.location.hostname) ? `${window.location.origin}/api/steps` : STEP_SYNC_URL;
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div><div className="body text-xs font-semibold uppercase tracking-wider" style={{ color: C.dim }}>Steps today</div><div className="text-3xl font-bold tabular-nums">{todaySteps.toLocaleString()}</div></div>
        <div className="body text-xs text-right" style={{ color: todaySteps >= goal ? C.green : C.dim }}>{todaySteps >= goal ? `Goal hit · +${STEP_GOAL_XP} XP` : `${(goal - todaySteps).toLocaleString()} to ${goal.toLocaleString()}`}</div>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: 70 }} role="img" aria-label="Steps over the last 7 days">
        {week.map((w) => <div key={w.k} className="flex-1 flex flex-col items-center gap-1"><div style={{ width: "100%", height: `${Math.max(3, (w.n / maxN) * 56)}px`, borderRadius: 6, background: w.n >= goal ? C.green : w.k === d ? C.cyan : C.glassLine }} /><span className="body" style={{ fontSize: 10, color: C.dim }}>{new Date(w.k + "T12:00").toLocaleDateString(undefined, { weekday: "narrow" })}</span></div>)}
      </div>
      <div className="flex gap-2">
        <input type="text" inputMode="numeric" className="inp text-sm" placeholder="Enter today's steps" value={manual} onChange={(e) => setManual(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveManual()} aria-label="Today's steps" />
        <button onClick={saveManual} disabled={!(+manual >= 0) || manual === ""} className="btn px-4 text-sm">Save</button>
      </div>
      <button onClick={() => setSetup(!setup)} aria-expanded={setup} className="body text-sm font-semibold w-full text-left flex items-center justify-between" style={{ color: C.cyan }}><span>{s.stepToken ? "Automatic sync is set up" : "Sync steps automatically"}</span><ChevronDown size={16} style={{ transform: setup ? "rotate(180deg)" : "none" }} /></button>
      {s.stepToken && sync && (
        <div className="body text-xs flex items-start gap-1.5" role="status">
          {sync.registered === false ? (
            <span style={{ color: C.orange }}>Your sync code isn't registered, so every sync gets rejected. <button onClick={reRegister} disabled={fixing} className="underline font-semibold" style={{ color: C.cyan }}>{fixing ? "Fixing…" : "Fix it"}</button></span>
          ) : !last ? (
            sync.unrecognized.length ? <span style={{ color: C.orange }}>Your Shortcut reached Ascend {agoText(sync.unrecognized[0].at)}, but the code in it doesn't match. Copy the code again and paste it into the token field.</span>
              : <span style={{ color: C.dim }}>No syncs received yet. Open one of your trigger apps, then come back here.</span>
          ) : last.ok && last.steps > 0 ? (
            <span style={{ color: C.green }}><Check size={12} className="inline -mt-0.5 mr-0.5" />Last sync {agoText(last.at)} · {Number(last.steps).toLocaleString()} steps for {fmtDay(last.day)}</span>
          ) : last.ok ? (
            <span style={{ color: C.orange }}>Last sync {agoText(last.at)} sent 0 steps. That happens when the phone is locked (iOS hides Health data), so use the "app is opened" trigger.{lastOk ? ` Last real sync: ${agoText(lastOk.at)}.` : ""}</span>
          ) : (
            <span style={{ color: C.red }}>Last try {agoText(last.at)} failed: {last.reason}</span>
          )}
        </div>
      )}
      {setup && (
        <div className="space-y-3 body text-sm" style={{ color: C.sub }}>
          {!s.stepToken ? (
            <button onClick={makeCode} disabled={busy} className="btn w-full py-2.5 text-sm">{busy ? "Creating…" : "Create my sync code"}</button>
          ) : (
            <div className="space-y-1.5">
              <div className="text-xs" style={{ color: C.dim }}>Your sync code (keep it private)</div>
              <button onClick={() => copy(s.stepToken, "code")} className="ghost w-full p-2.5 text-left font-mono text-xs break-all">{s.stepToken}</button>
              <div className="text-xs" style={{ color: C.dim }}>Sync URL</div>
              <button onClick={() => copy(url, "url")} className="ghost w-full p-2.5 text-left font-mono text-xs break-all">{url}</button>
              {copied && <div className="text-xs" style={{ color: C.green }}>Copied {copied}</div>}
            </div>
          )}
          {s.stepToken && sync?.log?.length > 0 && (
            <div className="space-y-0.5">
              <div className="text-xs" style={{ color: C.dim }}>Recent syncs from your iPhone</div>
              {sync.log.map((x, i) => <div key={i} className="flex justify-between gap-2 text-xs"><span style={{ color: x.ok ? (x.steps > 0 ? C.sub : C.orange) : C.red }}>{x.ok ? "✓" : "✗"} {x.ok ? (x.steps > 0 ? `${Number(x.steps).toLocaleString()} steps · ${x.reason === "saved" ? "saved" : x.reason}` : "0 steps (phone locked?)") : x.reason}</span><span className="shrink-0 tabular-nums" style={{ color: C.mute }}>{agoText(x.at)}</span></div>)}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { openAssistant?.(); setTimeout(() => window.dispatchEvent(new CustomEvent("ascend-sterling-steps")), 350); }} className="btn py-2.5 text-sm font-bold flex items-center justify-center gap-1.5"><Bot size={16} />Ask Sterling</button>
            <button onClick={() => setShowSteps((v) => !v)} aria-expanded={showSteps} aria-controls="step-written-guide" className="py-2.5 text-sm font-bold flex items-center justify-center gap-1.5" style={{ borderRadius: 12, color: showSteps ? "#001018" : C.cyan, background: showSteps ? C.cyan : `${C.cyan}14`, border: `1.5px solid ${C.cyan}` }}><BookOpen size={16} />{showSteps ? "Hide instructions" : "View written instructions"}</button>
          </div>
          <a href={STEP_SHORTCUT_URL} target="_blank" rel="noreferrer" className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center">Install the 1-click Shortcut</a>
          {showSteps && (
            <div id="step-written-guide" className="panel p-3 space-y-2" style={{ borderColor: `${C.cyan}55` }}>
              <div className="text-sm font-bold" style={{ color: C.text }}>One-tap Shortcut install</div>
              {!s.stepToken && <div className="text-xs" style={{ color: C.orange }}>Tap "Create my sync code" above first. You'll paste it into the Shortcut.</div>}
              <a href={STEP_SHORTCUT_URL} target="_blank" rel="noreferrer" className="btn w-full py-2.5 text-sm font-bold flex items-center justify-center gap-1.5">Install Ascend Steps Shortcut</a>
              <div className="text-xs p-2" style={{ borderRadius: 8, background: `${C.orange}14`, color: C.sub }}><b style={{ color: C.text }}>Why not a set time like 11:45 PM?</b> iPhones lock Health data while the phone is locked, so a night-time automation sends nothing. Running it when you open an app means the phone is unlocked.</div>
              <ol className="space-y-1.5 list-decimal pl-5 text-sm">
                <li>Tap <b>Install Ascend Steps Shortcut</b> and add it. When it asks, paste your sync code.</li>
                <li>Open the <b>Shortcuts</b> app → <b>Automation</b> → <b>+</b> → <b>App</b>. Pick 2 or 3 apps you open every day, including one before bed. Keep <b>Is Opened</b>, <b>Run Immediately</b>, Notify off.</li>
                <li>Set that automation to run the <b>Ascend Steps</b> Shortcut you just installed. No need to add Health or URL actions by hand.</li>
                <li>Open one of those apps, then come back here. The line under "Automatic sync" shows the result.</li>
              </ol>
              <div className="text-xs" style={{ color: C.dim }}>Already made the 11:45 PM one? Swipe left on it in the Automation tab to delete it. Running it many times a day is fine; Ascend keeps the highest count for each day.</div>
            </div>
          )}
          {s.stepToken && <button onClick={() => ask("Make a new sync code? The old one stops working, so you'd need to update your Shortcut.", makeCode, "New code")} className="text-xs underline" style={{ color: C.mute }}>Make a new code</button>}
          {err && <div className="text-xs" style={{ color: C.red }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
