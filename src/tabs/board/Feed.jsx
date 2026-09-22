import React, { useEffect, useState } from "react";
import { Bookmark, Check, ChevronRight, Dumbbell, Loader2, Plus, Trash2, Utensils } from "lucide-react";
import { RANKS } from "../../data/ranks.js";
import { ask } from "../../lib/ask.js";
import { fmtDay, today, uid } from "../../lib/dates.js";
import { allExercises } from "../../lib/exercises.js";
import { C } from "../../theme.js";
import { Empty, Sheet } from "../../ui/primitives.jsx";
import { FancyName } from "../profile/Avatar.jsx";
import { RankChip } from "../profile/RankChip.jsx";
import { presetFromExercises } from "../status/LogWorkoutSheet.jsx";
import { setLabel } from "../train/helpers.js";
import { readShared, workoutPayload } from "../train/social.js";
export function FeedWorkoutSheet({ s, setS, post, onClose }) {
  const [saved, setSaved] = useState(false);
  // Newer posts carry the full workout. Your own older posts can be rebuilt from your log.
  const own = post.from === s.playerId ? s.workouts.find((w) => post.key?.endsWith(`_workout_${w.id}`)) : null;
  const w = post.workout || (own ? workoutPayload(s, own) : null);
  const legacyNames = !w ? (post.detail || "").split(",").map((x) => x.trim()).filter(Boolean) : [];
  const mine = post.from === s.playerId;
  const titleWord = w?.title || (post.text.match(/finished an? (.+?) ?workout/)?.[1] || "").trim();
  const defOf = (e) => allExercises(s).find((d) => d.name === e.name) || { name: e.name, type: e.type || "weighted" };
  const totalSets = w ? w.exercises.reduce((a, e) => a + e.sets.length, 0) : 0;
  const save = () => {
    const base = `${mine ? "" : `${post.name}'s `}${titleWord || "workout"}`.trim();
    const name = base.charAt(0).toUpperCase() + base.slice(1);
    const preset = w ? presetFromExercises(name, w.exercises) : { id: uid(), name, exercises: legacyNames.map((n) => ({ name: n, sets: 3 })) };
    setS((p) => ({ ...p, presets: [...(p.presets || []).filter((x) => x.name !== name), preset] }));
    setSaved(name);
  };
  return (
    <Sheet title={`${mine ? "Your" : `${post.name}'s`} ${titleWord ? `${titleWord} ` : ""}workout`} onClose={onClose}>
      <div className="flex items-center gap-2 -mt-1 mb-3 body text-xs" style={{ color: C.dim }}>
        {post.rank && <RankChip rank={post.rank} div={post.div} />}
        <span>{w?.date ? fmtDay(w.date) : new Date(post.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
      {w ? (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            {[["XP", `+${w.xp}`], ["Sets", totalSets], ["Volume", w.volume ? `${w.volume.toLocaleString()}` : "–"], ["Time", w.minutes ? `${w.minutes}m` : "–"]].map(([l, v]) => <div key={l} className="panel py-2 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold text-sm tabular-nums">{v}</div></div>)}
          </div>
          {w.exercises.map((ex, i) => {
            const def = defOf(ex);
            return (
              <div key={i} className="panel p-3">
                <div className="flex justify-between items-baseline gap-2">
                  <div className="font-semibold min-w-0 truncate" style={{ color: C.cyan }}>{ex.name}</div>
                  <div className="body text-xs shrink-0" style={{ color: C.mute }}>{ex.sets.length} set{ex.sets.length === 1 ? "" : "s"}{ex.wMode === "hand" ? " · per hand" : ""}</div>
                </div>
                <div className="mt-1.5 grid gap-x-3 gap-y-0.5 body text-sm" style={{ gridTemplateColumns: "auto 1fr" }}>
                  {ex.sets.map((st, j) => <React.Fragment key={j}><span style={{ color: C.dim }}>Set {j + 1}</span><span className="font-semibold text-right tabular-nums">{def.type === "weighted" && st.w ? `${st.w} lb × ${st.r}` : def.type === "bodyweight" ? `${st.w ? `+${st.w} lb × ` : ""}${st.r} reps` : setLabel(def, st)}</span></React.Fragment>)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="panel p-3 space-y-1">
          <div className="body text-xs" style={{ color: C.dim }}>This was posted before feed workouts carried sets and reps, so only the exercise list is available.</div>
          {legacyNames.length ? legacyNames.map((n) => <div key={n} className="font-semibold text-sm" style={{ color: C.cyan }}>{n}</div>) : <div className="body text-sm">No exercise list on this post.</div>}
        </div>
      )}
      {(w || legacyNames.length > 0) && (
        <div className="mt-3 space-y-1.5">
          <button onClick={save} disabled={!!saved} className="btn w-full py-3 flex items-center justify-center gap-2">{saved ? <><Check size={16} />Saved to My Presets</> : <><Bookmark size={16} />Save to My Presets</>}</button>
          <div className="body text-xs text-center" style={{ color: saved ? C.green : C.mute }}>{saved ? `"${saved}" is in Train → Presets, with ${w ? "every set's weight and reps filled in" : "3 sets per exercise"}.` : w ? "Copies every exercise, set, weight and rep. You can change the numbers when you load it." : "Saves the exercise list with 3 sets each."}</div>
        </div>
      )}
    </Sheet>
  );
}
export function FeedMealSheet({ s, setS, post, onClose }) {
  const [added, setAdded] = useState(false);
  const m = post.meal || {};
  const add = () => {
    const d = today();
    setS((p) => ({ ...p, meals: { ...p.meals, [d]: [...((p.meals || {})[d] || []), { name: m.name, cal: m.cal, p: m.p, c: m.c, f: m.f, ...(m.ingredients ? { ingredients: m.ingredients, meal: true } : {}), id: uid(), qty: 1 }] } }));
    setAdded(true);
  };
  return (
    <Sheet title={m.name || "Shared meal"} onClose={onClose}>
      <div className="body text-xs -mt-1 mb-3" style={{ color: C.dim }}>Shared by {post.from === s.playerId ? "you" : post.name}{m.ai ? " · AI estimate" : ""}</div>
      <div className="grid grid-cols-4 gap-2">{[["Cal", m.cal], ["Protein", `${m.p}g`], ["Carbs", `${m.c}g`], ["Fat", `${m.f}g`]].map(([l, v]) => <div key={l} className="panel py-2 text-center"><div className="body text-xs" style={{ color: C.dim }}>{l}</div><div className="font-bold tabular-nums">{v}</div></div>)}</div>
      {m.ingredients?.length > 0 && <div className="panel p-3 mt-2 space-y-0.5">{m.ingredients.map((it, i) => <div key={i} className="flex justify-between body text-sm gap-2"><span className="truncate">{it.name}</span><span className="shrink-0 tabular-nums" style={{ color: C.dim }}>{Math.round(it.cal)} cal</span></div>)}</div>}
      <button onClick={add} disabled={added} className="btn w-full py-3 mt-3 flex items-center justify-center gap-2">{added ? <><Check size={16} />Logged for today</> : <><Plus size={16} />Log it for today</>}</button>
    </Sheet>
  );
}
// Posts from before exact tiers said "D-Rank · Beginner". Crossing into a letter always lands on division III.
export const fixRankText = (t) => String(t || "").replace(/\b(SS|[EDCBAS])-Rank(?: · [A-Za-z' -]+?)?(?=( overall)?$)/, "$1 III");
export function Feed({ s, setS, openProfile, rows = [] }) {
  const [items, setItems] = useState(null);
  const [openPost, setOpenPost] = useState(null);
  const load = async () => {
    const all = (await readShared("feed:")).sort((a, b) => (b.t || 0) - (a.t || 0));
    const seen = new Map(), keep = [], dupes = [];
    all.forEach((x) => {
      const sig = `${x.from}|${x.type}|${(x.text || "").replace(/\+\d+ XP/, "")}|${x.detail || ""}`;
      const prev = seen.get(sig);
      if (prev && Math.abs((prev.t || 0) - (x.t || 0)) < 24 * 3600 * 1000) { dupes.push(x); return; }
      seen.set(sig, x); keep.push(x);
    });
    setItems(keep.slice(0, 40));
    dupes.filter((x) => x.from === s.playerId).slice(0, 25).forEach((x) => window.storage.delete(x.key, true).catch(() => {}));
    const cutoff = Date.now() - 14 * 86400000;
    all.filter((x) => (x.t || 0) < cutoff).slice(0, 10).forEach((x) => window.storage.delete(x.key, true).catch(() => {}));
  };
  useEffect(() => { load(); }, []);
  const icon = { pr: "🏆", rank: "⬆️", ach: "🎖️", workout: "🏋️", run: "🏃", meal: "🍽️", duel: "⚔️", mog: "🐟", level: "✨" };
  const tint = { pr: C.gold, rank: "#B14BFF", ach: C.orange, workout: C.cyan, run: C.green, meal: C.green, duel: "#FF2D6F", mog: C.green, level: C.gold };
  const ago = (t) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };
  // Exact rank + division: stamped on the post when it was made, otherwise the author's current board card
  const rankOf = (it) => {
    if (it.rank) return { rank: it.rank, div: it.div };
    const c = rows.find((r) => r.id === it.from || r.key === `lb:${it.from}`);
    return c?.rank ? { rank: c.rank, div: c.div } : null;
  };
  // Old run posts were typed "workout"; they have no exercises to open
  const isRun = (it) => it.type === "run" || (it.type === "workout" && /^(ran|walked) [\d.]+ mi/.test(it.text || ""));
  const opensWorkout = (it) => it.type === "workout" && !isRun(it) && !!(it.workout || it.detail);
  const opens = (it) => opensWorkout(it) || (it.type === "meal" && !!it.meal);
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  return (
    <div>
      {items === null && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={14} className="animate-spin" />Loading feed…</div>}
      {items?.length === 0 && <Empty>Nothing yet. PRs, rank-ups, achievements, shared workouts and meals from the whole crew show up here.</Empty>}
      {items?.length > 0 && (
        <div className="panel overflow-hidden">
          {items.map((it, i) => {
            const rk = rankOf(it), clickable = opens(it), wo = it.workout;
            const kind = isRun(it) ? "run" : it.type;
            const prestige = it.type === "rank" && it.tier >= 5 ? RANKS[Math.min(6, it.tier)] : null;
            return (
              <div key={it.key} {...(clickable ? { role: "button", tabIndex: 0, onClick: () => setOpenPost(it), onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenPost(it); } }, "aria-label": `Open ${it.name}'s ${it.type === "meal" ? "meal" : "workout"}` } : {})} className={`feedrow flex gap-3 items-start px-3 py-3${clickable ? " feedtap" : ""}`} style={{ ...(i ? { borderTop: `1px solid ${C.border}` } : null), ...(prestige ? { background: `linear-gradient(90deg, ${prestige.glow}, transparent 70%)`, borderLeft: `3px solid ${prestige.color}`, boxShadow: `inset 0 0 22px ${prestige.glow}` } : null) }}>
                <div className="shrink-0 flex items-center justify-center text-lg" style={{ width: 36, height: 36, borderRadius: 999, background: `${tint[kind] || C.cyan}22`, border: `1px solid ${tint[kind] || C.cyan}55` }}>{icon[kind] || "•"}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button onClick={stop(() => openProfile(it.from))} className="font-bold text-sm truncate min-w-0"><FancyName name={it.name} look={it.look} /></button>
                    {rk && <RankChip rank={rk.rank} div={rk.div} />}
                    <span className="body text-xs shrink-0 ml-auto" style={{ color: C.mute }}>{ago(it.t)}</span>
                  </div>
                  <div className="body text-sm" style={{ color: C.text }}>{it.type === "rank" ? fixRankText(it.text) : it.text}</div>
                  {it.type === "meal" && it.meal ? (
                    <div className="body text-xs mt-0.5 tabular-nums" style={{ color: C.dim }}>{it.meal.cal} cal · P {it.meal.p} · C {it.meal.c} · F {it.meal.f}</div>
                  ) : wo ? (
                    <div className="body text-xs mt-0.5 truncate" style={{ color: C.dim }}>{wo.exercises.map((e) => `${e.name} ×${e.sets.length}`).join(" · ")}</div>
                  ) : it.detail ? <div className="body text-xs mt-0.5 truncate" style={{ color: C.dim }}>{it.detail}</div> : null}
                  {clickable && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: tint[kind] || C.cyan }}>
                      {it.type === "meal" ? <><Utensils size={12} />See macros &amp; log it</> : wo ? <><Dumbbell size={12} />{wo.exercises.length} exercises · {wo.exercises.reduce((a, e) => a + e.sets.length, 0)} sets</> : <><Dumbbell size={12} />See exercises</>}
                      <ChevronRight size={13} />
                    </div>
                  )}
                </div>
                {it.from === s.playerId && <button aria-label="Delete post" onClick={stop(() => ask(it.cmeal ? "Delete this post? The meal also comes off the community list." : "Delete this post?", async () => { try { await window.storage.delete(it.key, true); if (it.cmeal) window.storage.delete(it.cmeal, true).catch(() => {}); setItems((x) => x.filter((y) => y.key !== it.key)); } catch (e) { /* ignore */ } }, "Delete"))} className="p-1 shrink-0" style={{ color: C.mute }}><Trash2 size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}
      {openPost && openPost.type === "meal" && <FeedMealSheet s={s} setS={setS} post={openPost} onClose={() => setOpenPost(null)} />}
      {openPost && openPost.type !== "meal" && <FeedWorkoutSheet s={s} setS={setS} post={openPost} onClose={() => setOpenPost(null)} />}
    </div>
  );
}
