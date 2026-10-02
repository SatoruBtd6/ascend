import { useState, useRef } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { C } from "../../theme.js";
import { levelFromXp } from "../../math.js";
import { overallRank, overallInfo } from "../../lib/stats.js";
import { physiqueSrc } from "./physique.jsx";
export const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
export async function buildReceipt({ s, kind, headline, sub, rows, tierImg, footer }) {
  const W = 1080, H = 1350, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const oc = overallRank(s);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0b1430"); g.addColorStop(1, "#000"); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W / 2, 380, 40, W / 2, 380, 620); rg.addColorStop(0, `${oc.color}55`); rg.addColorStop(1, "transparent"); x.fillStyle = rg; x.fillRect(0, 0, W, H);
  const [logo, phys] = await Promise.all([loadImg("/logo.webp"), tierImg !== undefined ? loadImg(physiqueSrc(s.profile.sex, tierImg)) : Promise.resolve(null)]);
  if (logo) { const lw = 150, lh = (logo.height / logo.width) * lw; x.drawImage(logo, 70, 60, lw, lh); }
  x.fillStyle = "#C9B57A"; x.font = "600 28px Inter, system-ui, sans-serif"; x.textAlign = "right"; x.fillText("ASCEND", W - 70, 110);
  x.fillStyle = "rgba(255,255,255,.55)"; x.font = "500 26px Inter, system-ui, sans-serif"; x.fillText(new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), W - 70, 150);
  if (phys) { const ph = 620, pw = (phys.width / phys.height) * ph; x.globalAlpha = 0.9; x.drawImage(phys, W - pw - 20, 250, pw, ph); x.globalAlpha = 1; }
  x.textAlign = "left";
  x.fillStyle = oc.color; x.font = "700 30px Inter, system-ui, sans-serif"; x.fillText(kind.toUpperCase(), 70, 300);
  x.fillStyle = "#fff"; x.font = "800 92px Inter, system-ui, sans-serif";
  const words = String(headline).split(" "); let line = "", y = 400;
  words.forEach((w) => { const t = line ? `${line} ${w}` : w; if (x.measureText(t).width > 620 && line) { x.fillText(line, 70, y); line = w; y += 100; } else line = t; });
  x.fillText(line, 70, y);
  if (sub) { x.fillStyle = "rgba(255,255,255,.7)"; x.font = "500 36px Inter, system-ui, sans-serif"; x.fillText(sub, 70, y + 64); }
  let ry = 960;
  (rows || []).slice(0, 4).forEach(([label, value]) => {
    x.fillStyle = "rgba(255,255,255,.07)"; x.beginPath(); x.roundRect?.(70, ry - 58, W - 140, 84, 20); if (!x.roundRect) x.rect(70, ry - 58, W - 140, 84); x.fill();
    x.fillStyle = "rgba(255,255,255,.65)"; x.font = "500 32px Inter, system-ui, sans-serif"; x.fillText(label, 100, ry);
    x.fillStyle = "#fff"; x.font = "700 36px Inter, system-ui, sans-serif"; x.textAlign = "right"; x.fillText(String(value), W - 100, ry); x.textAlign = "left";
    ry += 100;
  });
  x.fillStyle = "#fff"; x.font = "700 40px Inter, system-ui, sans-serif"; x.fillText(s.profile.name || "Ascend lifter", 70, H - 90);
  x.fillStyle = oc.color; x.font = "600 30px Inter, system-ui, sans-serif"; x.fillText(`${overallInfo(s).label} · Level ${levelFromXp(s.xp).lvl}`, 70, H - 48);
  x.fillStyle = "rgba(255,255,255,.5)"; x.textAlign = "right"; x.font = "500 28px Inter, system-ui, sans-serif"; x.fillText(footer || "ascendfit.site", W - 70, H - 48);
  return new Promise((res) => c.toBlob((b) => res(b), "image/png"));
}
export function ReceiptButton({ make, label = "Share card", small }) {
  const [img, setImg] = useState(null);
  const [busy, setBusy] = useState(false);
  const blobRef = useRef(null);
  const open = async () => { setBusy(true); try { const b = await make(); blobRef.current = b; setImg(URL.createObjectURL(b)); } catch (e) { /* ignore */ } setBusy(false); };
  const close = () => { if (img) URL.revokeObjectURL(img); setImg(null); };
  const share = async () => {
    const file = new File([blobRef.current], "ascend.png", { type: "image/png" });
    try { if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: "Ascend" }); return; } } catch (e) { if (e?.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = img; a.download = "ascend.png"; document.body.appendChild(a); a.click(); a.remove();
  };
  return (
    <>
      <button onClick={open} disabled={busy} aria-label={label} className={small ? "" : "ghost px-3 py-2 text-sm font-semibold flex items-center gap-2"} style={{ color: C.cyan }}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}{small ? null : label}
      </button>
      {img && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center p-5 gap-3" style={{ background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)" }} onClick={close}>
          <img src={img} alt="Share card" style={{ maxHeight: "70vh", maxWidth: "100%", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.6)" }} onClick={(e) => e.stopPropagation()} />
          <div className="flex gap-2 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <button onClick={close} className="ghost flex-1 py-3 font-semibold">Close</button>
            <button onClick={share} className="btn flex-1 py-3">Share or save</button>
          </div>
          <div className="body text-xs" style={{ color: "rgba(255,255,255,.6)" }}>On iPhone, choose "Save Image" to post it anywhere.</div>
        </div>
      )}
    </>
  );
}
