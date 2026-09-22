import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Loader2, Mic, Send, Volume2, VolumeX, Youtube } from "lucide-react";
import { GOALS } from "../../data/foods.js";
import { FUEL_XP } from "../../data/quests.js";
import { sexLine, today } from "../../lib/dates.js";
import { isWorkout, mealTotals, overallInfo, rankedLifts, streakOf } from "../../lib/stats.js";
import { levelFromXp, targets } from "../../math.js";
import { C } from "../../theme.js";
import { pointsOf } from "../profile/points.js";
import { STEP_SHORTCUT_URL } from "../run/stepSync.js";
import { VOICE_STYLES, pickBritishVoice } from "../train/sterling.js";
import { ytUrl } from "../train/yt.js";
export function buildContext(s) {
  const p = s.profile, d = today(), t = targets(p);
  const o = overallInfo(s);
  const lifts = rankedLifts(s).sort((a, b) => b.score - a.score).slice(0, 12)
    .map((r) => `${r.e.name}: ${r.label} (best ${Math.round(r.best)}${r.e.type === "bodyweight" ? " reps" : " lb est. 1RM"}${r.next ? `, next ${r.nextLabel} at ${r.next}` : ""})`).join("; ");
  const quests = (s.days?.[d]?.list || []).map((q) => `${q.title} ${q.progress}/${q.target} ${q.unit}${q.claimed ? " (cleared)" : ""}`).join("; ");
  const tot = mealTotals(s.meals[d]);
  const recent = s.workouts.filter(isWorkout).slice(-5).map((w) => `${w.date}${w.title ? ` (${w.title})` : ""}: ${w.exercises.map((e) => `${e.name} ${e.sets.map((x) => (x.w ? `${x.w}x${x.r}` : x.r)).join(",")}`).join(" | ")}`).join("\n");
  return `Name: ${p.name || "unknown"}. Bodyweight ${p.weight} lb, height ${p.height} in, age ${p.age}. ${sexLine(p)} Goal: ${GOALS.find((g) => g.id === p.goal)?.label}.
Level ${levelFromXp(s.xp).lvl} (${s.xp} XP), overall rank ${o.label}, streak ${streakOf(s)} days, leaderboard points ${pointsOf(s)}.
Lift ranks: ${lifts || "none logged yet"}.
Today (${d}) quests: ${quests || "none yet"}.
Today's food: ${Math.round(tot.cal)}/${t.cal} cal, protein ${Math.round(tot.p)}/${t.protein}g, carbs ${Math.round(tot.c)}/${t.carbs}g, fat ${Math.round(tot.f)}/${t.fat}g.
Recent workouts:\n${recent || "none yet"}
Today's check-in: ${s.checkins?.[d]?.sleep ? `${s.checkins[d].sleep}h sleep` : "sleep not logged"}, mood ${s.checkins?.[d]?.mood || "not logged"}.`;
}

export const YT_RE = /\[\[yt:([^\]]+)\]\]/g;
export const stripYt = (t) => t.replace(YT_RE, "").replace(/\s{2,}/g, " ").trim();

