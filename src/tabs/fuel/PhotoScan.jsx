import { useState, useRef } from "react";
import { Camera, X, Loader2, Image as ImageIcon } from "lucide-react";
import * as D from "../../diag.js";
import { C } from "../../theme.js";
import { NumField } from "../../ui/NumField.jsx";
import { shrinkPhoto } from "./shrinkPhoto.js";
import { scanMealPhoto } from "./scanMealPhoto.js";
import { PublishMealToggle } from "./PublishMealToggle.jsx";
export function PhotoScan({ onAddAll, onCancel, sState, onShare }) {
  const camRef = useRef(null), libRef = useRef(null);
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); setErr(""); setItems(null);
    try {
      const small = await shrinkPhoto(f, 640);
      setImg(small);
      const r = await scanMealPhoto(small);
      if (!r.items.length) throw new Error("nothing");
      setItems(r.items); setNote(r.note);
    } catch (e2) { setErr("Couldn't read a meal from that photo. Try a clearer shot from above with good light."); }
    setBusy(false);
  };
  const tot = (items || []).reduce((a, it) => ({ cal: a.cal + (+it.cal || 0), p: a.p + (+it.p || 0), c: a.c + (+it.c || 0), f: a.f + (+it.f || 0) }), { cal: 0, p: 0, c: 0, f: 0 });
  const upd = (i, k, v) => setItems((x) => x.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  return (
    <div className="panel p-4 space-y-3" style={{ borderColor: C.cyan }}>
      <div className="flex justify-between items-center"><div className="font-bold flex items-center gap-2"><Camera size={18} style={{ color: C.cyan }} />Scan a meal</div><button aria-label="Close" onClick={onCancel} style={{ color: C.mute }}><X size={18} /></button></div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: "none" }} />
      <input ref={libRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      {!items && !busy && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => camRef.current?.click()} className="btn py-3 text-sm flex items-center justify-center gap-2"><Camera size={16} />Take photo</button>
          <button onClick={() => libRef.current?.click()} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><ImageIcon size={16} />Choose photo</button>
        </div>
      )}
      {busy && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Looking at your food…</div>}
      {err && <div className="body text-sm" style={{ color: C.red }}>{err}</div>}
      {img && <img src={img} alt="Your meal" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />}
      {items && (
        <>
          <div className="body text-sm" style={{ color: C.sub }}>Here's what I think you're eating. Fix anything that's off, then add it.{note ? <span style={{ color: C.dim }}> ({note})</span> : null}</div>
          {items.map((it, i) => (
            <div key={i} className="ghost p-2 space-y-1">
              <div className="flex gap-2 items-center">
                <input className="inp text-sm font-semibold" value={it.name} onChange={(e) => upd(i, "name", e.target.value)} aria-label="Food name" {...D.fuelBind("fuel-scan-name")} />
                <button aria-label="Remove item" onClick={() => setItems((x) => x.filter((_, j) => j !== i))} style={{ color: C.mute }}><X size={16} /></button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[["cal", "Cal"], ["p", "Protein"], ["c", "Carbs"], ["f", "Fat"]].map(([k, l]) => <label key={k} className="body text-xs text-center" style={{ color: C.dim }}>{l}<NumField inputMode="decimal" className="inp text-center mt-0.5" value={it[k]} onCommit={(v) => upd(i, k, v)} {...D.fuelBind("fuel-scan-n")} /></label>)}
              </div>
            </div>
          ))}
          <button onClick={() => setItems((x) => [...x, { name: "Something else", cal: 0, p: 0, c: 0, f: 0 }])} className="body text-xs underline" style={{ color: C.cyan }}>+ Add something the scan missed</button>
          <div className="flex justify-between font-bold pt-2" style={{ borderTop: `1px solid ${C.line}` }}><span>Total</span><span style={{ color: C.gold }}>{tot.cal} cal · P {tot.p} · C {tot.c} · F {tot.f}</span></div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setItems(null); setImg(null); }} className="ghost py-3 text-sm font-bold">Rescan</button>
            <button onClick={() => onAddAll(items.filter((it) => it.name.trim()))} disabled={!items.length} className="btn py-3 text-sm">Add {items.length} item{items.length === 1 ? "" : "s"} to today</button>
          {onShare && items.length > 0 && <div className="col-span-2"><PublishMealToggle s={sState} ai food={{ name: items.map((i2) => i2.name).join(" + ").slice(0, 60), cal: tot.cal, p: tot.p, c: tot.c, f: tot.f, ingredients: items.map((i2) => ({ name: i2.name, qty: 1, cal: i2.cal, p: i2.p, c: i2.c, f: i2.f })) }} /></div>}
          </div>
        </>
      )}
    </div>
  );
}

