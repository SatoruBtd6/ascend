import { useEffect, useState } from "react";
import { supabase, configured } from "./supabase.js";
import { installStorage, installClaudeProxy } from "./shims.js";
import App from "./App.jsx";

const box = { minHeight: "100vh", background: "#000", color: "#E6F6FF", fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 };
const card = { width: "100%", maxWidth: 380, border: "1px solid rgba(0,217,255,.3)", borderRadius: 6, padding: 24, background: "linear-gradient(180deg, rgba(0,34,70,.42), rgba(0,0,0,.94))", boxShadow: "0 0 24px rgba(0,217,255,.15)" };
const input = { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 4, border: "1px solid #123148", background: "#000", color: "#E6F6FF", fontSize: 16, marginTop: 12 };
const btn = { width: "100%", padding: 14, marginTop: 12, borderRadius: 4, border: "none", background: "linear-gradient(180deg,#00D9FF,#0A84FF)", color: "#001018", fontWeight: 800, fontSize: 16, boxShadow: "0 0 22px rgba(0,217,255,.5)" };
const link = { background: "none", border: "none", color: "#6A86A8", textDecoration: "underline", marginTop: 14, fontSize: 14, padding: 0 };

export default function Auth() {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState(() => localStorage.getItem("ascend-email") || "");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return <div style={box}><div style={card}><h1 style={{ fontSize: 22, margin: 0 }}>Almost there</h1><p style={{ color: "#9DB2CC", lineHeight: 1.5 }}>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.</p></div></div>;
  }
  if (session === undefined) return <div style={box}><div style={{ color: "#6A86A8" }}>Loading…</div></div>;

  if (!session) {
    const submit = async (e) => {
      e.preventDefault(); setErr(""); setBusy(true);
      const clean = email.trim().toLowerCase();
      localStorage.setItem("ascend-email", clean);
      const { data, error } = mode === "signup"
        ? await supabase.auth.signUp({ email: clean, password: pw })
        : await supabase.auth.signInWithPassword({ email: clean, password: pw });
      setBusy(false);
      if (error) {
        const m = error.message;
        if (/already registered|already exists/i.test(m)) setErr("That email already has an account. Tap \"I already have an account\" and sign in.");
        else if (/invalid login/i.test(m)) setErr("Wrong email or password. New here? Tap \"Create an account\".");
        else if (/password/i.test(m)) setErr("Password needs to be at least 6 characters.");
        else setErr(m);
      } else if (mode === "signup" && !data.session) {
        setErr("Account made, but email confirmation is still on in Supabase. Turn off \"Confirm email\" in Authentication → Providers → Email, then sign in.");
      }
    };
    return (
      <div style={box}>
        <form style={card} onSubmit={submit}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 2, textShadow: "0 0 14px rgba(0,217,255,.7)" }}>ASCEND</div>
          <p style={{ color: "#9DB2CC", lineHeight: 1.5, marginBottom: 0 }}>{mode === "signup" ? "Create your account. Use any password you'll remember." : "Sign in to your account."}</p>
          <input style={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <input style={input} type="password" required minLength={6} placeholder="Password (6+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
          <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>{busy ? "One sec…" : mode === "signup" ? "Create account" : "Sign in"}</button>
          <button type="button" style={link} onClick={() => { setErr(""); setMode(mode === "signup" ? "signin" : "signup"); }}>{mode === "signup" ? "I already have an account" : "Create an account"}</button>
          {err && <p style={{ color: "#FF4D6D", lineHeight: 1.4 }}>{err}</p>}
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
