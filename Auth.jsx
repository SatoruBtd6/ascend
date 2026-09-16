import { useEffect, useState } from "react";
import { supabase, configured } from "./supabase.js";
import { installStorage, installClaudeProxy } from "./shims.js";
import App from "./App.jsx";

const box = { minHeight: "100vh", background: "#000", color: "#E6F6FF", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
const card = { width: "100%", maxWidth: 380, border: "1px solid rgba(0,217,255,.3)", borderRadius: 6, padding: 24, background: "linear-gradient(180deg, rgba(0,34,70,.42), rgba(0,0,0,.94))", boxShadow: "0 0 24px rgba(0,217,255,.15)" };
const input = { width: "100%", padding: "12px 14px", borderRadius: 4, border: "1px solid #123148", background: "#000", color: "#E6F6FF", fontSize: 16, marginTop: 12 };
const btn = { width: "100%", padding: 14, marginTop: 12, borderRadius: 4, border: "none", background: "linear-gradient(180deg,#00D9FF,#0A84FF)", color: "#001018", fontWeight: 800, fontSize: 16, boxShadow: "0 0 22px rgba(0,217,255,.5)" };

export default function Auth() {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return <div style={box}><div style={card}><h1 style={{ fontSize: 22, margin: 0 }}>Almost there</h1><p style={{ color: "#9DB2CC", lineHeight: 1.5 }}>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in Vercel (Settings → Environment Variables), then redeploy. See SETUP.md.</p></div></div>;
  }
  if (session === undefined) return <div style={box}><div style={{ color: "#6A86A8" }}>Loading…</div></div>;

  if (!session) {
    const send = async (e) => {
      e.preventDefault(); setErr(""); setBusy(true);
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
      setBusy(false);
      if (error) setErr(error.message); else setSent(true);
    };
    return (
      <div style={box}>
        <form style={card} onSubmit={send}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, textShadow: "0 0 14px rgba(0,217,255,.7)" }}>ASCEND</div>
          {sent ? (
            <p style={{ color: "#9DB2CC", lineHeight: 1.5 }}>Check your email for a sign-in link and tap it on this phone. You'll only need to do this once per device.</p>
          ) : (
            <>
              <p style={{ color: "#9DB2CC", lineHeight: 1.5, marginBottom: 0 }}>Enter your email and we'll send a sign-in link. No password needed.</p>
              <input style={input} type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>{busy ? "Sending…" : "Send sign-in link"}</button>
            </>
          )}
          {err && <p style={{ color: "#FF4D6D" }}>{err}</p>}
        </form>
      </div>
    );
  }

  installStorage(supabase, session.user.id);
  installClaudeProxy(supabase);
  window.ascendUserId = session.user.id;
  window.ascendAuth = { email: session.user.email, signOut: () => supabase.auth.signOut().then(() => window.location.reload()) };
  return <App key={session.user.id} />;
}
