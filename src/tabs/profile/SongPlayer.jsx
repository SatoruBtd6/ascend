import { useEffect, useRef, useState } from "react";
import { Loader2, Music, Pause } from "lucide-react";
import { C } from "../../theme.js";
import { Jingle, THEMES_MUSIC, embedFor } from "./music.js";
export function SongPlayer({ playerId, meta, me }) {
  const [state, setState] = useState("idle"); // idle | loading | playing
  const [open, setOpen] = useState(false);
  const audioRef = useRef(null);
  useEffect(() => () => { try { audioRef.current?.pause(); } catch (e) { /* ignore */ } if (Jingle.id) Jingle.stop(); }, []);
  if (!meta) return null;
  if (meta.type === "link") {
    const emb = embedFor(meta.url);
    if (!emb) return <a href={meta.url} target="_blank" rel="noreferrer" className="btn px-4 py-2 text-sm inline-flex items-center gap-2"><Music size={16} />Open theme link</a>;
    return (
      <div className="w-full">
        {!open ? <button onClick={() => setOpen(true)} className="btn px-4 py-2 text-sm inline-flex items-center gap-2"><Music size={16} />Play theme on {emb.kind}</button> : (
          <div className="space-y-1">
            <iframe title={`${emb.kind} theme song`} src={emb.src} width="100%" height={emb.h} style={{ border: 0, borderRadius: 8 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
            <button onClick={() => setOpen(false)} className="body text-xs underline" style={{ color: C.mute }}>Hide player</button>
          </div>
        )}
      </div>
    );
  }
  const play = async () => {
    if (state === "playing") { audioRef.current?.pause(); Jingle.stop(); setState("idle"); return; }
    if (meta.type === "theme") { setState("playing"); Jingle.start(meta.id, () => setState("idle")); return; }
    setState("loading");
    try {
      let src = null;
      if (me) { try { const r = await window.storage.get("ascend-song", false); src = r?.value; } catch (e) { /* fall through */ } }
      if (!src) { const r = await window.storage.get(`song:${playerId}`, true); src = r?.value; }
      if (!src) throw new Error("missing");
      const a = new Audio(src); audioRef.current = a;
      a.onended = () => setState("idle"); a.onerror = () => setState("idle");
      await a.play(); setState("playing");
    } catch (e) { setState("idle"); }
  };
  const label = meta.type === "theme" ? THEMES_MUSIC[meta.id]?.name || "theme" : meta.name;
  return (
    <button onClick={play} className="btn px-4 py-2 text-sm inline-flex items-center gap-2">
      {state === "loading" ? <Loader2 size={16} className="animate-spin" /> : state === "playing" ? <Pause size={16} /> : <Music size={16} />}
      {state === "playing" ? "Stop" : state === "loading" ? "Loading…" : `Play theme${label ? `: ${label}` : ""}`}
    </button>
  );
}

/* ---------- Sound effects ---------- */

/* ---------- Rank-up ceremony ---------- */
