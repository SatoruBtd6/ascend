import { useState, useEffect, useMemo, useRef } from "react";
import { Footprints, Layers, Trash2, Share2, Check, ChevronDown, Pencil, Plus, X, Bookmark, Repeat, TrendingUp, Video, CircleDot, Link2, MoreHorizontal } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { isLegacyAssisted, workoutGym, collectPrHistory, gymSpecificNamesIn } from "../../math.js";
import { findEx } from "../../lib/exercises.js";
import { computeBests, workoutXp, workoutRecap, addWorkout, prNote, overallInfo, movedLb, assistedReps } from "../../lib/stats.js";
import { today, fmtDay, uid } from "../../lib/dates.js";
import { ask } from "../../lib/ask.js";
import { Title, Empty, Sheet } from "../../ui/primitives.jsx";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { NumField } from "../../ui/NumField.jsx";
import { DiagProbe } from "../../ui/DiagProbe.jsx";
import { gymLabel, pastSessions, cloneSets, lastWorkingSets, lastWorkout, lastPresetWorkout, copyWorkoutExercises, applyTargetSets, setLabel, suggestNext, stalledLifts, withSilentRankSnap } from "./helpers.js";
import { WorkoutRecap } from "./WorkoutRecap.jsx";
import { ExercisePicker } from "./ExercisePicker.jsx";
import { TitlePicker } from "./TitlePicker.jsx";
import { Timer } from "./Timer.jsx";
import { WarmUp } from "./WarmUp.jsx";
import { RestDock, fireRest } from "./rest.jsx";
import { PlateSheet } from "./PlateSheet.jsx";
import { FormCheck } from "./FormCheck.jsx";
import { TrainCoach } from "./TrainCoach.jsx";
import { SharedPresets } from "./SharedPresets.jsx";
import { PlanGenerator } from "./PlanGenerator.jsx";
import { SharePreset } from "./SharePreset.jsx";
import { ReceiptButton, buildReceipt } from "./receipt.jsx";
import { postFeed, workoutPayload } from "./social.js";
import { juice } from "./juice.js";
import { SFX } from "./sfx.js";
import { Beeper } from "./beeper.js";
import { noteRaidHitFor } from "./raidIO.js";
import { applyPrXpRecount } from "./xpRecount.js";
import { XpSync } from "./xpSync.js";
export function Train({ s, setS, gainXp, openRun }) {
  D.noteRender("Train");
  useEffect(() => {
    if (!D.on()) return;
    const n = D.nextSeq();
    D.push({ k: "mount", kind: "Train", n });
    return () => D.push({ k: "unmount", kind: "Train", n });
  }, []);
  const [picker, setPicker] = useState(false);
  const [plates, setPlates] = useState(null);
  const [titling, setTitling] = useState(false);
  const [filter, setFilter] = useState("All");
  const [showPresets, setShowPresets] = useState(false);
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [open, setOpen] = useState({});
  const [exMenu, setExMenu] = useState(null);
  const [addMenu, setAddMenu] = useState(null);
  const [pastOpen, setPastOpen] = useState({});
  const [formResults, setFormResults] = useState({});
  const [formSheet, setFormSheet] = useState(null);
  const [wuOpen, setWuOpen] = useState(false);
  const doneTapRef = useRef({});
  const setHintKey = () => `ascend-set-type-hint:${typeof window !== "undefined" ? (window.ascendUserId || "anon") : "anon"}`;
  const [setHint, setSetHint] = useState(() => { try { return localStorage.getItem(setHintKey()) !== "1"; } catch { return true; } });
  const dismissSetHint = () => { setSetHint(false); try { localStorage.setItem(setHintKey(), "1"); } catch { /* */ } };
  useEffect(() => {
    if (exMenu == null && addMenu == null) return;
    const close = (e) => {
      if (e.target.closest?.("[data-keep-menu]")) return;
      setExMenu(null); setAddMenu(null);
    };
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", close); };
  }, [exMenu, addMenu]);
  const a = s.active;
  const bests = useMemo(
    () => computeBests(a?.editId ? { ...s, workouts: (s.workouts || []).filter((w) => w.id !== a.editId) } : s),
    [s.workouts, s.profile, s.custom, s.community, s.currentGym, s.gymSpecific, a?.editId]
  );
  const stalled = useMemo(
    () => stalledLifts(s),
    [s.workouts, s.profile, s.custom, s.community, s.currentGym, s.gymSpecific]
  );
  const setActive = (fn) => D.withSource("setActive", () => setS((p) => {
    const next = fn(p.active);
    if (next == null) return { ...p, active: null };
    if (!Array.isArray(next.exercises)) return { ...p, active: { ...next, exercises: [] } };
    return { ...p, active: next };
  }));
  const lastSets = (name) => lastWorkingSets(s, name, a?.editId)?.sets || [];
  const cleaned = (ws) => ws.map((e) => ({ ...e, sets: e.sets.filter((st) => st.done && +st.r > 0) })).filter((e) => e.sets.length);
  const sessionGym = () => (a.gym !== undefined ? a.gym : s.currentGym) ?? null;
  const xpOpts = () => ({ history: collectPrHistory(s, findEx, { excludeId: a?.editId }), workout: { gym: sessionGym(), date: a?.date || today() }, excludeId: a?.editId });

  const finish = () => {
    const exercises = cleaned(a.exercises);
    if (!exercises.length) { setS((p) => ({ ...p, active: null })); return; }
    const opts = xpOpts();
    if (a.editId) {
      const old = s.workouts.find((w) => w.id === a.editId);
      const res = workoutXp(s, exercises, { ...bests }, opts);
      const delta = res.xp - (old?.xp || 0);
      const newGym = a.gym !== undefined ? a.gym : old?.gym;
      const gymChanged = workoutGym({ gym: newGym }) !== workoutGym(old);
      setS((p) => {
        let next = { ...p, active: null, workouts: p.workouts.map((w) => w.id === a.editId ? { ...w, title: a.title || "", exercises, volume: res.volume, xp: res.xp, lines: res.lines, prBonus: res.prBonus, gym: newGym } : w) };
        if (gymChanged) {
          const names = gymSpecificNamesIn(next, [{ ...old, gym: newGym, exercises }], findEx);
          if (names.length) {
            const r = applyPrXpRecount(next, { names, banner: false });
            try { XpSync.replace(r.rows); } catch (e) { /* offline */ }
            return withSilentRankSnap(r.s);
          }
        }
        return next;
      });
      if (!gymChanged) gainXp(delta, "Workout updated", `wo_${a.editId}_e${Date.now().toString(36)}`);
      return;
    }
    const { xp, prs, volume, lines, prBonus, sets } = workoutXp(s, exercises, { ...bests }, opts);
    const d = today();
    const workout = { id: uid(), date: d, title: a.title || "", preset: a.preset || "", exercises, volume, xp, lines, prBonus, minutes: Math.round((Date.now() - a.start) / 60000), startedAt: a.start, ...(((a.gym !== undefined ? a.gym : s.currentGym) || null) ? { gym: a.gym !== undefined ? a.gym : s.currentGym } : {}) };
    const after = { ...s, workouts: [...s.workouts, workout] };
    const suggestions = exercises.map((e) => ({ name: e.name, next: suggestNext(after, e.name) })).filter((x) => x.next);
    setS((p) => ({ ...addWorkout(p, workout), active: null, lastSummary: { xp, prs, volume, minutes: workout.minutes, title: workout.title, suggestions, prNames: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => l.name), recap: workoutRecap({ ...p, workouts: [...p.workouts, workout] }, workout), sets, workoutId: workout.id } }));
    noteRaidHitFor(s, setS, workout);
    juice(prs ? "pr" : "finish");
    if (prs) { postFeed(s, "pr", `set ${prs} new PR${prs > 1 ? "s" : ""}${workout.title ? ` on ${workout.title} day` : ""}`, { detail: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => `${l.name} ${l.sets.filter((st) => st.pr).map((st) => st.label).join(", ")}`).join(" · ") }, `pr_${workout.id}`); }
    gainXp(xp, prs ? `Workout · ${prs} new PR${prs > 1 ? "s" : ""}` : "Workout complete", `wo_${workout.id}`);
    fireRest(null);
  };

  const addExercise = (name) => {
    const prev = lastWorkingSets(s, name, a?.editId);
    setActive((w) => ({ ...w, exercises: [...w.exercises, { name, sets: prev ? cloneSets(prev.sets) : [{ w: "", r: "", done: false }] }] }));
    setPicker(false);
    window.scrollTo?.(0, 0);
  };
  const startPreset = (pr) => {
    setS((p) => ({ ...p, active: { start: Date.now(), preset: pr.name, title: pr.name, gym: p.currentGym ?? null, exercises: (pr.exercises || []).map((e) => ({ name: e.name, ...(e.wMode ? { wMode: e.wMode } : {}), sets: e.plan?.length ? e.plan.map((st) => ({ w: st.w ?? "", r: st.r ?? "", done: false })) : Array.from({ length: e.sets || 3 }, () => ({ w: "", r: "", done: false })) })) } }));
    setShowPresets(false); window.scrollTo?.(0, 0);
  };
  const savePreset = () => {
    const name = presetName.trim() || `Preset ${(s.presets || []).length + 1}`;
    const exercises = a.exercises.map((e) => ({ name: e.name, sets: e.sets.length }));
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), { id: uid(), name, exercises }] }));
    setNaming(false); setPresetName("");
  };
  const editWorkout = (w) => {
    setS((p) => ({ ...p, active: { start: Date.now(), editId: w.id, date: w.date, title: w.title || "", gym: w.gym ?? null, exercises: (w.exercises || []).map((e) => ({ name: e.name, sets: (e.sets || []).map((st) => ({ w: st.w ?? "", r: st.r ?? "", done: true, drop: !!st.drop, ...(st.warm ? { warm: true } : {}) })) })) } }));
    window.scrollTo?.(0, 0);
  };

  if (a && picker) return <ExercisePicker s={s} setS={setS} onPick={addExercise} onBack={() => setPicker(false)} />;
  if (!a && titling) return <TitlePicker s={s} onBack={() => setTitling(false)} onPick={(title) => { setTitling(false); setS((p) => ({ ...p, active: { start: Date.now(), title, gym: p.currentGym ?? null, exercises: [] } })); window.scrollTo?.(0, 0); }} />;

  if (!a) {
    const presets = s.presets || [];
    return (
      <div className="space-y-4">
        <Title right={<SaveMark />}>Train</Title>
        <div className="grid gap-2" style={{ gridTemplateColumns: "1.6fr 1fr 1fr" }}>
          <button type="button" onClick={() => setTitling(true)} className="btn py-4 text-lg">Start workout</button>
          <button type="button" onClick={openRun} className="ghost py-4 font-bold flex items-center justify-center gap-2" style={{ color: C.green }}><Footprints size={18} />Run</button>
          <button type="button" onClick={() => setShowPresets(!showPresets)} className="ghost py-4 font-bold flex items-center justify-center gap-2" style={{ color: showPresets ? C.cyan : C.text, borderColor: showPresets ? C.cyan : C.border }}><Layers size={18} />Presets</button>
        </div>
        {showPresets && (
          <div className="panel p-4 space-y-2">
            <div className="font-bold flex items-center gap-2">Workout presets<SaveMark /></div>
            {presets.length === 0 && <div className="body text-sm" style={{ color: C.dim }}>None yet. Start a workout, add your exercises, then tap "Save as preset" at the bottom. Next time, load it and just fill in the numbers.</div>}
            <SharedPresets s={s} setS={setS} />
            <PlanGenerator s={s} setS={setS} />
            {presets.map((pr) => (
              <div key={pr.id} className="ghost flex items-center">
                <button onClick={() => startPreset(pr)} className="flex-1 text-left p-3 min-w-0">
                  <div className="font-semibold">{pr.name}</div>
                  <div className="body text-xs truncate" style={{ color: C.dim }}>{pr.exercises.map((e) => `${e.name} ×${e.sets}`).join(" · ")}</div>
                </button>
                <button aria-label={`Delete preset ${pr.name}`} onClick={() => ask(`Delete preset "${pr.name}"?`, () => setS((p) => ({ ...p, presets: p.presets.filter((x) => x.id !== pr.id) })), "Delete")} className="px-3" style={{ color: C.mute }}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}

        {s.lastSummary && <WorkoutRecap s={s} setS={setS} />}

        <h2 className="text-lg font-bold pt-2">History</h2>
        {(() => { const titles = [...new Set(s.workouts.map((w) => w.title).filter(Boolean))]; return titles.length ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["All", ...titles].map((t) => <button key={t} onClick={() => setFilter(t)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: filter === t ? C.blue : C.soft, color: filter === t ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{t}</button>)}
          </div>
        ) : null; })()}
        {s.workouts.length === 0 && <Empty>No workouts yet. XP comes from how much you lift and how many reps you do, scaled to your body and rank.</Empty>}
        {[...s.workouts].reverse().filter((w) => filter === "All" || w.title === filter).slice(0, 25).map((w) => {
          const isOpen = !!open[w.id];
          return (
            <div key={w.id} className="panel p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{w.title ? <span style={{ color: C.cyan }}>{w.title} · </span> : null}{fmtDay(w.date)}{gymLabel(s, workoutGym(w)) ? <span className="body text-xs ml-2" style={{ color: C.mute }}>{gymLabel(s, workoutGym(w))}</span> : null}{w.source && w.source !== "import" && <span className="body text-xs ml-2" style={{ color: C.cyan }}>{w.source === "deck" ? "card deck" : "from quest"}</span>}{w.source === "import" && <span className="body text-xs ml-2" style={{ color: C.mute }}>imported</span>}</span>
                <div className="flex items-center gap-3">
                  {w.xp ? <button onClick={() => setOpen((o) => ({ ...o, [w.id]: !isOpen }))} className="text-sm font-bold flex items-center gap-1" style={{ color: C.gold }}>+{w.xp} XP<ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none" }} /></button> : null}
                  {!w.source && s.lb && <button aria-label={w.shared ? "Shared to feed" : "Share to feed"} disabled={w.shared} onClick={() => { if (w.shared) return; postFeed(s, "workout", `finished a ${w.title ? `${w.title} ` : ""}workout · +${w.xp || 0} XP`, { detail: w.exercises.map((ex) => ex.name).join(", "), workout: workoutPayload(s, w) }, `workout_${w.id}`); setS((p) => ({ ...p, workouts: p.workouts.map((x) => (x.id === w.id ? { ...x, shared: true } : x)) })); }} style={{ color: w.shared ? C.green : C.cyan }}>{w.shared ? <Check size={16} /> : <Share2 size={16} />}</button>}
                  {!w.source && s.lb && <SharePreset s={s} workout={w} />}
                  {!w.source && <ReceiptButton small label="Share card" make={() => buildReceipt({ s, kind: "Workout", headline: w.title ? `${w.title} day` : "Workout", sub: fmtDay(w.date), tierImg: Math.floor(overallInfo(s).score), rows: [["XP earned", `+${w.xp || 0}`], ["Volume", `${Math.round(w.volume || 0).toLocaleString()} lb`], ["Exercises", w.exercises.length], ["Sets", w.exercises.reduce((a, e) => a + e.sets.length, 0)]] })} />}
                  <button aria-label="Edit workout" onClick={() => editWorkout(w)} style={{ color: C.cyan }}><Pencil size={16} /></button>
                  <button aria-label="Delete workout" onClick={() => ask(w.xp ? `Delete this workout? Its ${w.xp.toLocaleString()} XP comes off your total.` : "Delete this workout?", () => { setS((p) => ({ ...p, workouts: p.workouts.filter((x) => x.id !== w.id) })); gainXp(-(w.xp || 0), `Deleted workout${w.title ? `: ${w.title}` : ""}`, `wo_${w.id}_del`); }, "Delete")} style={{ color: C.mute }}><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="body text-sm mt-1 space-y-0.5" style={{ color: C.sub }}>
                {w.exercises.map((ex, i) => {
                  const def = findEx(s, ex.name);
                  return <div key={i}>{ex.name}: {ex.sets.map((st) => setLabel(def, st)).join(", ")}{isLegacyAssisted(w, def) ? <span className="body text-xs ml-1" style={{ color: C.mute }}>legacy</span> : null}</div>;
                })}
              </div>
              {isOpen && (
                <div className="mt-3 pt-3 body text-xs space-y-1" style={{ borderTop: `1px solid ${C.line}`, color: C.dim }}>
                  <div className="font-bold" style={{ color: C.text }}>XP breakdown</div>
                  {w.lines ? w.lines.map((l, i) => (
                    <div key={i}>
                      <div className="flex justify-between font-semibold" style={{ color: C.sub }}><span>{l.name}</span><span style={{ color: C.gold }}>+{l.xp}</span></div>
                      {l.sets.map((st, j) => <div key={j} className="flex justify-between pl-3"><span>{st.label} · {st.note}{prNote(st.pr)}</span><span>+{st.xp}</span></div>)}
                    </div>
                  )) : <div>Logged before detailed breakdowns existed.</div>}
                  {w.prBonus ? <div className="flex justify-between font-semibold" style={{ color: C.green }}><span>PR bonus</span><span>+{w.prBonus}</span></div> : null}
                  {w.volume ? <div className="pt-1">Volume {Math.round(w.volume).toLocaleString()} lb{w.minutes ? ` · ${w.minutes} min` : ""}</div> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const live = workoutXp(s, cleaned(a.exercises), { ...bests }, xpOpts());
  const hasWork = a.exercises.some((e) => e.sets.some((st) => st.done));

  return (
    <div className="space-y-4" data-diag="settable">
      <div className="flex justify-between items-center">
        <div>
          {a.editId ? <div className="text-xl font-bold glowtext flex items-center gap-2 flex-wrap">Editing {fmtDay(a.date)}<SaveMark /></div> : (
            <div className="flex items-center gap-2 flex-wrap">
              <Timer start={a.start} />
              <SaveMark />
              <WarmUp s={s} a={a} setActive={setActive} compact open={wuOpen} onOpenChange={setWuOpen} />
            </div>
          )}
          <input className="inp text-sm mt-1" style={{ maxWidth: 190, padding: "4px 8px" }} placeholder="Workout title" value={a.title || ""} onChange={(e) => setActive((w) => ({ ...w, title: e.target.value }))} aria-label="Workout title" />
          {(s.gyms || []).length > 0 && (
            <select className="inp text-sm mt-1" style={{ maxWidth: 190, padding: "4px 8px" }} aria-label="Workout gym" value={a.gym || s.currentGym || ""} onChange={(e) => setActive((w) => ({ ...w, gym: e.target.value || null }))}>
              <option value="">No gym</option>
              {(s.gyms || []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <div className="text-sm font-bold" style={{ color: C.gold }}>≈ {live.xp} XP{live.prs ? ` · ${live.prs} PR${live.prs > 1 ? "s" : ""}` : ""}</div>
        </div>
        <button onClick={finish} className="px-5 py-2.5 text-sm font-bold" style={{ background: C.green, color: "#02040B", borderRadius: 4, boxShadow: "0 0 16px rgba(79,209,139,.5)", minHeight: 40 }}>{a.editId ? "Save changes" : "Finish"}</button>
      </div>

      {!a.editId && wuOpen && <WarmUp s={s} a={a} setActive={setActive} open={wuOpen} onOpenChange={setWuOpen} />}
      {!a.editId && (() => {
        // Overload only makes sense on a preset you've already finished once, so there's a session to beat
        const pl = a.preset ? lastPresetWorkout(s, a.preset) : null;
        if (!pl) return null;
        return (
          <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: pl.exercises.map((e) => ({ name: e.name, ...(e.wMode ? { wMode: e.wMode } : {}), ss: !!e.ss, sets: applyTargetSets(e.sets, suggestNext(s, e.name, a.editId)) })) }))} className="ghost w-full py-2.5 font-bold text-sm flex items-center justify-center gap-2" style={{ color: C.green, borderColor: C.green }}>
            <TrendingUp size={16} />Overload last session · {a.preset} · {fmtDay(pl.date)}
          </button>
        );
      })()}
      {a.exercises.length === 0 && !a.editId && (() => {
        const last = lastWorkout(s, a.title, true);
        if (!last) return null;
        return (
          <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: copyWorkoutExercises(last) }))} className="ghost w-full py-3 font-bold text-sm flex items-center justify-center gap-2" style={{ color: C.cyan, borderColor: C.cyan }}>
            <Repeat size={16} />Same as last time{last.title ? ` · ${last.title}` : ""} · {fmtDay(last.date)}
          </button>
        );
      })()}
      {a.exercises.length === 0 && <Empty>Add your first exercise. Check off each set as you finish it, and only checked sets count.</Empty>}

      {a.exercises.map((ex, ei) => {
        const def = findEx(s, ex.name);
        const timed = def.type === "timed";
        const cardio = timed && def.group === "Cardio";
        const showW = !timed || cardio;
        const prev = lastSets(ex.name);
        const past = pastSessions(s, ex.name, a.editId, 3);
        const upd = (si, patch) => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, ...patch }) }) }));
        const delSet = (si) => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }) }));
        const cols = showW ? "40px 1fr 1fr 1fr 40px 40px" : "40px 1fr 1fr 40px 40px";
        const mode = ex.wMode || (def.perHand ? "hand" : "total");
        const sg = suggestNext(s, ex.name, a.editId, stalled);
        const lastAssisted = [...ex.sets].reverse().find((st) => def.type === "assisted" && (+st.w > 0 || +st.r > 0));
        const cycleType = (si, st) => {
          dismissSetHint();
          if (st.warm) {
            if (timed) { upd(si, { warm: false }); return; }
            upd(si, { warm: false, drop: true, w: +st.w > 0 ? String(Math.round(+st.w * 0.8)) : st.w });
            return;
          }
          if (st.drop) { upd(si, { drop: false }); return; }
          upd(si, { warm: true, drop: false });
        };
        const addWorking = () => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: [...e.sets, { w: e.sets.at(-1)?.w || "", r: "", done: false }] }) }));
        const addDrop = () => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => {
          if (i !== ei) return e;
          const last = [...e.sets].reverse().find((st) => +st.w > 0) || e.sets.at(-1) || { w: "", r: "" };
          const dropW = +last.w > 0 ? String(Math.round(+last.w * 0.8)) : (last.w || "");
          return { ...e, sets: [...e.sets, { w: dropW, r: last.r || "", done: false, drop: true }] };
        }) }));
        const addWarm = () => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i !== ei ? e : { ...e, sets: [...e.sets, { w: "", r: "", done: false, warm: true }] })) }));
        const removeEx = () => {
          const go = () => setActive((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== ei) }));
          if (ex.sets.some((st) => st.done)) ask(`Remove ${ex.name}? Completed sets in this workout will be lost.`, go, "Remove");
          else go();
        };
        const typeLabel = (st, si) => (st.warm ? "Warm-up set, tap to change type" : st.drop ? "Drop set, tap to mark working" : `Set ${si + 1}, tap to mark warm-up`);
        return (
          <div key={ei} className="panel p-3 relative" style={ex.ss ? { borderColor: C.green, marginBottom: 0 } : a.exercises[ei - 1]?.ss ? { borderColor: C.green, borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 } : null}>
            {D.on() && <DiagProbe kind="excard" id={ei} />}
            {a.exercises[ei - 1]?.ss && <div className="body text-xs font-bold -mt-1 mb-1" style={{ color: C.green }}>⇅ superset with {a.exercises[ei - 1].name}</div>}
            <div className="flex justify-between items-center mb-1 gap-2">
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold glowtext" style={{ color: C.cyan }}>{ex.name}</span>
                <span className="body text-xs" style={{ color: C.mute }}>{def.group}</span>
                {ex.ss && <span className="body text-xs font-bold" style={{ color: C.green }}>ss</span>}
                {formResults[ex.name]?.text && (
                  <button type="button" aria-label={`Form check result for ${ex.name}`} onClick={() => setFormSheet({ name: ex.name, mode: "result" })} className="p-2" style={{ color: C.cyan, minWidth: 40, minHeight: 40 }}><Video size={16} /></button>
                )}
              </div>
              <button type="button" data-keep-menu aria-label={`More actions for ${ex.name}`} aria-haspopup="menu" aria-expanded={exMenu === ei} onClick={(e) => { e.stopPropagation(); setAddMenu(null); setExMenu(exMenu === ei ? null : ei); }} className="flex items-center justify-center shrink-0" style={{ minWidth: 40, minHeight: 40, color: C.mute }}><MoreHorizontal size={18} /></button>
            </div>
            {exMenu === ei && (
              <div role="menu" data-keep-menu className="absolute right-3 z-20 panel p-1" style={{ top: 44, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,.45)" }} onClick={(e) => e.stopPropagation()}>
                {def.type === "weighted" && !def.perHand && <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ minHeight: 40 }} onClick={() => { setPlates({ w: +ex.sets.find((st) => +st.w)?.w || +prev[0]?.w || 135 }); setExMenu(null); }}><CircleDot size={16} />Plate calculator</button>}
                {ei < a.exercises.length - 1 && <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ minHeight: 40, color: ex.ss ? C.green : C.text }} onClick={() => { setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === ei ? { ...e, ss: !e.ss } : e)) })); setExMenu(null); }}><Link2 size={16} />{ex.ss ? "Unlink superset" : "Superset with next"}</button>}
                {def.type === "weighted" && <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm" style={{ minHeight: 40 }} onClick={() => { setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, wMode: mode === "hand" ? "total" : "hand" }) })); setExMenu(null); }}>{mode === "hand" ? "Use total lb" : "Use per hand"}</button>}
                <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2" style={{ minHeight: 40 }} onClick={() => { setFormSheet({ name: ex.name, mode: "film" }); setExMenu(null); }}><Video size={16} />Film form check</button>
                <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm" style={{ minHeight: 40, color: C.red }} onClick={() => { setExMenu(null); removeEx(); }}>Remove exercise</button>
              </div>
            )}
            {prev.length > 0 && !a.editId && (
              <div className="mb-2">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: cloneSets(prev) }) }))} className="ghost py-2 text-xs font-bold flex items-center justify-center gap-1.5" style={{ color: C.cyan, minHeight: 40 }}>
                    <Repeat size={12} />Same as last
                  </button>
                  {sg ? (
                    <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: applyTargetSets(prev, sg) }) }))} className="ghost py-2 text-xs font-bold flex items-center justify-center gap-1.5" style={{ color: C.green, minHeight: 40 }}>
                      <TrendingUp size={12} />{sg.w}×{sg.r}
                    </button>
                  ) : <div />}
                </div>
                {sg ? <div className="body text-xs mt-1 px-0.5" style={{ color: C.mute }}>{sg.why}</div> : null}
              </div>
            )}
            {past.length > 0 && (
              <div className="mb-2">
                <button type="button" onClick={() => setPastOpen((o) => ({ ...o, [ei]: !o[ei] }))} className="w-full flex items-center gap-1 body text-xs text-left" style={{ color: C.dim, minHeight: 40 }} aria-expanded={!!pastOpen[ei]}>
                  <ChevronDown size={14} className="shrink-0" style={{ transform: pastOpen[ei] ? "rotate(180deg)" : "none" }} />
                  <span className="truncate"><span style={{ color: C.mute }}>{new Date(past[0].date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}:</span> {past[0].sets.map((st) => setLabel(def, st)).join(", ")}</span>
                </button>
                {pastOpen[ei] && past.slice(1).map((ps) => (
                  <div key={ps.id} className="body text-xs pl-5 truncate" style={{ color: C.dim }}><span style={{ color: C.mute }}>{new Date(ps.date + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}:</span> {ps.sets.map((st) => setLabel(def, st)).join(", ")}</div>
                ))}
              </div>
            )}
            {setHint && ei === 0 && <div className="body text-xs mb-2" style={{ color: C.mute }}>Tap a set number to mark warm-up or drop set</div>}
            <div className="setgrid grid gap-2 text-xs body mb-1 px-1" style={{ gridTemplateColumns: cols, color: C.mute }}>
              <span>Set</span><span>Previous</span>{showW && <span>{cardio ? "Miles" : def.type === "assisted" ? "Assist lb" : def.type === "bodyweight" ? "+lb" : mode === "hand" ? "lb/hand" : "lb"}</span>}<span>{timed ? "Minutes" : "Reps"}</span><span /><span />
            </div>
            {ex.sets.map((st, si) => {
              const pv = prev[si];
              const cmp = st.done && pv && +st.r > 0 ? ((+st.w || 0) * (+st.r || 0) || +st.r) - ((+pv.w || 0) * (+pv.r || 0) || +pv.r) : null;
              return (
                <div key={si} className="setgrid grid gap-2 items-center py-1 px-1" style={{ gridTemplateColumns: cols, background: st.done ? "rgba(79,209,139,.14)" : "transparent", borderRadius: 3, opacity: st.warm ? 0.55 : 1 }}>
                  {D.on() && <DiagProbe kind="setrow" id={ei * 100 + si} />}
                  <button type="button" aria-label={typeLabel(st, si)} onClick={() => cycleType(si, st)} className="font-semibold flex items-center justify-center" style={{ minWidth: 40, minHeight: 40, borderRadius: 6, border: `1px solid ${st.warm ? C.cyan : st.drop ? C.orange : C.line}`, color: st.warm ? C.mute : st.drop ? C.orange : C.text, background: "transparent" }}>{st.warm ? "W" : st.drop ? "D" : si + 1}</button>
                  <span className="body text-xs" style={{ color: cmp === null ? C.dim : cmp >= 0 ? C.green : C.orange }}>{pv ? setLabel(def, pv) : "–"}{cmp !== null && pv ? (cmp > 0 ? " ▲" : cmp < 0 ? " ▼" : " =") : ""}</span>
                  {showW && <NumField inputMode="decimal" className="inp text-center" value={st.w ?? ""} placeholder={pv?.w || "0"} onCommit={(v) => upd(si, { w: v })} {...D.fuelBind("set-w")} />}
                  <NumField inputMode="decimal" className="inp text-center" value={st.r ?? ""} placeholder={pv?.r || "0"} onCommit={(v) => upd(si, { r: v })} {...D.fuelBind("set-r")} />
                  <button type="button" aria-label="Mark set done"
                    data-diag-check={`${ei}:${si}`}
                    onPointerDown={(e) => D.check("pd", ei, si, !!st.done, e.pointerType)}
                    onPointerUp={(e) => D.check("pu", ei, si, !!st.done, e.pointerType)}
                    onTouchEnd={() => D.check("te", ei, si, !!st.done)}
                    onClick={() => {
                    D.check("click", ei, si, !!st.done);
                    const key = `${ei}:${si}`;
                    const latest = doneTapRef.current[key] ?? !!st.done;
                    const turningOn = !latest;
                    doneTapRef.current[key] = turningOn;
                    upd(si, turningOn && !st.r && pv ? { done: true, r: pv.r, w: st.w || pv.w } : { done: turningOn });
                    D.checkAfter(ei, si, turningOn, true);
                    if (turningOn) {
                      SFX.click();
                      const secs = s.settings?.rest ?? 90;
                      if (secs > 0 && !a.editId) { Beeper.unlock(); fireRest(Date.now() + secs * 1000); }
                    }
                  }}
                    className="flex items-center justify-center" style={{ minWidth: 40, minHeight: 40, background: st.done ? C.green : C.soft, borderRadius: 3, color: st.done ? "#02040B" : C.dim }}><Check size={16} /></button>
                  <button aria-label="Delete set" onClick={() => delSet(si)} className="flex items-center justify-center" style={{ minWidth: 40, minHeight: 40, color: C.mute }}><X size={14} /></button>
                </div>
              );
            })}
            {lastAssisted && <div className="body text-xs mt-1 px-1" style={{ color: C.dim }}>You moved <span style={{ color: C.text, fontWeight: 600 }}>{Math.round(movedLb(s.profile, lastAssisted.w))} lb</span> ({Math.round(Math.max(80, +s.profile.weight || 170))} − {+lastAssisted.w || 0}){+lastAssisted.r > 0 ? ` · counts as ${Math.round(assistedReps(s.profile, lastAssisted) * 10) / 10} ${def.rankAs.toLowerCase()}s` : ""}</div>}
            <div className="flex mt-2">
              <button type="button" onClick={addWorking} className="ghost flex-1 py-2 text-sm font-semibold" style={{ minHeight: 40, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>Add set</button>
              <button type="button" data-keep-menu aria-label="Add warm-up or drop set" aria-haspopup="menu" aria-expanded={addMenu === ei} onClick={(e) => { e.stopPropagation(); setExMenu(null); setAddMenu(addMenu === ei ? null : ei); }} className="ghost px-2 flex items-center justify-center" style={{ minWidth: 40, minHeight: 40, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}><ChevronDown size={16} /></button>
            </div>
            {addMenu === ei && (
              <div role="menu" data-keep-menu className="panel p-1 mt-1" onClick={(e) => e.stopPropagation()}>
                <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm" style={{ minHeight: 40, color: C.cyan }} onClick={() => { addWarm(); setAddMenu(null); }}>Add warm-up set</button>
                {def.type !== "timed" && <button role="menuitem" className="w-full text-left px-3 py-2.5 text-sm" style={{ minHeight: 40, color: C.orange }} onClick={() => { addDrop(); setAddMenu(null); }}>Add drop set</button>}
              </div>
            )}
          </div>
        );
      })}

      <button onClick={() => setPicker(true)} className="w-full py-3 font-semibold flex items-center justify-center gap-2" style={{ border: `1px dashed ${C.blue}`, color: C.cyan, borderRadius: 4, scrollMarginBottom: "calc(env(safe-area-inset-bottom) + 168px)" }}><Plus size={18} />Add exercise</button>

      <RestDock />
      {plates && <PlateSheet weight={plates.w} onClose={() => setPlates(null)} />}
      {formSheet && (
        <Sheet title={`Form check · ${formSheet.name}`} onClose={() => setFormSheet(null)}>
          <FormCheck exercise={formSheet.name} heading={false} result={formResults[formSheet.name]} onResult={(r) => setFormResults((p) => ({ ...p, [formSheet.name]: r }))} />
        </Sheet>
      )}

      <TrainCoach s={s} a={a} onAdd={(name, n) => setActive((w) => w.exercises.some((e) => e.name === name)
        ? { ...w, exercises: w.exercises.map((e) => e.name === name ? { ...e, sets: [...e.sets, ...Array.from({ length: n }, () => ({ w: "", r: "", done: false }))] } : e) }
        : { ...w, exercises: [...w.exercises, { name, sets: Array.from({ length: n }, () => ({ w: "", r: "", done: false })) }] })} />

      {a.exercises.length > 0 && (
        naming && !a.editId ? (
          <div className="panel p-3 flex gap-2 items-center">
            <input autoFocus className="inp" placeholder="Preset name, e.g. Push day" value={presetName} onChange={(e) => setPresetName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePreset()} />
            <button onClick={savePreset} className="btn px-4 py-2 text-sm" style={{ minHeight: 40 }}>Save</button>
            <button aria-label="Cancel" onClick={() => setNaming(false)} className="ghost px-3 py-2" style={{ minHeight: 40 }}><X size={16} /></button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2" style={{ scrollMarginBottom: "calc(env(safe-area-inset-bottom) + 168px)" }}>
            {!a.editId && <button onClick={() => { setPresetName(a.preset || ""); setNaming(true); }} className="ghost py-3 font-medium flex items-center justify-center gap-2" style={{ color: C.cyan, minHeight: 40 }}><Bookmark size={16} />Save as preset</button>}
            <button
              onClick={() => { const discard = () => setS((p) => ({ ...p, active: null })); if (a.editId || !hasWork) discard(); else ask("Are you sure you want to discard this workout? (Aidan lock in)", discard, "Discard"); }}
              className={`ghost py-3 font-medium ${a.editId || !a.exercises.length ? "" : ""}`}
              style={{ color: C.red, minHeight: 40, ...(a.editId ? { gridColumn: "1 / -1" } : {}) }}>
              {a.editId ? "Cancel editing" : "Discard workout"}
            </button>
          </div>
        )
      )}
    </div>
  );
}
