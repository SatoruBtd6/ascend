import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Footprints, Layers, Trash2, Share2, Check, ChevronDown, Pencil, Plus, X, Bookmark, Repeat, TrendingUp, Video, CircleDot, Link2, MoreHorizontal } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { isLegacyAssisted, workoutGym, collectPrHistory, gymSpecificNamesIn } from "../../math.js";
import { findEx } from "../../lib/exercises.js";
import { computeBests, workoutXp, workoutRecap, addWorkout, prNote, overallInfo, movedLb, assistedReps } from "../../lib/stats.js";
import { today, fmtDay, uid } from "../../lib/dates.js";
import { ask } from "../../lib/ask.js";
import { scrollPageTop } from "../../lib/dom.js";
import { Title, Empty, Sheet } from "../../ui/primitives.jsx";
import { UndoToast } from "../../ui/UndoToast.jsx";
import { SaveMark } from "../../ui/SaveMark.jsx";
import { NumField } from "../../ui/NumField.jsx";
import { DiagProbe } from "../../ui/DiagProbe.jsx";
import { gymLabel, pastSessions, cloneSets, lastWorkingSets, lastWorkout, lastPresetWorkout, copyWorkoutExercises, applyTargetSets, setLabel, suggestNext, stalledLifts, withSilentRankSnap, fmtShort } from "./helpers.js";
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
import { deleteSetAt, restoreSetAt } from "./setUndo.js";
import { applyPrXpRecount } from "./xpRecount.js";
import { cardioMeta, CARDIO_VERSION } from "../../data/cardio.js";
import { fmtDur } from "../../run.js";
import { XpSync } from "../../lib/xpSync.js";
// AnchoredMenu — every .panel is its own stacking context (backdrop-filter),
// so an in-card menu can never beat the next card. Portal to the end of
// #ascend-root (fixed inset-0, so fixed children still track the viewport)
// which keeps the root's font, colour and dys/zesty classes applying inside
// the sheet. Positions off the anchor, flips up when there's no room above
// the nav, clamps 12px inside both side edges. On scroll it follows the
// anchor (stray/async scroll events must not dismiss it); it closes only
// when the anchor leaves the visible band.
function AnchoredMenu({ anchor, onClose, children, minWidth = 200 }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const place = () => {
      const a = anchor?.getBoundingClientRect?.(), m = menuRef.current?.getBoundingClientRect();
      if (!a || !m) return;
      const navTop = document.querySelector("#ascend-root nav")?.getBoundingClientRect().top ?? window.innerHeight;
      if (a.bottom < 8 || a.top > navTop - 8) { onClose(); return; }
      const below = navTop - a.bottom - 8;
      const flip = m.height > below && a.top - 8 > below;
      const top = flip ? Math.max(8, a.top - m.height - 6) : Math.min(a.bottom + 4, Math.max(8, navTop - m.height - 8));
      const left = Math.max(12, Math.min(a.right - m.width, window.innerWidth - m.width - 12));
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    const sc = document.getElementById("ascend-scroll");
    sc?.addEventListener("scroll", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); sc?.removeEventListener("scroll", place); window.removeEventListener("scroll", place, true); };
  }, [anchor]);
  return createPortal(
    <>
      <div className="fixed inset-0 z-[70]" style={{ background: "rgba(0,0,0,.28)" }} onClick={onClose} />
      <div ref={menuRef} role="menu" data-keep-menu className="panel fixed z-[71] p-1" style={{ top: pos ? pos.top : -9999, left: pos ? pos.left : -9999, minWidth, maxWidth: "calc(100vw - 24px)", background: C.sheet, backdropFilter: "none", WebkitBackdropFilter: "none", boxShadow: "0 12px 32px rgba(0,0,0,.55)", visibility: pos ? "visible" : "hidden" }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </>,
    document.getElementById("ascend-root") || document.body
  );
}
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
  const [histShown, setHistShown] = useState(10);
  const [histMenu, setHistMenu] = useState(null);
  const [formResults, setFormResults] = useState({});
  const [formSheet, setFormSheet] = useState(null);
  const [wuOpen, setWuOpen] = useState(false);
  const [setUndo, setSetUndo] = useState(null);
  const undoSeq = useRef(0);
  const doneTapRef = useRef({});
  const finishingRef = useRef(null);
  // Exercise drag-to-reorder (phase 7p): press-and-hold ~300ms picks the row
  // up (lift, shadow, list dims), siblings slide aside over 200ms ease-out,
  // release drops it. Sets live inside the exercise object, so a reorder can
  // never lose logged work. dragRef holds the live gesture; dragUi is the
  // render-facing snapshot.
  const rowRefs = useRef([]);
  const dragRef = useRef(null);
  const [dragUi, setDragUi] = useState(null);
  const buzz = () => { try { navigator.vibrate?.(12); } catch (e) { /* haptics optional */ } };
  // Drag scroll plumbing: the exercise list scrolls on the window, but if a
  // scrollable ancestor ever wraps it we scroll that instead. scrollBy clamps
  // at both ends natively, so there's no rubber-band or runaway at the edges.
  const scrollerFor = (el) => {
    for (let n = el?.parentElement; n; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
    }
    return null; // window/document scroller
  };
  const scTop = (sc) => (sc ? sc.scrollTop : window.scrollY);
  const scBy = (sc, v) => { if (sc) sc.scrollTop = Math.max(0, Math.min(sc.scrollHeight - sc.clientHeight, sc.scrollTop + v)); else window.scrollBy(0, v); };
  const setHintKey = () => `ascend-set-type-hint:${typeof window !== "undefined" ? (window.ascendUserId || "anon") : "anon"}`;
  const [setHint, setSetHint] = useState(() => { try { return localStorage.getItem(setHintKey()) !== "1"; } catch { return true; } });
  const dismissSetHint = () => { setSetHint(false); try { localStorage.setItem(setHintKey(), "1"); } catch { /* */ } };
  useEffect(() => {
    if (exMenu == null && addMenu == null && histMenu == null) return;
    const close = (e) => {
      if (e.target.closest?.("[data-keep-menu]")) return;
      setExMenu(null); setAddMenu(null); setHistMenu(null);
    };
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", close); };
  }, [exMenu, addMenu, histMenu]);
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
  const xpOpts = () => ({ history: collectPrHistory(s, findEx, { excludeId: a?.editId }), workout: { gym: sessionGym(), date: a?.date || today(), ...(a?.editId ? { bw: s.workouts.find((w) => w.id === a.editId)?.bw, cv: s.workouts.find((w) => w.id === a.editId)?.cv } : { cv: CARDIO_VERSION }) }, excludeId: a?.editId });

  const finish = () => {
    // Double-tap guard: every repeat of this finish — second tap, stale
    // closure, a retried save — must land on the SAME workout id so
    // addWorkout's id dedupe collapses it instead of writing a second row
    // (and double-counting the XP). The id is stamped on `active` at start.
    const finKey = a.id || a.editId || "legacy";
    if (finishingRef.current === finKey) return;
    finishingRef.current = finKey;
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
    const { xp, prs, volume, lines, prBonus, sets, bw: res_bw } = workoutXp(s, exercises, { ...bests }, opts);
    const d = today();
    const workout = { id: a.id || uid(), date: d, title: a.title || "", preset: a.preset || "", cv: CARDIO_VERSION, exercises, volume, xp, lines, prBonus, minutes: Math.round((Date.now() - a.start) / 60000), startedAt: a.start, ...(res_bw > 0 ? { bw: res_bw } : {}), ...(((a.gym !== undefined ? a.gym : s.currentGym) || null) ? { gym: a.gym !== undefined ? a.gym : s.currentGym } : {}) };
    const after = { ...s, workouts: [...s.workouts, workout] };
    const suggestions = exercises.map((e) => ({ name: e.name, next: suggestNext(after, e.name) })).filter((x) => x.next);
    setS((p) => ({ ...addWorkout(p, workout), active: null, lastSummary: { xp, prs, volume, minutes: workout.minutes, title: workout.title, suggestions, prNames: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => l.name), recap: workoutRecap({ ...p, workouts: [...p.workouts, workout] }, workout), sets, workoutId: workout.id } }));
    noteRaidHitFor(s, setS, workout);
    juice(prs ? "pr" : "finish");
    if (prs) { postFeed(s, "pr", `set ${prs} new PR${prs > 1 ? "s" : ""}${workout.title ? ` on ${workout.title} day` : ""}`, { detail: lines.filter((l) => l.sets.some((st) => st.pr)).map((l) => `${l.name} ${l.sets.filter((st) => st.pr).map((st) => st.label).join(", ")}`).join(" · ") }, `pr_${workout.id}`); }
    gainXp(xp, prs ? `Workout · ${prs} new PR${prs > 1 ? "s" : ""}` : "Workout complete", `wo_${workout.id}`);
    fireRest(null);
  };

  // Commit a reorder: splice the row to its landing slot and clear dangling
  // superset links — the moved row's own ss (its old "next" is gone), the row
  // that linked INTO it, and whichever row it lands under (whose link would
  // now point at the moved row instead of its real partner).
  const moveExercise = (from, to) => setActive((w) => {
    const list = [...w.exercises];
    const oldPrev = list[from - 1] || null;
    const [m] = list.splice(from, 1);
    const moved = m.ss ? { ...m, ss: false } : m;
    list.splice(to, 0, moved);
    const newPrev = to > 0 ? list[to - 1] : null;
    return { ...w, exercises: list.map((e) => (e.ss && (e === oldPrev || e === newPrev) ? { ...e, ss: false } : e)) };
  });
  // Pixel shift per row during a drag: the held row follows the finger, rows
  // between old and new slots slide aside by the held row's footprint.
  const dragShift = (i) => {
    const d = dragUi;
    if (!d) return 0;
    const held = (dragRef.current?.slots?.[d.from]?.h || 0) + (dragRef.current?.gap || 0);
    if (i === d.from) return d.dy;
    if (d.to > d.from && i > d.from && i <= d.to) return -held;
    if (d.to < d.from && i >= d.to && i < d.from) return held;
    return 0;
  };

  const addExercise = (name) => {
    const prev = lastWorkingSets(s, name, a?.editId);
    setActive((w) => ({ ...w, exercises: [...w.exercises, { name, sets: prev ? cloneSets(prev.sets) : [{ w: "", r: "", done: false }] }] }));
    setPicker(false);
    scrollPageTop();
  };
  const startPreset = (pr) => {
    setS((p) => ({ ...p, active: { id: uid(), start: Date.now(), preset: pr.name, title: pr.name, gym: p.currentGym ?? null, exercises: (pr.exercises || []).map((e) => ({ name: e.name, ...(e.wMode ? { wMode: e.wMode } : {}), sets: e.plan?.length ? e.plan.map((st) => ({ w: st.w ?? "", r: st.r ?? "", done: false })) : Array.from({ length: e.sets || 3 }, () => ({ w: "", r: "", done: false })) })) } }));
    setShowPresets(false); scrollPageTop();
  };
  const savePreset = () => {
    const name = presetName.trim() || `Preset ${(s.presets || []).length + 1}`;
    const exercises = a.exercises.map((e) => ({ name: e.name, sets: e.sets.length }));
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), { id: uid(), name, exercises }] }));
    setNaming(false); setPresetName("");
  };
  const editWorkout = (w) => {
    setS((p) => ({ ...p, active: { start: Date.now(), editId: w.id, date: w.date, title: w.title || "", gym: w.gym ?? null, exercises: (w.exercises || []).map((e) => ({ name: e.name, sets: (e.sets || []).map((st) => ({ w: st.w ?? "", r: st.r ?? "", done: true, drop: !!st.drop, ...(st.warm ? { warm: true } : {}) })) })) } }));
    scrollPageTop();
  };

  if (a && picker) return <ExercisePicker s={s} setS={setS} onPick={addExercise} onBack={() => setPicker(false)} />;
  if (!a && titling) return <TitlePicker s={s} onBack={() => setTitling(false)} onPick={(title) => { setTitling(false); setS((p) => ({ ...p, active: { id: uid(), start: Date.now(), title, gym: p.currentGym ?? null, exercises: [] } })); scrollPageTop(); }} />;

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
            {["All", ...titles].map((t) => <button key={t} onClick={() => { setFilter(t); setHistShown(10); }} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: filter === t ? C.blue : C.soft, color: filter === t ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{t}</button>)}
          </div>
        ) : null; })()}
        {s.workouts.length === 0 && <Empty>No workouts yet. XP comes from how much you lift and how many reps you do, scaled to your body and rank.</Empty>}
        {(() => {
          const ws = [...s.workouts].reverse().filter((w) => filter === "All" || w.title === filter);
          return (<>
            {ws.slice(0, histShown).map((w) => {
          const isOpen = !!open[w.id];
          const nSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
          const gym = gymLabel(s, workoutGym(w));
          const menuCls = "w-full text-left px-5 text-sm flex items-center gap-2";
          const menuSt = { minHeight: 40, paddingTop: 14, paddingBottom: 14 };
          return (
            <div key={w.id} className="panel relative">
              <div className="flex items-center gap-2 px-4 py-3">
                <button type="button" aria-expanded={isOpen} onClick={() => setOpen((o) => ({ ...o, [w.id]: !isOpen }))} className="flex-1 min-w-0 text-left">
                  <div className="font-bold truncate" style={{ fontSize: 17, color: C.cyan }}>{w.title || "Workout"}</div>
                  <div className="body text-sm mt-0.5 truncate" style={{ color: C.dim }}>{fmtDay(w.date)}{gym ? ` · ${gym}` : ""}{w.source && w.source !== "import" ? <span style={{ color: C.cyan }}> · {w.source === "deck" ? "card deck" : "from quest"}</span> : null}{w.source === "import" ? " · imported" : ""}</div>
                  <div className="body mt-0.5" style={{ fontSize: 13, color: C.mute }}>{w.run ? `${w.run.miles} mi · ${fmtDur(w.run.secs)}` : `${w.exercises.length} exercise${w.exercises.length === 1 ? "" : "s"} · ${nSets} set${nSets === 1 ? "" : "s"}`}</div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  {w.xp ? <span className="text-sm font-bold" style={{ color: C.gold }}>+{w.xp} XP</span> : null}
                  <button aria-label="Edit workout" onClick={() => editWorkout(w)} className="py-1" style={{ color: C.cyan }}><Pencil size={16} /></button>
                  <button type="button" data-keep-menu aria-label="More actions" aria-haspopup="menu" aria-expanded={histMenu?.id === w.id} onClick={(e) => { e.stopPropagation(); setHistMenu(histMenu?.id === w.id ? null : { id: w.id, el: e.currentTarget }); }} className="py-1" style={{ color: C.mute }}><MoreHorizontal size={18} /></button>
                </div>
              </div>
              {histMenu?.id === w.id && (
                <AnchoredMenu anchor={histMenu.el} onClose={() => setHistMenu(null)}>
                    {!w.source && s.lb && <button role="menuitem" className={menuCls} disabled={w.shared} style={{ ...menuSt, color: w.shared ? C.green : C.text }} onClick={() => { if (w.shared) return; postFeed(s, "workout", `finished a ${w.title ? `${w.title} ` : ""}workout · +${w.xp || 0} XP`, { detail: w.exercises.map((ex) => ex.name).join(", "), workout: workoutPayload(s, w) }, `workout_${w.id}`); setS((p) => ({ ...p, workouts: p.workouts.map((x) => (x.id === w.id ? { ...x, shared: true } : x)) })); setHistMenu(null); }}>{w.shared ? <Check size={16} /> : <Share2 size={16} />}{w.shared ? "Shared" : "Share"}</button>}
                    {!w.source && s.lb && <SharePreset s={s} workout={w} menuItem />}
                    {!w.source && <ReceiptButton menuItem onAction={() => setHistMenu(null)} label="Add photo" make={() => buildReceipt({ s, kind: "Workout", headline: w.title ? `${w.title} day` : "Workout", sub: fmtDay(w.date), tierImg: Math.floor(overallInfo(s).score), rows: [["XP earned", `+${w.xp || 0}`], ["Volume", `${Math.round(w.volume || 0).toLocaleString()} lb`], ["Exercises", w.exercises.length], ["Sets", w.exercises.reduce((a, e) => a + e.sets.length, 0)]] })} />}
                    <button role="menuitem" className={menuCls} style={{ ...menuSt, color: C.red, borderTop: `1px solid ${C.glassLine}` }} onClick={() => { setHistMenu(null); ask(w.xp ? `Delete this workout? Its ${w.xp.toLocaleString()} XP comes off your total.` : "Delete this workout?", () => { setS((p) => ({ ...p, workouts: p.workouts.filter((x) => x.id !== w.id) })); gainXp(-(w.xp || 0), `Deleted workout${w.title ? `: ${w.title}` : ""}`, `wo_${w.id}_del`); }, "Delete"); }}><Trash2 size={16} />Delete</button>
                </AnchoredMenu>
              )}
              <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: "grid-template-rows .25s ease-out" }}>
                <div style={{ overflow: "hidden", opacity: isOpen ? 1 : 0, transition: "opacity .25s ease-out" }}>
                  <div className="px-4 pb-2 body text-sm space-y-0.5" style={{ color: C.sub }}>
                    {w.exercises.map((ex, i) => {
                      const def = findEx(s, ex.name);
                      return <div key={i}>{ex.name}: {ex.sets.map((st) => setLabel(def, st)).join(", ")}{isLegacyAssisted(w, def) ? <span className="body text-xs ml-1" style={{ color: C.mute }}>legacy</span> : null}</div>;
                    })}
                  </div>
                  <div className="mx-4 mb-3 pt-2 body text-xs space-y-1" style={{ borderTop: `1px solid ${C.line}`, color: C.dim }}>
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
                </div>
              </div>
            </div>
          );
        })}
            {ws.length > histShown && <button type="button" onClick={() => setHistShown((n) => n + 10)} className="w-full py-3 text-sm font-semibold" style={{ color: C.cyan }}>Show more</button>}
          </>);
        })()}
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
          <input className="bg-transparent w-full font-bold border-b border-transparent focus:border-white/20 focus:outline-none transition-colors" style={{ fontSize: 20, marginTop: 2, padding: "2px 0" }} placeholder="Workout title" value={a.title || ""} onChange={(e) => setActive((w) => ({ ...w, title: e.target.value }))} aria-label="Workout title" />
          {(s.gyms || []).length > 0 && (
            <div className="flex items-center gap-1">
              <select className="bg-transparent appearance-none focus:outline-none" style={{ fontSize: 15, color: C.dim }} aria-label="Workout gym" value={a.gym || s.currentGym || ""} onChange={(e) => setActive((w) => ({ ...w, gym: e.target.value || null }))}>
                <option value="">No gym</option>
                {(s.gyms || []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown size={12} style={{ color: C.dim, pointerEvents: "none" }} />
            </div>
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
          <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: copyWorkoutExercises(last) }))} className="flex items-center gap-1.5 font-semibold self-start" style={{ height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${C.glassLine}`, background: C.glass, color: C.cyan, fontSize: 14 }}>
            <Repeat size={12} />Same as last · {fmtShort(last.date)}
          </button>
        );
      })()}
      {a.exercises.length === 0 && <div className="body text-sm" style={{ color: C.mute }}>Only checked sets count.</div>}

      {a.exercises.map((ex, ei) => {
        // drag lifecycle: pointerdown arms a 300ms timer (movement >8px cancels
        // — that's a scroll or a tap). pickup() flips touch-action to none
        // BEFORE the finger moves so the browser can't claim the gesture for
        // scrolling, captures the pointer, and measures every row's slot in
        // CONTENT space (viewport top + scrollTop at pickup) so the held row
        // stays pinned under the finger while the list scrolls beneath it —
        // a rAF auto-scroll runs while the pointer sits within 80px of the
        // top or bottom edge of the scroller, ramping 2→14px/frame, clamped
        // above the fixed tab bar and stopped dead on drop/cancel.
        const rowDown = (e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (e.target.closest("input, button, select, textarea, a, [role=menu]")) return;
          if (a.exercises.length < 2 || dragRef.current) return;
          dragRef.current = { ei, y0: e.clientY, lastY: e.clientY, pid: e.pointerId, timer: setTimeout(() => rowPickup(ei), 300), dy: 0 };
        };
        const rowPickup = (i) => {
          const d = dragRef.current, el = rowRefs.current[i];
          if (!d || !el || d.ei !== i) return;
          d.active = true;
          d.sc = scrollerFor(el);
          d.top0 = scTop(d.sc);
          d.cy0 = d.y0 + d.top0;
          d.slots = a.exercises.map((_, k) => { const r = rowRefs.current[k]?.getBoundingClientRect(); return r ? { top: r.top + d.top0, h: r.height } : { top: 0, h: 0 }; });
          d.gap = d.slots.length > 1 ? Math.max(0, d.slots[1].top - d.slots[0].top - d.slots[0].h) : 12;
          d.from = i; d.to = i;
          try { el.style.touchAction = "none"; el.setPointerCapture(d.pid); } catch (e) { /* capture is best-effort */ }
          buzz();
          setExMenu(null); setAddMenu(null);
          setDragUi({ from: i, to: i, dy: 0 });
          d.raf = requestAnimationFrame(dragTick);
        };
        const applyDrag = (d) => {
          const dy = d.lastY + scTop(d.sc) - d.cy0;
          d.dy = dy;
          const mid = d.slots[d.from].top + d.slots[d.from].h / 2 + dy;
          let to = 0;
          d.slots.forEach((sl, i) => { if (i !== d.from && mid > sl.top + sl.h / 2) to++; });
          d.to = to;
          setDragUi({ from: d.from, to, dy });
        };
        // Continuous edge scroll: while the pointer sits in the 80px zone the
        // scroller moves every frame, and applyDrag re-derives dy/`to` from the
        // new scrollTop so the drop gap retargets live as rows slide into view.
        const dragTick = () => {
          const d = dragRef.current;
          if (!d?.active) return; // drop/cancel cleared the gesture — stop
          const ZONE = 80, MIN = 2, MAX = 14;
          const rect = d.sc ? d.sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
          const navTop = document.querySelector("#ascend-root nav")?.getBoundingClientRect().top ?? rect.bottom;
          const top = Math.max(0, rect.top), bottom = Math.min(rect.bottom, navTop);
          const ramp = (dist) => MIN + (MAX - MIN) * Math.min(1, Math.max(0, 1 - dist / ZONE));
          let v = 0;
          if (d.lastY < top + ZONE) v = -ramp(d.lastY - top);
          else if (d.lastY > bottom - ZONE) v = ramp(bottom - d.lastY);
          if (v) { scBy(d.sc, v); applyDrag(d); }
          d.raf = requestAnimationFrame(dragTick);
        };
        const rowMove = (e) => {
          const d = dragRef.current;
          if (!d || d.pid !== e.pointerId) return;
          d.lastY = e.clientY;
          if (!d.active) { if (Math.abs(e.clientY - d.y0) > 8) { clearTimeout(d.timer); dragRef.current = null; } return; }
          applyDrag(d);
        };
        const rowDone = (e) => {
          const d = dragRef.current;
          if (!d || (e && d.pid !== e.pointerId)) return;
          if (d.raf) cancelAnimationFrame(d.raf);
          const el = rowRefs.current[d.ei];
          if (el) el.style.touchAction = "";
          if (!d.active) { clearTimeout(d.timer); dragRef.current = null; return; }
          const { from, to } = d;
          dragRef.current = null;
          setDragUi(null);
          buzz();
          if (to !== from) moveExercise(from, to);
        };
        // the grip picks up immediately — no hold delay on the handle itself
        const gripDown = (e) => {
          e.preventDefault(); e.stopPropagation();
          if (e.pointerType === "mouse" && e.button !== 0) return;
          if (a.exercises.length < 2 || dragRef.current) return;
          dragRef.current = { ei, y0: e.clientY, lastY: e.clientY, pid: e.pointerId, timer: null, dy: 0 };
          rowPickup(ei);
        };
        const def = findEx(s, ex.name);
        const timed = def.type === "timed";
        const cardio = timed && def.group === "Cardio";
        const showW = !timed || (cardio && !!cardioMeta(def));
        const prev = lastSets(ex.name);
        const past = pastSessions(s, ex.name, a.editId, 3);
        const upd = (si, patch) => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: e.sets.map((st, j) => j !== si ? st : { ...st, ...patch }) }) }));
        const delSet = (si) => {
          const st = ex.sets[si];
          if (!st) return;
          const snapshot = { ...st };
          setActive((w) => {
            const cut = deleteSetAt(w.exercises, ei, si);
            return cut ? { ...w, exercises: cut.exercises } : w;
          });
          setSetUndo({ id: ++undoSeq.current, session: a.editId || a.start, label: `Deleted ${ex.name} · ${setLabel(def, snapshot)}`, ei, si, set: snapshot });
        };
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
        const held = !!dragUi && dragUi.from === ei;
        const shift = dragUi ? dragShift(ei) : 0;
        return (
          <div key={ei} ref={(el) => { rowRefs.current[ei] = el; }} className="panel p-3 relative"
            onPointerDown={rowDown} onPointerMove={rowMove} onPointerUp={rowDone} onPointerCancel={rowDone}
            style={{
              ...(ex.ss ? { borderColor: C.green, marginBottom: 0 } : a.exercises[ei - 1]?.ss ? { borderColor: C.green, borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 } : null),
              transform: `translateY(${shift}px)${held ? " scale(1.03)" : ""}`,
              transition: held ? "box-shadow .15s, opacity .2s" : "transform .2s ease-out, opacity .2s",
              zIndex: held ? 30 : undefined,
              boxShadow: held ? "0 12px 30px rgba(0,0,0,.55)" : undefined,
              opacity: dragUi && !held ? 0.9 : undefined,
              cursor: dragUi ? (held ? "grabbing" : "default") : undefined,
              userSelect: dragUi ? "none" : undefined,
            }}>
            {D.on() && <DiagProbe kind="excard" id={ei} />}
            {a.exercises[ei - 1]?.ss && <div className="body text-xs font-bold -mt-1 mb-1" style={{ color: C.green }}>⇅ superset with {a.exercises[ei - 1].name}</div>}
            <div className="flex justify-between items-center mb-1 gap-2">
              <button type="button" aria-label={`Drag to reorder ${ex.name}`} onPointerDown={gripDown}
                className="flex items-center justify-center shrink-0"
                style={{ minWidth: 40, minHeight: 40, marginLeft: -12, marginRight: -8, touchAction: "none", cursor: "grab", color: held ? C.sub : C.mute }}>
                <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ width: 18, height: 2, borderRadius: 1, background: "currentColor" }} />
                  <span style={{ width: 18, height: 2, borderRadius: 1, background: "currentColor" }} />
                  <span style={{ width: 18, height: 2, borderRadius: 1, background: "currentColor" }} />
                </span>
              </button>
              <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold glowtext" style={{ color: C.cyan }}>{ex.name}</span>
                <span className="body text-xs" style={{ color: C.mute }}>{def.group}</span>
                {ex.ss && <span className="body text-xs font-bold" style={{ color: C.green }}>ss</span>}
                {formResults[ex.name]?.text && (
                  <button type="button" aria-label={`Form check result for ${ex.name}`} onClick={() => setFormSheet({ name: ex.name, mode: "result" })} className="p-2" style={{ color: C.cyan, minWidth: 40, minHeight: 40 }}><Video size={16} /></button>
                )}
              </div>
              <button type="button" data-keep-menu aria-label={`More actions for ${ex.name}`} aria-haspopup="menu" aria-expanded={exMenu?.ei === ei} onClick={(e) => { e.stopPropagation(); setAddMenu(null); setExMenu(exMenu?.ei === ei ? null : { ei, el: e.currentTarget }); }} className="flex items-center justify-center shrink-0" style={{ minWidth: 40, minHeight: 40, color: C.mute }}><MoreHorizontal size={18} /></button>
            </div>
            {exMenu?.ei === ei && (
              <AnchoredMenu anchor={exMenu.el} onClose={() => setExMenu(null)}>
                {def.type === "weighted" && !def.perHand && <button role="menuitem" className="w-full text-left px-5 text-sm flex items-center gap-2" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14 }} onClick={() => { setPlates({ w: +ex.sets.find((st) => +st.w)?.w || +prev[0]?.w || 135, name: ex.name }); setExMenu(null); }}><CircleDot size={16} />Plate calculator</button>}
                {ei < a.exercises.length - 1 && <button role="menuitem" className="w-full text-left px-5 text-sm flex items-center gap-2" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14, color: ex.ss ? C.green : C.text }} onClick={() => { setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === ei ? { ...e, ss: !e.ss } : e)) })); setExMenu(null); }}><Link2 size={16} />{ex.ss ? "Unlink superset" : "Superset with next"}</button>}
                {def.type === "weighted" && <button role="menuitem" className="w-full text-left px-5 text-sm" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14 }} onClick={() => { setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, wMode: mode === "hand" ? "total" : "hand" }) })); setExMenu(null); }}>{mode === "hand" ? "Use total lb" : "Use per hand"}</button>}
                  <button role="menuitem" className="w-full text-left px-5 text-sm flex items-center gap-2" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14 }} onClick={() => { setFormSheet({ name: ex.name, mode: "film" }); setExMenu(null); }}><Video size={16} />Film form check</button>
                  <button role="menuitem" className="w-full text-left px-5 text-sm" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14, color: C.red, borderTop: `1px solid ${C.glassLine}` }} onClick={() => { setExMenu(null); removeEx(); }}>Remove exercise</button>
              </AnchoredMenu>
            )}
            {prev.length > 0 && !a.editId && (
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: cloneSets(prev) }) }))} className="flex items-center justify-center gap-1.5 font-semibold shrink-0" style={{ height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${C.glassLine}`, background: C.glass, color: C.cyan, fontSize: 14 }}>
                  <Repeat size={12} />Same as last
                </button>
                {sg && (
                  <button type="button" onClick={() => setActive((w) => ({ ...w, exercises: w.exercises.map((e, i) => i !== ei ? e : { ...e, sets: applyTargetSets(prev, sg) }) }))} className="flex items-center gap-1.5 font-semibold min-w-0" style={{ height: 32, padding: "0 12px", borderRadius: 999, border: `1px solid ${C.green}55`, background: C.glass, color: C.green, fontSize: 14 }}>
                    <TrendingUp size={12} className="shrink-0" /><span className="truncate">{sg.w}×{sg.r} · {sg.why}</span>
                  </button>
                )}
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
              <span>Set</span><span>Previous</span>{showW && <span>{cardio ? cardioMeta(def)?.label || "Miles" : def.type === "assisted" ? "Assist lb" : def.type === "bodyweight" ? "+lb" : mode === "hand" ? "lb/hand" : "lb"}</span>}<span>{timed ? "Minutes" : "Reps"}</span><span /><span />
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
              <button type="button" data-keep-menu aria-label="Add warm-up or drop set" aria-haspopup="menu" aria-expanded={addMenu?.ei === ei} onClick={(e) => { e.stopPropagation(); setExMenu(null); setAddMenu(addMenu?.ei === ei ? null : { ei, el: e.currentTarget }); }} className="ghost px-2 flex items-center justify-center" style={{ minWidth: 40, minHeight: 40, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}><ChevronDown size={16} /></button>
            </div>
            {addMenu?.ei === ei && (
              <AnchoredMenu anchor={addMenu.el} onClose={() => setAddMenu(null)} minWidth={180}>
                <button role="menuitem" className="w-full text-left px-5 text-sm" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14, color: C.cyan }} onClick={() => { addWarm(); setAddMenu(null); }}>Add warm-up set</button>
                {def.type !== "timed" && <button role="menuitem" className="w-full text-left px-5 text-sm" style={{ minHeight: 40, paddingTop: 14, paddingBottom: 14, color: C.orange }} onClick={() => { addDrop(); setAddMenu(null); }}>Add drop set</button>}
              </AnchoredMenu>
            )}
          </div>
        );
      })}

      <button onClick={() => setPicker(true)} className="w-full py-3 font-semibold flex items-center justify-center gap-2" style={{ border: `1px dashed ${C.blue}`, color: C.cyan, borderRadius: 4, scrollMarginBottom: "calc(env(safe-area-inset-bottom) + 168px)" }}><Plus size={18} />Add exercise</button>

      <UndoToast
        notice={setUndo && setUndo.session === (a.editId || a.start) ? setUndo : null}
        onUndo={() => {
          const cur = setUndo;
          if (!cur) return;
          setSetUndo(null);
          setActive((w) => {
            if (!w || (w.editId || w.start) !== cur.session) return w;
            return { ...w, exercises: restoreSetAt(w.exercises, cur) };
          });
        }}
        onDismiss={() => setSetUndo(null)}
      />
      <RestDock />
      {plates && <PlateSheet weight={plates.w} exName={plates.name} s={s} setS={setS} onClose={() => setPlates(null)} />}
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
