import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronRight, Loader2, Swords } from "lucide-react";
import { ask } from "../../lib/ask.js";
import { uid } from "../../lib/dates.js";
import { C } from "../../theme.js";
import { Empty } from "../../ui/primitives.jsx";
import { shrinkPhoto } from "../fuel/shrinkPhoto.js";
import { ReceiptButton, buildReceipt } from "../train/receipt.jsx";
import { MOG_XP } from "../train/xpConstants.js";
export function MogFace({ e, label, win }) {
  return (
    <div className="flex-1 text-center">
      <img src={e.img} alt={`${label}'s mog`} style={{ width: "100%", maxWidth: 140, aspectRatio: "1", objectFit: "cover", borderRadius: 8, margin: "0 auto", border: `2px solid ${win ? C.gold : C.border}`, boxShadow: win ? `0 0 16px ${C.gold}` : "none" }} />
      <div className="font-bold text-sm mt-1 truncate">{label}</div>
      <div className="text-2xl font-extrabold glowtext" style={{ color: win ? C.gold : C.text }}>{e.total}</div>
      <div className="body text-xs" style={{ color: C.dim }}>lips {e.pucker} · brows {e.brows} · stare {e.stare} · jaw {e.jaw} · commit {e.commitment}</div>
      <div className="body text-xs italic mt-1" style={{ color: C.sub }}>"{e.quip}"</div>
    </div>
  );
}

