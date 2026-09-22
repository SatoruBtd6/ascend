import { useState, useEffect, useRef } from "react";
import { Users } from "lucide-react";
import { C } from "../../theme.js";
import { uid } from "../../lib/dates.js";
import { publishShared, postFeed } from "../train/social.js";
export function PublishMealToggle({ s, food, ai = false }) {
  const [pub, setPub] = useState(null); // { id, cmeal, feed }
  const [busy, setBusy] = useState(false);
  const clean = () => ({ name: String(food.name || "Meal").slice(0, 70), cal: Math.round(+food.cal || 0), p: Math.round(+food.p || 0), c: Math.round(+food.c || 0), f: Math.round(+food.f || 0), ingredients: food.ingredients || null });
  const write = (id) => {
    const m = clean();
    publishShared(`cmeal:${id}`, { ...m, ai, by: s.profile.name || "a player", from: s.playerId, t: Date.now() });
    return postFeed(s, "meal", `shared a meal: ${m.name}`, { meal: { ...m, ai }, cmeal: `cmeal:${id}` }, `meal_${id}`);
  };
  // If they tweak the numbers after publishing, keep the published copy in sync
  const sig = JSON.stringify(clean());
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!pub) return;
    const t = setTimeout(() => write(pub.id), 700);
    return () => clearTimeout(t);
  }, [sig]);
  if (!s.lb || !s.profile.name) return <div className="body text-xs text-center" style={{ color: C.mute }}>Join the leaderboard on the Board tab to publish meals to the community feed.</div>;
  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    if (!pub) {
      const id = uid(), feed = write(id);
      setPub({ id, cmeal: `cmeal:${id}`, feed });
    } else {
      try { await Promise.all([window.storage.delete(pub.cmeal, true), pub.feed ? window.storage.delete(pub.feed, true) : null]); } catch (e) { /* offline */ }
      setPub(null);
    }
    setBusy(false);
  };
  const on = !!pub;
  return (
    <button type="button" role="switch" aria-checked={on} onClick={toggle} className="w-full flex items-center gap-3 px-3 py-2.5 text-left" style={{ borderRadius: 12, background: on ? `${C.green}1A` : C.glass, border: `1px solid ${on ? C.green : C.glassLine}`, transition: "background .2s, border-color .2s" }}>
      <Users size={18} className="shrink-0" style={{ color: on ? C.green : C.cyan }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{on ? "Published to Community Feed" : "Publish to Community Feed"}</span>
        <span className="block body text-xs" style={{ color: C.dim }}>{on ? "Tap again to take it down" : "The crew can see it and copy it"}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 relative" style={{ width: 42, height: 24, borderRadius: 999, background: on ? C.green : C.track, border: `1px solid ${on ? C.green : C.glassLine}`, transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.35)", transition: "left .2s cubic-bezier(.2,.8,.2,1)" }} />
      </span>
    </button>
  );
}
