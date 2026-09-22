import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { ask } from "../../lib/ask.js";
import { today } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { shrinkPhoto } from "../fuel/shrinkPhoto.js";
export function ProgressPhotos({ s }) {
  const [keys, setKeys] = useState([]);
  const [imgs, setImgs] = useState({});
  const [pick, setPick] = useState([]);
  const [slider, setSlider] = useState(50);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const camRef = useRef(null), libRef = useRef(null);
  const load = async () => {
    try { const res = await window.storage.list("photo:", false); const ks = (res?.keys || []).sort().reverse(); setKeys(ks); const out = {}; await Promise.all(ks.slice(0, 12).map(async (k) => { try { const r = await window.storage.get(k, false); if (r?.value) out[k] = r.value; } catch (e) { /* skip */ } })); setImgs(out); } catch (e) { /* offline */ }
  };
  useEffect(() => { if (open) load(); }, [open]);
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true);
    try { const small = await shrinkPhoto(f, 700); const k = `photo:${today()}-${Date.now().toString(36)}`; await window.storage.set(k, small, false); await load(); } catch (err) { /* ignore */ }
    setBusy(false);
  };
  const del = async (k) => {
    try {
      await window.storage.delete(k, false);
      setPick((x) => x.filter((y) => y !== k));
      setKeys((ks) => ks.filter((x) => x !== k));
      setImgs((m) => { const n = { ...m }; delete n[k]; return n; });
    } catch (e) { /* keep showing until it actually deletes */ }
  };
  const label = (k) => { const m = k.match(/^photo:(\d{4}-\d{2}-\d{2})/); return m ? new Date(m[1] + "T12:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "2-digit" }) : ""; };
  const [a, b] = pick;
  return (
    <div className="panel">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex justify-between items-center font-semibold text-sm"><span className="flex items-center gap-2"><ImageIcon size={16} style={{ color: C.cyan }} />Progress photos{keys.length ? ` (${keys.length})` : ""}</span><ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} /></button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="body text-xs" style={{ color: C.dim }}>Private to you. Take one a month in the same spot and light. Tap two to compare.</div>
          <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onFile} style={{ display: "none" }} />
          <input ref={libRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => camRef.current?.click()} disabled={busy} className="btn py-2.5 text-sm flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}Take photo</button>
            <button onClick={() => libRef.current?.click()} disabled={busy} className="ghost py-2.5 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Upload size={16} />Choose photo</button>
          </div>
          {a && b && imgs[a] && imgs[b] && (
            <div className="space-y-2">
              <div className="relative select-none" style={{ aspectRatio: "3/4", borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={imgs[b]} alt="Before" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, width: `${slider}%`, overflow: "hidden" }}><img src={imgs[a]} alt="After" style={{ width: `${10000 / slider}%`, height: "100%", objectFit: "cover", maxWidth: "none" }} /></div>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: `${slider}%`, width: 2, background: C.cyan, boxShadow: `0 0 8px ${C.glow}` }} />
                <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: 4 }}>{label(a)}</span>
                <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold" style={{ background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: 4 }}>{label(b)}</span>
              </div>
              <input type="range" min="2" max="98" value={slider} onChange={(e) => setSlider(+e.target.value)} className="w-full" aria-label="Compare slider" style={{ accentColor: C.cyan }} />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {keys.slice(0, 12).map((k) => (
              <div key={k} className="relative">
                <button onClick={() => setPick((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k].slice(-2)))} className="w-full" style={{ aspectRatio: "3/4", borderRadius: 6, overflow: "hidden", border: `2px solid ${pick.includes(k) ? C.cyan : C.border}`, background: C.soft }}>
                  {imgs[k] ? <img src={imgs[k]} alt={label(k)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Loader2 size={16} className="animate-spin m-auto" />}
                </button>
                <div className="flex justify-between items-center body text-xs mt-0.5" style={{ color: C.dim }}><span>{label(k)}</span><button aria-label="Delete photo" onClick={() => ask("Delete this photo?", () => del(k), "Delete")} style={{ color: C.mute }}><Trash2 size={12} /></button></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
