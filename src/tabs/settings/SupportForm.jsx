import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { C } from "../../theme.js";
export function SupportForm({ s, tab = "settings" }) {
  const [cat, setCat] = useState("Bug");
  const [msg, setMsg] = useState("");
  const [state, setState] = useState({ status: "idle", text: "" });
  const send = async () => {
    setState({ status: "sending", text: "" });
    try {
      const auth = window.ascendAuth;
      const token = auth?.token ? await auth.token() : "";
      const r = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ category: cat, message: msg, name: s.profile.name, info: { tab, ua: navigator.userAgent } }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Couldn't send");
      setMsg(""); setState({ status: "sent", text: "Sent. You'll get a reply at your account email." });
    } catch (e) { setState({ status: "error", text: String(e.message || e) }); }
  };
  return (
    <div className="panel p-4 space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["Bug", "Feature idea", "Account", "Other"].map((c) => <button key={c} onClick={() => setCat(c)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: cat === c ? C.blue : C.glass, color: cat === c ? "#fff" : C.text, border: `1px solid ${C.glassLine}` }}>{c}</button>)}
      </div>
      <textarea className="inp body text-sm" rows={4} maxLength={4000} placeholder={cat === "Bug" ? "What happened, and what did you expect?" : "Tell us what's on your mind"} value={msg} onChange={(e) => { setMsg(e.target.value); if (state.status !== "sending") setState({ status: "idle", text: "" }); }} aria-label="Support message" />
      <button onClick={send} disabled={msg.trim().length < 5 || state.status === "sending"} className="btn w-full py-3 flex items-center justify-center gap-2" style={msg.trim().length < 5 ? { opacity: 0.5 } : null}>{state.status === "sending" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send to support</button>
      {state.text && <div className="body text-sm" style={{ color: state.status === "sent" ? C.green : C.red }}>{state.text}</div>}
    </div>
  );
}

/* ---------- Geo helpers ---------- */

/* ---------- Live run tracker (full screen) ---------- */


/* ---------- Steps ---------- */

/* ---------- Route planner + run hub ---------- */

/* ---------- Onboarding ---------- */