export async function rateMog(dataUrl) {
  const b64data = dataUrl.split(",")[1];
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5", max_tokens: 220,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64data } },
        { type: "text", text: `This is a silly game between friends called a mog-off. Judge ONLY the facial expression performance, never the person's looks. The goal is the classic fashion-model "Blue Steel" face: dead-serious stare, puffed fishy pouty lips, intense eyebrows, chin up, zero smile. Score each 0-20 as integers: pucker (fishy lips), brows (intensity), stare (seriousness of the eyes), jaw (chin/jaw drama), commitment (how fully they sold it, laughing or smiling loses points). Respond ONLY with JSON: {"pucker": n, "brows": n, "stare": n, "jaw": n, "commitment": n, "quip": "one short playful judge comment, under 12 words"}` },
      ] }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const r = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  const clamp = (v) => Math.max(0, Math.min(20, Math.round(+v || 0)));
  const parts = { pucker: clamp(r.pucker), brows: clamp(r.brows), stare: clamp(r.stare), jaw: clamp(r.jaw), commitment: clamp(r.commitment) };
  return { ...parts, total: Object.values(parts).reduce((a, b) => a + b, 0), quip: String(r.quip || "The judges have spoken.").slice(0, 80) };
}
export function MogSection({ s, setS, gainXp, me, targetId, targetName, targetUid, embedded, onCount }) {
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const camRef = useRef(null);
  const pendingRef = useRef(null); // challenge being accepted, or null for a new challenge
  const load = async () => {
    if (!window.storage?.list) return;
    try {
      const res = await window.storage.list("mog:", true);
      const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? { key: k, ...JSON.parse(r.value) } : null; } catch { return null; } }));
      setList(items.filter((m) => m && (m.from === s.playerId || m.to === s.playerId)).sort((a, b) => (b.t || 0) - (a.t || 0)));
    } catch { /* offline */ }
  };
  useEffect(() => { load(); }, [targetId]);

  const snap = (pending) => { if (!s.lb || !s.profile.name) { setNote("Join the leaderboard first so the challenge has your name on it."); return; } pendingRef.current = pending; camRef.current?.click(); };
  const onShot = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
    setBusy(true); setNote("");
    try {
      const img = await shrinkPhoto(f, 260);
      let score;
      try { score = await rateMog(img); } catch { const seed = img.length % 37; score = { pucker: 8 + seed % 9, brows: 6 + seed % 11, stare: 7 + seed % 10, jaw: 5 + seed % 12, commitment: 9 + seed % 8, quip: "The judge blinked, so this one's on vibes.", total: 0 }; score.total = score.pucker + score.brows + score.stare + score.jaw + score.commitment; }
      const entry = { ...score, img, name: s.profile.name, t: Date.now() };
      const pending = pendingRef.current;
      if (pending) {
        const winner = entry.total > pending.a.total ? s.playerId : entry.total < pending.a.total ? pending.from : "tie";
        const rec = { ...pending, b: entry, status: "done", winner };
        delete rec.key;
        await window.storage.set(pending.key, JSON.stringify(rec), true);
      } else {
        const id = uid();
        const rec = { id, from: s.playerId, fromUid: window.ascendUserId || null, fromName: s.profile.name, to: targetId, toUid: targetUid || null, toName: targetName, t: Date.now(), a: entry, b: null, status: "pending" };
        await window.storage.set(`mog:${id}`, JSON.stringify(rec), true);
      }
      await load();
    } catch (err) { setNote("Couldn't process that photo. Try again in better light."); }
    setBusy(false);
  };
  const claim = (m) => {
    setS((p) => ({ ...p, mogClaimed: { ...(p.mogClaimed || {}), [m.id]: true } }));
    gainXp(MOG_XP, "Mog-off win", `mog_${m.id}`);
  };
  const remove = async (m) => { try { await window.storage.delete(m.key, true); setList((l) => l.filter((x) => x.key !== m.key)); } catch { /* ignore */ } };
  const rows = me ? list : list.filter((m) => (m.from === targetId || m.to === targetId));
  useEffect(() => { onCount?.(rows.length); }, [rows.length]);
  const viewer = me ? s.playerId : targetId;
  const pending = rows.filter((m) => m.status === "pending");
  const done = rows.filter((m) => m.status === "done");
  const shown = showAll ? done : done.slice(0, 5);
  const d8 = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div>
      {!embedded && <h2 className="text-lg font-bold flex items-center gap-2 mb-2"><Swords size={18} style={{ color: "#FF2D6F" }} />Mog-offs</h2>}
      <input ref={camRef} type="file" accept="image/*" capture="user" onChange={onShot} style={{ display: "none" }} />
      {!me && (
        <button onClick={() => snap(null)} disabled={busy} className="ghost w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2 mb-2" style={{ color: C.cyan }}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}{busy ? "Judging your mog…" : `🐟 Mog-off ${targetName || "them"} (+${MOG_XP} XP)`}</button>
      )}
      {note && <div className="body text-sm mb-2" style={{ color: C.orange }}>{note}</div>}
      {me && rows.length === 0 && <Empty>No mog-offs yet — open a cousin's profile and challenge them.</Empty>}
      {!s.lb && me && <div className="body text-xs mb-2" style={{ color: C.orange }}>Join the leaderboard (Board tab) to send and receive mog-offs.</div>}
      {pending.map((m) => {
        const iAmTarget = m.to === s.playerId;
        const opp = m.from === viewer ? m.toName : m.fromName;
        return (
          <div key={m.key} className="flex items-center gap-2 py-2.5" style={{ borderBottom: `1px solid rgba(255,255,255,.08)` }}>
            <span className="flex-1 min-w-0 truncate font-semibold text-sm">{opp}</span>
            <span className="body text-xs shrink-0" style={{ color: C.dim }}>{d8(m.t)}</span>
            {iAmTarget
              ? <button onClick={() => snap(m)} disabled={busy} className="btn px-3 py-1.5 text-xs flex items-center gap-1 shrink-0">{busy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}Accept · beat {m.a.total}</button>
              : <span className="body text-xs shrink-0" style={{ color: C.dim }}>Waiting · you {m.a.total}</span>}
          </div>
        );
      })}
      {shown.map((m) => {
        const iAmTarget = m.to === s.playerId, iAmFrom = m.from === s.playerId;
        const isOpen = open === m.key;
        const opp = m.from === viewer ? m.toName : m.fromName;
        const won = m.winner === viewer, tie = m.winner === "tie";
        return (
          <div key={m.key} style={{ borderBottom: `1px solid rgba(255,255,255,.08)` }}>
            <button onClick={() => setOpen(isOpen ? null : m.key)} className="w-full flex items-center gap-2 py-2.5 text-left" aria-expanded={isOpen}>
              <span className="flex-1 min-w-0 truncate font-semibold text-sm">{opp}</span>
              <span className="body text-xs shrink-0" style={{ color: C.dim }}>{d8(m.t)}</span>
              <span className="body text-xs font-bold shrink-0 w-9 text-right" style={{ color: tie ? C.dim : won ? C.green : C.red }}>{tie ? "Tied" : won ? "Won" : "Lost"}</span>
              <ChevronDown size={14} className="shrink-0" style={{ color: C.mute, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {isOpen && (
              <div className="pb-3 space-y-2">
                <div className="flex gap-3"><MogFace e={m.a} label={m.fromName} win={m.winner === m.from} /><MogFace e={m.b} label={m.toName} win={m.winner === m.to} /></div>
                {m.winner === s.playerId && !(s.mogClaimed || {})[m.id] && <button onClick={() => claim(m)} className="w-full py-2 font-bold" style={{ borderRadius: 4, background: C.gold, color: "#0A1630" }}>Claim +{MOG_XP} XP</button>}
                <div className="flex items-center justify-between">
                  {(iAmFrom || iAmTarget) && me ? <button onClick={() => ask("Delete this mog-off?", () => remove(m), "Delete")} className="body text-xs underline" style={{ color: C.mute }}>Delete</button> : <span />}
                  <ReceiptButton label="Share" make={() => buildReceipt({ s, kind: "Mog-off", headline: m.winner === "tie" ? "Dead heat" : `${m.winner === m.from ? m.fromName : m.toName} mogged`, sub: `${m.fromName} ${m.a.total} vs ${m.toName} ${m.b?.total ?? "–"}`, rows: [["Lips", `${m.a.pucker} vs ${m.b?.pucker ?? "–"}`], ["Brows", `${m.a.brows} vs ${m.b?.brows ?? "–"}`], ["Stare", `${m.a.stare} vs ${m.b?.stare ?? "–"}`], ["Commitment", `${m.a.commitment} vs ${m.b?.commitment ?? "–"}`]] })} />
                </div>
              </div>
            )}
          </div>
        );
      })}
      {done.length > 5 && !showAll && <button onClick={() => setShowAll(true)} className="body text-sm font-bold w-full py-2.5" style={{ color: C.cyan }}>Show all ({done.length})</button>}
      {showAll && done.length > 5 && <button onClick={() => setShowAll(false)} className="body text-xs w-full py-2" style={{ color: C.mute }}>Show less</button>}
    </div>
  );
}

/* ---------- Sterling coaching cards ---------- */

// Pops up on the Fuel tab once most of the day's calories are in, with foods that finish the macros
// Shows during a workout with what to do next and a form-check video when it matters

// Pending mog-off challenges, shown on the Status tab so nobody misses one
export function MogInbox({ s, openProfile }) {
  const [pending, setPending] = useState([]);
  useEffect(() => {
    (async () => {
      if (!window.storage?.list || !s.lb) return;
      try {
        const res = await window.storage.list("mog:", true);
        const items = await Promise.all((res?.keys || []).map(async (k) => { try { const r = await window.storage.get(k, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }));
        setPending(items.filter((m) => m && m.status === "pending" && m.to === s.playerId));
      } catch { /* offline */ }
    })();
  }, [s.lb, s.playerId]);
  if (!pending.length) return null;
  return (
    <button onClick={() => openProfile()} className="panel p-3 w-full text-left flex items-center gap-3" style={{ borderColor: C.gold }}>
      <span className="text-2xl">🐟</span>
      <div className="flex-1">
        <div className="font-bold" style={{ color: C.gold }}>{pending.length === 1 ? `${pending[0].fromName} challenged you to a mog-off` : `${pending.length} mog-off challenges waiting`}</div>
        <div className="body text-xs" style={{ color: C.dim }}>Tap to open your profile and mog back.</div>
      </div>
      <ChevronRight size={18} style={{ color: C.gold }} />
    </button>
  );
}

/* ---------- Rank emblems v3 ---------- */
/* ---------- Muscle pages ---------- */
