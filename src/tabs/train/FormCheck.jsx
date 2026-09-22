import { useState, useRef } from "react";
import { Video, Loader2, Camera } from "lucide-react";
import { C } from "../../theme.js";
import { STERLING_SYS } from "./sterling.js";
export async function videoFrames(file, n = 3, size = 240) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    await new Promise((res, rej) => { v.onloadedmetadata = res; v.onerror = () => rej(new Error("video")); setTimeout(() => rej(new Error("timeout")), 8000); });
    const dur = Math.min(v.duration || 10, 30);
    const c = document.createElement("canvas");
    const k = Math.min(1, size / Math.max(v.videoWidth || size, v.videoHeight || size));
    c.width = Math.round((v.videoWidth || size) * k); c.height = Math.round((v.videoHeight || size) * k);
    const ctx = c.getContext("2d");
    const frames = [];
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * dur;
      await new Promise((res, rej) => { v.onseeked = res; v.onerror = () => rej(new Error("seek")); v.currentTime = t; setTimeout(res, 2500); });
      ctx.drawImage(v, 0, 0, c.width, c.height);
      frames.push(c.toDataURL("image/jpeg", 0.5));
    }
    return frames;
  } finally { URL.revokeObjectURL(url); }
}
export function FormCheck({ exercise, compact, result, onResult, heading = true }) {
  const ref = useRef(null);
  const [state, setState] = useState(result || { status: "idle", text: "" });
  const setBoth = (next) => { setState(next); onResult?.(next); };
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBoth({ status: "loading", text: "" });
    try {
      const frames = await videoFrames(f);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 320, system: STERLING_SYS, messages: [{ role: "user", content: [
          ...frames.map((fr) => ({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: fr.split(",")[1] } })),
          { type: "text", text: `These are frames from a short video of someone doing ${exercise}, in time order. Give a form check: what looks good, the one or two most important fixes, and a cue to think about next set. Plain text, 3 to 5 short sentences, no markdown. If the frames don't show the lift clearly, say what angle to film from instead.` },
        ] }] }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
      if (!text) throw new Error("empty");
      setBoth({ status: "done", text });
    } catch (err) { setBoth({ status: "error", text: "Couldn't read that video. Try a 5–15 second clip filmed from the side." }); }
  };
  return (
    <div className={compact ? "mt-2 space-y-1.5" : "space-y-2"}>
      {heading && !compact && <div className="font-bold flex items-center gap-2"><Video size={18} style={{ color: C.cyan }} />Form check by video</div>}
      {!compact && <div className="body text-xs" style={{ color: C.dim }}>Film one set from the side, 5–15 seconds. Sterling looks at a few frames and gives cues. Videos aren't stored.</div>}
      <input ref={ref} type="file" accept="video/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <button onClick={() => ref.current?.click()} disabled={state.status === "loading"} className={`${compact ? "ghost" : "btn"} w-full py-2 text-sm flex items-center justify-center gap-2`} style={{ minHeight: 40 }}>{state.status === "loading" ? <><Loader2 size={16} className="animate-spin" />Watching your set…</> : <><Camera size={16} />{compact ? "Film this lift" : "Record or choose a clip"}</>}</button>
      {state.text && <div className="body text-sm" style={{ color: state.status === "error" ? C.red : C.text }}>{state.text}</div>}
    </div>
  );
}
