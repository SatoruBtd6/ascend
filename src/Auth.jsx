import { useEffect, useState } from "react";
import { supabase, configured } from "./supabase.js";
import { installStorage, installClaudeProxy } from "./shims.js";
import App from "./App.jsx";
import { BootScreen } from "./Boot.jsx";

const box = { minHeight: "100dvh", background: "radial-gradient(80% 50% at 50% 0%, rgba(40,90,200,.25), transparent 70%), #000", color: "#F2F8FF", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(24px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom))" };
const card = { width: "100%", maxWidth: 380, borderRadius: 20, padding: 28, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.10)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" };
const input = { width: "100%", boxSizing: "border-box", padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.4)", color: "#F2F8FF", fontSize: 16, marginTop: 12, outline: "none" };
const btn = { width: "100%", padding: 15, marginTop: 16, borderRadius: 12, border: "none", background: "linear-gradient(180deg,#F5D27A,#C9962E)", color: "#1A1204", fontWeight: 700, fontSize: 16, boxShadow: "0 8px 24px rgba(201,150,46,.35)" };
const link = { background: "none", border: "none", color: "#A3B6CF", marginTop: 14, fontSize: 14, padding: 0, cursor: "pointer" };
const Logo = () => (
  <div style={{ textAlign: "center", marginBottom: 8 }}>
    <img src="/logo.webp" alt="Ascend" width="132" height="126" style={{ width: 132, height: "auto", filter: "drop-shadow(0 6px 24px rgba(245,210,122,.35))" }} />
    <div style={{ fontSize: 13, letterSpacing: 6, color: "#C9B57A", marginTop: 6, fontWeight: 600 }}>ASCEND</div>
  </div>
);

export default function Auth() {
  const [session, setSession] = useState(undefined);
  const [mode, setMode] = useState("signin"); // signin | signup | forgot | recover
  const [email, setEmail] = useState(() => { try { return localStorage.getItem("ascend-email") || ""; } catch { return ""; } });
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") { setMode("recover"); setMsg(null); }
      setSession(s ?? null);
    });
    if (/type=recovery/.test(window.location.hash)) setMode("recover");
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!configured) {
    return <div style={box}><div style={card}><Logo /><p style={{ color: "#A3B6CF", lineHeight: 1.5 }}>Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, then redeploy.</p></div></div>;
  }
  if (session === undefined) return <BootScreen />;

  const err = (text) => setMsg({ ok: false, text });
  const ok = (text) => setMsg({ ok: true, text });

  // Signed in through a reset link: ask for the new password before entering the app
  if (session && mode === "recover") {
    const save = async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      const { error } = await supabase.auth.updateUser({ password: pw });
      setBusy(false);
      if (error) err(/password/i.test(error.message) ? "Password needs to be at least 6 characters." : error.message);
      else { window.history.replaceState(null, "", window.location.pathname); setPw(""); setMode("signin"); }
    };
    return (
      <div style={box}>
        <form style={card} onSubmit={save}>
          <Logo />
          <p style={{ color: "#A3B6CF", lineHeight: 1.5, marginBottom: 0 }}>Choose a new password.</p>
          <input style={input} type="password" required minLength={6} placeholder="New password (6+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
          {msg && <p style={{ color: msg.ok ? "#39E68F" : "#FF6B85", lineHeight: 1.4 }}>{msg.text}</p>}
        </form>
      </div>
    );
  }

  if (!session) {
    const submit = async (e) => {
      e.preventDefault(); setMsg(null); setBusy(true);
      const clean = email.trim().toLowerCase();
      try { localStorage.setItem("ascend-email", clean); } catch { /* ignore */ }
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(clean, { redirectTo: window.location.origin });
        setBusy(false);
        if (error) err(/rate limit/i.test(error.message) ? "Too many emails sent. Try again in a few minutes." : error.message);
        else ok("If that email has an account, a reset link is on its way. Open it on this device.");
        return;
      }
      const { data, error } = mode === "signup"
        ? await supabase.auth.signUp({ email: clean, password: pw })
        : await supabase.auth.signInWithPassword({ email: clean, password: pw });
      setBusy(false);
      if (error) {
        const m = error.message;
        if (/already registered|already exists/i.test(m)) err("That email already has an account. Sign in instead.");
        else if (/invalid login/i.test(m)) err("Wrong email or password.");
        else if (/password/i.test(m)) err("Password needs to be at least 6 characters.");
        else if (/fetch|network/i.test(m)) err("No connection. Signing in needs signal the first time.");
        else err(m);
      } else if (mode === "signup" && !data.session) {
        ok("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    };
    const title = mode === "signup" ? "Create your account." : mode === "forgot" ? "Enter your email and we'll send a reset link." : "Welcome back.";
    return (
      <div style={box}>
        <form style={card} onSubmit={submit}>
          <Logo />
          <p style={{ color: "#A3B6CF", lineHeight: 1.5, marginBottom: 0, textAlign: "center" }}>{title}</p>
          <input style={input} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          {mode !== "forgot" && <input style={input} type="password" required minLength={6} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
          <button style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={busy}>{busy ? "One sec…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            {mode === "signin" && <button type="button" style={link} onClick={() => { setMsg(null); setMode("forgot"); }}>Forgot password?</button>}
            <button type="button" style={link} onClick={() => { setMsg(null); setMode(mode === "signin" ? "signup" : "signin"); }}>{mode === "signin" ? "Create an account" : "Back to sign in"}</button>
          </div>
          {msg && <p style={{ color: msg.ok ? "#39E68F" : "#FF6B85", lineHeight: 1.4 }}>{msg.text}</p>}
        </form>
      </div>
    );
  }

  installStorage(supabase, session.user.id);
  installClaudeProxy(supabase);
  window.ascendUserId = session.user.id;
  window.ascendAuth = { email: session.user.email, token: async () => (await supabase.auth.getSession()).data.session?.access_token || "",
    registerStepToken: async (hash, oldHash) => {
      const { error } = await supabase.from("step_tokens").insert({ token_hash: hash });
      if (error) throw error;
      if (oldHash) await supabase.from("step_tokens").delete().eq("token_hash", oldHash);
    }, signOut: () => supabase.auth.signOut().then(() => window.location.reload()) };
  return <App key={session.user.id} />;
}