export const STEP_COACH = `The user just asked for help setting up automatic step syncing. Walk them through it like a friendly personal trainer, not tech support: warm, encouraging, plain language, one step at a time, and ask them to say "next" when each step is done. Do not teach them how to build Shortcut actions by hand. The Shortcut is already built. Important background: iPhones lock Health data while the phone is locked, so a nightly timed automation usually sends nothing. That's why the trigger is "when an app is opened", which only runs while the phone is unlocked. The setup: 1) In Ascend, open the Steps card, tap "Sync steps automatically", then "Create my sync code" and copy the code. 2) Tap the iCloud Shortcut link on that same card (${STEP_SHORTCUT_URL}) to install the pre-configured Ascend Steps Shortcut automatically. 3) When the Shortcut asks, paste the sync code. 4) In the Shortcuts app, Automation tab, tap +, choose App, pick 2 or 3 apps they open every day including one right before bed (Messages, Instagram, TikTok or Snapchat), keep "Is Opened" checked, Run Immediately, turn off Notify When Run, then have that automation run the Ascend Steps Shortcut they just installed. 5) Open one of those apps, then come back to Ascend: the Steps card shows "Last sync". If it shows an error, the message says exactly what to fix. Running it many times a day is fine; Ascend keeps the highest count for each day. Troubleshoot patiently, and mention they can always type steps in by hand.`;
export function Assistant({ s, setS, onBack }) {
  const chat = s.chat || [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [note, setNote] = useState("");
  const recRef = useRef(null);
  const endRef = useRef(null);
  const SR = typeof window !== "undefined" ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const voiceOn = s.settings?.voice !== false;

  useEffect(() => { endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" }); }, [chat.length, busy]);
  useEffect(() => {
    window.speechSynthesis?.getVoices?.();
    return () => { try { window.speechSynthesis?.cancel(); recRef.current?.abort?.(); } catch (e) { /* ignore */ } };
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const style = VOICE_STYLES[s.settings?.voiceStyle] || VOICE_STYLES.goblin;
      const v = pickBritishVoice();
      const parts = stripYt(text).split(/(?<=[.!?])\s+/).filter(Boolean);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        if (v) u.voice = v;
        const [pitch, rate] = style.seq[i % style.seq.length];
        u.lang = "en-GB"; u.pitch = pitch; u.rate = rate;
        if (i === 0) u.onstart = () => setSpeaking(true);
        if (i === parts.length - 1) u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      });
    } catch (e) { setSpeaking(false); }
  };

  const send = async (textArg, coachMode = false) => {
    const text = (textArg ?? input).trim();
    if (!text || busy) return;
    // Unlock speech on iPhone while we still have the tap
    if (voiceOn && window.speechSynthesis) { try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis.speak(u); } catch (e) { /* ignore */ } }
    const next = [...chat, { role: "user", content: text }].slice(-8);
    setS((p) => ({ ...p, chat: next }));
    setInput(""); setBusy(true); setNote("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5",
          max_tokens: 500,
          system: [
            { type: "text", text: `${coachMode ? `${STEP_COACH}\n\n` : ""}You are Sterling, the built-in AI coach inside Ascend, a leveling-style gym tracking app. You are a deeply unhinged British butler: posh vocabulary, wildly over-the-top hype, dramatic exclamations like "GOOD HEAVENS" and "by the barbell", occasional absurd similes, and you treat every set like a matter of national importance. Be funny, but the training and nutrition advice underneath must stay accurate and practical. Your replies are read aloud in a silly voice, so keep them to 1 to 3 short sentences unless asked for detail, and never use markdown, bullet points, or emojis. Whenever the user asks how to do an exercise, its form, or technique, give one or two key cues and then add a tag at the very end in exactly this format: [[yt:Exercise Name]] (the app turns it into a YouTube how-to button, so never mention the tag or the word YouTube yourself). Give practical, accurate training and nutrition guidance using the user's real data below. If they mention pain, injury, or a medical issue, advise seeing a qualified professional. App facts: ranks go E, D, C, B, A, S with divisions III, II, I; lift ranks use estimated one-rep max scaled to bodyweight and height; overall rank weights legs, back and chest most; daily quests link to logged exercises; hitting calories within 10% plus the protein target earns ${FUEL_XP} XP.`, cache_control: { type: "ephemeral" } },
            { type: "text", text: `User data:\n${buildContext(s)}` },
          ],
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = (data.content || []).map((i) => i.text || "").join("").trim() || "Terribly sorry, I seem to have lost my train of thought. Do ask again.";
      setS((p) => ({ ...p, chat: [...(p.chat || []), { role: "assistant", content: reply }].slice(-8) }));
      if (voiceOn) speak(reply);
    } catch (e) {
      setNote("Sterling couldn't connect. Check your connection and try again.");
    }
    setBusy(false);
  };

  const toggleMic = () => {
    if (listening) { try { recRef.current?.stop(); } catch (e) { /* ignore */ } return; }
    if (!SR) { setNote("Voice input isn't supported here, so type your question instead."); return; }
    try {
      window.speechSynthesis?.cancel();
      const rec = new SR();
      rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
      let finalText = "";
      rec.onresult = (e) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) finalText = txt; }
        setInput(txt);
      };
      rec.onerror = (e) => { setListening(false); setNote(e.error === "not-allowed" || e.error === "service-not-allowed" ? "The mic is blocked in this app, so type your question instead." : "Didn't catch that. Try again or type it."); };
      rec.onend = () => { setListening(false); if (finalText.trim()) send(finalText); };
      recRef.current = rec;
      rec.start(); setListening(true); setNote("");
    } catch (e) {
      setListening(false); setNote("Voice input isn't available here, so type your question instead.");
    }
  };

  const suggestions = ["What should I train today?", "How close am I to my next rank?", "What should I eat to hit my protein?"];
  // Opened from the Steps card: Sterling starts the setup himself
  useEffect(() => {
    const on = () => { if (!busy) send("Walk me through setting up automatic step tracking on my iPhone, one step at a time.", true); };
    window.addEventListener("ascend-sterling-steps", on);
    return () => window.removeEventListener("ascend-sterling-steps", on);
  }, [busy, chat.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={() => { window.speechSynthesis?.cancel(); onBack(); }} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold glowtext">Sterling</h1>
          <div className="body text-xs" style={{ color: C.dim }}>Your AI coach</div>
        </div>
        {speaking && (
          <button aria-label="Stop speaking" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} className="flex items-end gap-0.5 h-6 px-2">
            {[0, 1, 2, 3].map((i) => <span key={i} className="w-1 h-full barfill" style={{ background: C.cyan, borderRadius: 2, transformOrigin: "bottom", animation: `eq .8s ${i * 0.12}s ease-in-out infinite` }} />)}
          </button>
        )}
        <button aria-label={voiceOn ? "Mute voice" : "Unmute voice"} onClick={() => { if (voiceOn) window.speechSynthesis?.cancel(); setS((p) => ({ ...p, settings: { ...p.settings, voice: !voiceOn } })); }} className="ghost p-2" style={{ color: voiceOn ? C.cyan : C.mute }}>
          {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      {chat.length === 0 && (
        <div className="panel p-4 space-y-3">
          <div className="body text-sm" style={{ color: C.sub }}>Good day. I can see your ranks, quests, workouts and today's food, so ask me anything about your training.</div>
          <div className="flex flex-col gap-2">
            {suggestions.map((q) => <button key={q} onClick={() => send(q)} className="ghost text-left p-3 body text-sm" style={{ color: C.cyan }}>{q}</button>)}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {chat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="max-w-[80%] px-3 py-2 body text-sm" style={{ background: C.blue, color: "#fff", borderRadius: "10px 10px 2px 10px" }}>{m.content}</div>
            ) : (
              <div className="panel max-w-[85%] px-3 py-2">
                <div className="body text-sm" style={{ color: C.text }}>{stripYt(m.content)}</div>
                {[...m.content.matchAll(YT_RE)].map((mm, k) => <a key={k} href={ytUrl(mm[1].trim())} target="_blank" rel="noreferrer" className="btn mt-2 px-3 py-1.5 text-xs inline-flex items-center gap-1 mr-2"><Youtube size={14} />How to: {mm[1].trim()}</a>)}
                <button aria-label="Play reply" onClick={() => speak(m.content)} className="mt-1 flex items-center gap-1 text-xs" style={{ color: C.dim }}><Volume2 size={13} />Play</button>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 body text-sm" style={{ color: C.dim }}><Loader2 size={16} className="animate-spin" />Sterling is thinking…</div>}
        <div ref={endRef} />
      </div>

      {note && <div className="body text-sm" style={{ color: C.orange }}>{note}</div>}

      <div className="panel p-2 flex items-center gap-2">
        <button aria-label={listening ? "Stop listening" : "Speak your question"} onClick={toggleMic} className="shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 999, background: listening ? C.red : C.soft, color: listening ? "#fff" : C.cyan, border: `1px solid ${C.border}`, boxShadow: listening ? "0 0 18px rgba(255,77,109,.6)" : "none" }}>
          <Mic size={20} />
        </button>
        <input className="inp" placeholder={listening ? "Listening…" : "Ask Sterling"} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button aria-label="Send" onClick={() => send()} disabled={!input.trim() || busy} className="btn shrink-0 flex items-center justify-center" style={{ width: 44, height: 44, opacity: !input.trim() || busy ? 0.5 : 1 }}><Send size={18} /></button>
      </div>
      {chat.length > 0 && <button onClick={() => { window.speechSynthesis?.cancel(); setS((p) => ({ ...p, chat: [] })); }} className="body text-xs underline" style={{ color: C.mute }}>Clear conversation</button>}
    </div>
  );
}

/* ---------- Zesty disco: original synthesized funk loop ---------- */
