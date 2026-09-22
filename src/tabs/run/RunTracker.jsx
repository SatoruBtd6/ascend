import { useState, useEffect, useMemo, useRef } from "react";
import { Play, Pause, X, Volume2, VolumeX } from "lucide-react";
import { C } from "../../theme.js";
import { MI_M, fmtDur, fmtPace, runElapsed, addFix, currentPace, switchRunMode, toggleRunPause, ensureSegments, buildSavedRun, openSegment, segmentMovingSecs, runBreakdown } from "../../run.js";
import { today } from "../../lib/dates.js";
import { addWorkout, workoutXp } from "../../lib/stats.js";
import { ask } from "../../lib/ask.js";
import { saveLive, clearLive } from "./live.js";
import { RouteMap, encodePoly, thinPts, decodePoly } from "./maps.jsx";
import { fetchRunWeather } from "./weather.js";
import { juice } from "../train/juice.js";
import { SFX } from "../train/sfx.js";
import { sterlingSay } from "../train/sterling.js";
import { postFeed } from "../train/social.js";
export function RunTracker({ s, setS, gainXp, initial, onClose }) {
  const [run, setRun] = useState(() => ensureSegments(initial));
  const runRef = useRef(run); runRef.current = run;
  const [now, setNow] = useState(Date.now());
  const [gps, setGps] = useState({ status: "waiting", msg: "" });
  const [phase, setPhase] = useState(initial.resumed ? "resume" : "live"); // resume | live | summary
  const [wake, setWake] = useState(null);
  const [cues, setCues] = useState(s.settings?.runCues !== false);
  const watchRef = useRef(null), wakeRef = useRef(null), lastSave = useRef(0), cuedMiles = useRef(initial.splits?.length || 0), hiddenAt = useRef(null);
  const [gapNote, setGapNote] = useState("");
  const [SimDock, setSimDock] = useState(null);
  const simOn = import.meta.env.DEV && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("simrun") === "1";
  const guide = useMemo(() => (initial.guide ? decodePoly(initial.guide.poly) : null), [initial.guide]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (typeof window === "undefined" || new URLSearchParams(window.location.search).get("simrun") !== "1") return;
    let alive = true;
    import("./devSimRun.jsx").then((m) => { if (alive) setSimDock(() => m.SimRunDock); });
    return () => { alive = false; };
  }, []);

  const startWatch = () => {
    if (simOn) { setGps({ status: "ok", msg: "sim" }); return; }
    if (!navigator.geolocation) { setGps({ status: "error", msg: "This browser can't use GPS." }); return; }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy || 50, t: pos.timestamp || Date.now() };
        setGps({ status: fix.acc > 35 ? "weak" : "ok", msg: `±${Math.round(fix.acc)} m` });
        setRun((r) => addFix(r, fix));
      },
      (err) => setGps({ status: "error", msg: err.code === 1 ? "Location is blocked. Allow it in Settings → Privacy → Location Services → Safari Websites." : "Searching for GPS…" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };
  const lockScreen = async () => {
    try { if (navigator.wakeLock) { wakeRef.current = await navigator.wakeLock.request("screen"); setWake(true); wakeRef.current.addEventListener?.("release", () => setWake(false)); } else setWake(false); } catch (e) { setWake(false); }
  };
  useEffect(() => {
    if (phase !== "live") return;
    startWatch(); lockScreen();
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const vis = () => {
      if (document.visibilityState === "hidden") { hiddenAt.current = Date.now(); return; }
      if (hiddenAt.current && Date.now() - hiddenAt.current > 20000) setGapNote(`GPS paused for ${Math.round((Date.now() - hiddenAt.current) / 1000)}s while the screen was off. The distance gets filled in with a straight line.`);
      hiddenAt.current = null; startWatch(); lockScreen();
    };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", vis); if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null; try { wakeRef.current?.release(); } catch (e) { /* ignore */ } };
  }, [phase]);
  // Crash-safe: keep the run on the phone every few seconds
  useEffect(() => { if (phase === "live" && Date.now() - lastSave.current > 4000) { lastSave.current = Date.now(); saveLive({ ...run, resumed: true }); } }, [run, phase]);
  // Tab title + mile cues
  useEffect(() => { if (phase === "live") document.title = `${run.mode === "walk" ? "🚶" : "🏃"} ${(run.dist / MI_M).toFixed(2)} mi · ${fmtDur(runElapsed(run, now))}`; return () => { document.title = "Ascend"; }; }, [now, phase, run.mode]);
  useEffect(() => {
    if (run.splits.length > cuedMiles.current) {
      cuedMiles.current = run.splits.length;
      SFX.tone(880, 0.15); SFX.tone(1320, 0.2, 0.18);
      if (cues) sterlingSay(s, `Mile ${run.splits.length}. ${Math.floor(run.splits[run.splits.length - 1] / 60)} minutes ${run.splits[run.splits.length - 1] % 60} seconds. Splendid.`);
    }
  }, [run.splits.length]);

  const el = runElapsed(run, now), miles = run.dist / MI_M;
  const avgPace = miles > 0.02 ? el / miles : Infinity, curPace = currentPace(run, now);
  const curSeg = openSegment(run);
  const segEl = curSeg ? segmentMovingSecs(curSeg, now, { pausedAt: run.pausedAt, isOpen: true }) : 0;
  const segMiles = (curSeg?.dist || 0) / MI_M;
  const segPace = segMiles > 0.02 ? segEl / segMiles : Infinity;
  const path = useMemo(() => run.pts.filter((x) => x[3] !== 2).map((x) => [x[0], x[1]]), [run.pts.length]);
  const me = run.last?.p || null;
  const liveLines = useMemo(() => [...(guide ? [{ pts: guide, color: C.mute, weight: 5, dash: "6 8", opacity: 0.8 }] : []), { pts: path, color: C.cyan }], [path, guide]);
  const preview = buildSavedRun(run, now);

  const pause = () => setRun((r) => toggleRunPause(r));
  const switchMode = (mode) => {
    setRun((r) => {
      if (r.mode === mode) return r;
      const next = switchRunMode(r, mode);
      SFX.tone(mode === "run" ? 880 : 520, 0.12);
      if (cues) sterlingSay(s, mode === "walk" ? "Walking" : "Running");
      return next;
    });
  };
  const stop = () => {
    setRun((r) => {
      const n = r.pausedAt ? toggleRunPause(r) : r;
      saveLive({ ...n, resumed: true, stopped: true });
      return n;
    });
    setPhase("summary");
  };
  const discard = () => ask("Discard this run? It won't be saved.", () => { clearLive(); onClose(); }, "Discard");
  const save = async () => {
    const r = runRef.current;
    const built = buildSavedRun(r);
    if (built.miles < 0.05) { ask("That run is under 0.05 miles. Discard it?", () => { clearLive(); onClose(); }, "Discard"); return; }
    const { xp } = workoutXp(s, built.exercises, null);
    const runInfo = { ...built.runInfo, hasMap: path.length > 1 };
    const workout = { id: r.id, date: today(), title: built.title, exercises: built.exercises, xp, volume: 0, minutes: Math.round(built.secs / 60), run: runInfo, startedAt: r.pts[0]?.[2] || Date.now() - built.secs * 1000 };
    if (path.length > 1) { try { await window.storage.set(`run:${r.id}`, encodePoly(thinPts(path)), false); } catch (e) { /* map just won't show */ } }
    setS((p) => addWorkout(p, workout));
    if (path[0]) fetchRunWeather(path[0][0], path[0][1]).then((wx) => { if (wx) setS((p) => ({ ...p, workouts: p.workouts.map((w) => (w.id === workout.id ? { ...w, run: { ...w.run, wx } } : w)) })); });
    gainXp(xp, built.xpLabel, `wo_${r.id}`);
    juice(built.miles >= 3 ? "pr" : "finish");
    postFeed(s, "run", built.feed, {}, `run_${r.id}`);
    clearLive(); onClose(workout);
  };

  const gpsColor = gps.status === "ok" ? C.green : gps.status === "weak" ? C.orange : gps.status === "error" ? C.red : C.dim;
  const shell = { position: "fixed", inset: 0, zIndex: 58, background: C.bg, color: C.text, paddingTop: "calc(env(safe-area-inset-top) + 8px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)", overflowY: "auto" };

  if (phase === "resume") {
    return (
      <div style={shell} className="px-5 flex flex-col justify-center">
        <div className="panel p-5 space-y-3 max-w-md mx-auto w-full">
          <div className="text-xl font-bold">Unfinished {run.mode === "walk" ? "walk" : "run"}</div>
          <div className="body text-sm" style={{ color: C.dim }}>{(run.dist / MI_M).toFixed(2)} mi so far. The app closed during it. Pick up where you left off, or finish and save it now.</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setRun((r) => ({ ...r, pausedAt: r.pausedAt || Date.now(), last: null })); setPhase("live"); }} className="btn py-3">Resume</button>
            <button onClick={() => { setRun((r) => ({ ...r, pausedTotal: r.pausedTotal + Math.max(0, Date.now() - (r.last?.t || r.startedAt)) })); setPhase("summary"); }} className="ghost py-3 font-semibold">Finish & save</button>
          </div>
          <button onClick={discard} className="body text-sm w-full" style={{ color: C.dim }}>Discard</button>
        </div>
      </div>
    );
  }

  if (phase === "summary") {
    const secs = runElapsed(run);
    const sum = preview;
    return (
      <div style={shell} className="px-5">
        <div className="max-w-md mx-auto space-y-4 pt-2">
          <div className="text-2xl font-bold">{sum.title} complete</div>
          {path.length > 1 ? <RouteMap lines={[...(guide ? [{ pts: guide, color: C.mute, weight: 4, dash: "6 8", opacity: 0.7 }] : []), { pts: path, color: C.cyan, startDot: true }]} height={220} /> : <div className="panel p-4 body text-sm" style={{ color: C.dim }}>No GPS path was recorded.</div>}
          <div className="grid grid-cols-3 gap-2">
            {[["Distance", `${miles.toFixed(2)} mi`], ["Time", fmtDur(secs)], ["Avg pace", `${fmtPace(miles > 0 ? secs / miles : Infinity)}`]].map(([l, v]) => <div key={l} className="panel py-3 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="text-lg font-bold tabular-nums">{v}</div></div>)}
          </div>
          {runBreakdown(sum.runInfo) ? <div className="panel p-3 body text-sm font-semibold">{runBreakdown(sum.runInfo)}</div> : null}
          {sum.slowNote && <div className="body text-sm" style={{ color: C.orange }}>{sum.slowNote}</div>}
          {run.splits.length > 0 && <div className="panel p-4"><div className="font-semibold text-sm mb-2">Splits</div>{run.splits.map((sp, i) => <div key={i} className="flex justify-between body text-sm py-0.5"><span style={{ color: C.dim }}>Mile {i + 1}</span><span className="tabular-nums font-semibold">{fmtDur(sp)}</span></div>)}</div>}
          {run.gapM > 30 && <div className="body text-xs" style={{ color: C.orange }}>{(run.gapM / MI_M).toFixed(2)} mi was filled in while GPS was paused (screen off).</div>}
          <button onClick={save} className="btn w-full py-4 text-lg">Save {sum.title === "Run/Walk" ? "run/walk" : sum.title.toLowerCase()}</button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setPhase("live")} className="ghost py-3 font-semibold">Keep going</button>
            <button onClick={discard} className="py-3 font-semibold" style={{ borderRadius: 12, color: "#FF4D6D", border: "1px solid rgba(255,77,109,.4)" }}>Discard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={shell} className="px-4">
      <div className="max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 body text-xs font-semibold" style={{ color: gpsColor }}><span style={{ width: 8, height: 8, borderRadius: 999, background: gpsColor, boxShadow: `0 0 8px ${gpsColor}` }} />{gps.status === "waiting" ? "Finding GPS…" : gps.status === "weak" ? `Weak GPS ${gps.msg}` : gps.status === "error" ? "GPS problem" : `GPS ${gps.msg}`}</div>
          <button onClick={() => setCues(!cues)} className="body text-xs flex items-center gap-1" style={{ color: cues ? C.cyan : C.mute }}>{cues ? <Volume2 size={14} /> : <VolumeX size={14} />}Mile cues</button>
        </div>
        {gps.status === "error" && <div className="body text-xs" style={{ color: C.red }}>{gps.msg}</div>}
        <div className="grid grid-cols-2 gap-1 p-1" role="tablist" aria-label="Walking or running" style={{ borderRadius: 16, background: C.glass, border: `1px solid ${C.glassLine}` }}>
          {[["walk", "Walking"], ["run", "Running"]].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={run.mode === id} onClick={() => switchMode(id)} className="text-base font-bold" style={{ minHeight: 48, borderRadius: 12, touchAction: "manipulation", background: run.mode === id ? (id === "run" ? C.green : C.cyan) : "transparent", color: run.mode === id ? "#021a0c" : C.text }}>{label}</button>
          ))}
        </div>
        {SimDock && <SimDock onFix={(fix) => { setGps({ status: "ok", msg: "sim" }); setRun((r) => addFix(r, fix)); }} origin={me} />}
        <RouteMap lines={liveLines} follow={me} height={Math.min(300, typeof window !== "undefined" ? window.innerHeight * 0.34 : 260)} />
        <div className="text-center pt-1">
          <div className="text-7xl font-black tabular-nums tracking-tight">{miles.toFixed(2)}</div>
          <div className="body text-sm -mt-1" style={{ color: C.dim }}>miles</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[["Time", fmtDur(el)], ["Pace now", fmtPace(curPace)], ["Avg pace", fmtPace(avgPace)]].map(([l, v]) => <div key={l} className="panel py-3 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="text-xl font-bold tabular-nums">{v}</div></div>)}
        </div>
        <div className="panel py-3 px-4 flex items-center justify-between gap-3">
          <div className="body text-xs font-semibold" style={{ color: C.dim }}>{run.mode === "walk" ? "This walk" : "This run"}</div>
          <div className="text-sm font-bold tabular-nums">{fmtDur(segEl)} · {fmtPace(segPace)} /mi</div>
        </div>
        {run.pausedAt && <div className="text-center font-bold" style={{ color: C.orange }}>Paused</div>}
        {gapNote && <div className="body text-xs text-center" style={{ color: C.orange }}>{gapNote}</div>}
        {wake === false && !simOn && <div className="body text-xs text-center" style={{ color: C.dim }}>Keep Ascend open with the screen on. iPhone pauses GPS for websites when the screen locks.</div>}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={pause} className="py-4 text-lg font-bold flex items-center justify-center gap-2" style={{ borderRadius: 16, background: run.pausedAt ? C.green : C.glass, color: run.pausedAt ? "#02040B" : C.text, border: `1px solid ${C.glassLine}` }}>{run.pausedAt ? <><Play size={20} />Resume</> : <><Pause size={20} />Pause</>}</button>
          <button onClick={stop} className="py-4 text-lg font-bold flex items-center justify-center gap-2" style={{ borderRadius: 16, background: "#FF2D55", color: "#fff" }}><X size={20} />Finish</button>
        </div>
      </div>
    </div>
  );
}
