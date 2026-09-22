import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Pause, Play, RotateCcw, Timer as TimerIcon } from "lucide-react";
import { C } from "../../theme.js";
import { Beeper, fmtClock } from "../train/beeper.js";
import { IntervalStepper } from "./IntervalStepper.jsx";
export function IntervalTimer({ visible, onBack, onOpen }) {
  const [work, setWork] = useState(20);
  const [rest, setRest] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [run, setRun] = useState(null); // { phase, left, round, paused }
  const runRef = useRef(null); runRef.current = run;
  const cfgRef = useRef({}); cfgRef.current = { work, rest, rounds };
  const wakeRef = useRef(null);

  useEffect(() => {
    if (!run || run.paused || run.phase === "done") return;
    const id = setInterval(() => {
      const r = runRef.current, cfg = cfgRef.current;
      if (!r || r.paused) return;
      let { phase, left, round } = r;
      left -= 1;
      if (left > 0) {
        if (left <= 3) Beeper.tick();
        setRun({ ...r, left });
        return;
      }
      if (phase === "ready" || (phase === "rest")) {
        if (phase === "rest") round += 1;
        Beeper.work(); setRun({ phase: "work", left: cfg.work, round, paused: false });
      } else if (phase === "work") {
        if (cfg.rounds > 0 && round >= cfg.rounds) { Beeper.done(); setRun({ phase: "done", left: 0, round, paused: false }); releaseWake(); }
        else if (cfg.rest > 0) { Beeper.rest(); setRun({ phase: "rest", left: cfg.rest, round, paused: false }); }
        else { Beeper.work(); setRun({ phase: "work", left: cfg.work, round: round + 1, paused: false }); }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [run?.paused, run?.phase, !!run]);

  const releaseWake = () => { try { wakeRef.current?.release(); } catch (e) { /* ignore */ } wakeRef.current = null; };
  useEffect(() => { if (run && run.phase !== "done") document.title = `${run.paused ? "❚❚" : "⏱"} ${run.phase === "work" ? "Work" : run.phase === "rest" ? "Rest" : "Ready"} ${fmtClock(run.left)} · Ascend`; else document.title = "Ascend"; }, [run?.left, run?.phase, run?.paused]);
  useEffect(() => () => releaseWake(), []);

  const start = async () => {
    Beeper.unlock(); Beeper.tick();
    setRun({ phase: "ready", left: 3, round: 1, paused: false });
    try { wakeRef.current = await navigator.wakeLock?.request("screen"); } catch (e) { /* not supported */ }
  };
  const stop = () => { setRun(null); releaseWake(); };

  const phaseColor = !run ? C.cyan : run.phase === "work" ? C.green : run.phase === "rest" ? C.orange : run.phase === "done" ? C.gold : C.cyan;
  const phaseTotal = !run ? work : run.phase === "work" ? work : run.phase === "rest" ? rest : 3;
  const pct = run && run.phase !== "done" ? run.left / phaseTotal : 1;
  const R = 110, CIRC = 2 * Math.PI * R;
  const totalTime = rounds > 0 ? rounds * work + (rounds - 1) * rest : null;

  // Floating mini timer on other pages while it's running
  if (!visible) {
    if (!run || run.phase === "done") return null;
    return (
      <button onClick={onOpen} aria-label="Open interval timer" className="fixed z-40 flex items-center gap-2 px-3 py-2 font-bold tabular-nums" style={{ left: 16, bottom: "calc(env(safe-area-inset-bottom) + 90px)", borderRadius: 999, background: C.sheet, color: phaseColor, border: `1px solid ${phaseColor}`, boxShadow: `0 0 16px ${phaseColor}66` }}>
        <TimerIcon size={16} />{run.phase === "work" ? "Work" : run.phase === "rest" ? "Rest" : "Ready"} {fmtClock(run.left)}{run.paused ? " ❚❚" : ""}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Interval timer</h1>
      </div>

      <div className="panel p-5 flex flex-col items-center">
        <svg width="250" height="250" viewBox="0 0 250 250" role="img" aria-label={run ? `${run.phase} ${run.left} seconds` : "Timer ready"}>
          <circle cx="125" cy="125" r={R} fill="none" stroke={C.track} strokeWidth="14" />
          <circle cx="125" cy="125" r={R} fill="none" stroke={phaseColor} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${CIRC * pct} ${CIRC}`} transform="rotate(-90 125 125)" style={{ transition: "stroke-dasharray 1s linear", filter: `drop-shadow(0 0 8px ${phaseColor})` }} />
          <text x="125" y="108" textAnchor="middle" fill={phaseColor} fontSize="20" fontWeight="700" style={{ letterSpacing: 3 }}>{!run ? "READY" : run.phase === "done" ? "DONE" : run.phase.toUpperCase()}</text>
          <text x="125" y="160" textAnchor="middle" fill={C.text} fontSize="58" fontWeight="800" style={{ fontVariantNumeric: "tabular-nums" }}>{run ? (run.phase === "done" ? "✓" : fmtClock(run.left)) : fmtClock(work)}</text>
          <text x="125" y="190" textAnchor="middle" fill={C.dim} fontSize="14">{run ? `Round ${run.round}${rounds > 0 ? ` of ${rounds}` : ""}` : rounds > 0 ? `${rounds} rounds · ${fmtClock(totalTime)} total` : "Endless rounds"}</text>
        </svg>

        <div className="flex gap-3 mt-3 w-full">
          {!run || run.phase === "done" ? (
            <button onClick={start} className="btn flex-1 py-4 text-lg flex items-center justify-center gap-2"><Play size={20} />Start</button>
          ) : (
            <>
              <button onClick={() => { Beeper.unlock(); setRun({ ...run, paused: !run.paused }); }} className="btn flex-1 py-4 text-lg flex items-center justify-center gap-2">{run.paused ? <><Play size={20} />Resume</> : <><Pause size={20} />Pause</>}</button>
              <button onClick={stop} aria-label="Reset timer" className="ghost px-5 flex items-center justify-center"><RotateCcw size={20} /></button>
            </>
          )}
        </div>
      </div>

      <div className="body text-xs" style={{ color: C.dim }}>Quick picks</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[["Tabata", 20, 10, 8], ["30 / 15", 30, 15, 10], ["40 / 20", 40, 20, 8], ["Every 10s", 10, 0, 0], ["EMOM", 60, 0, 10]].map(([n, w, r, rd]) => (
          <button key={n} disabled={!!run} onClick={() => { setWork(w); setRest(r); setRounds(rd); }} className="ghost px-3 py-2 text-sm font-semibold whitespace-nowrap shrink-0" style={{ color: work === w && rest === r && rounds === rd ? C.cyan : C.text, borderColor: work === w && rest === r && rounds === rd ? C.cyan : C.border }}>{n}</button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <IntervalStepper label="Work" value={work} set={setWork} step={5} min={5} max={600} fmt={fmtClock} disabled={!!run} />
        <IntervalStepper label="Rest" value={rest} set={setRest} step={5} min={0} max={300} fmt={(v) => (v ? fmtClock(v) : "None")} disabled={!!run} />
        <IntervalStepper label="Rounds" value={rounds} set={setRounds} step={1} min={0} max={99} fmt={(v) => (v ? v : "∞")} disabled={!!run} />
      </div>
      <div className="body text-xs" style={{ color: C.mute }}>It beeps when each work or rest period starts, with a countdown tick for the last 3 seconds. Set rest to None to beep every interval nonstop. The timer keeps running if you switch tabs. Turn off silent mode to hear the beeps.</div>
    </div>
  );
}

/* ---------- Deck of cards ---------- */
