import { useRef, useState } from "react";
import { Check, ChevronLeft, Copy, Download, Layers, Moon, Palette, Save, Share2, Shield, Sun, Timer as TimerIcon, Type, Upload, Volume2, VolumeX } from "lucide-react";
import { APP_VERSION, BACKUP_KEY, DEFAULT, runningBundle } from "../../appStay.js";
import * as D from "../../diag.js";
import { ask } from "../../lib/ask.js";
import { reconcileAchievements } from "../../lib/stats.js";
import { levelFromXp, normalizeState } from "../../math.js";
import { C } from "../../theme.js";
import { SettingsToggle } from "../../ui/primitives.jsx";
import { stripGhostCosmetics } from "../profile/unlock.js";
import { VOICE_STYLES } from "../train/sterling.js";
import { exportFood, exportWorkouts, importWorkoutsFromCsv } from "./csvIO.js";
import { DedupeSettings } from "./DedupeSettings.jsx";
import { GymsSettings } from "./GymsSettings.jsx";
import { decodeSave, encodeSave } from "./saveCodec.js";
import { SupportForm } from "./SupportForm.jsx";
export function SettingsPage({ s, setS, onBack, party, setParty, openTool, saveDiag, onReplayTutorial }) {
  const st = s.settings || {};
  const setSet = (k, v) => setS((p) => ({ ...p, settings: { ...p.settings, [k]: v, savedAt: Date.now() } }));
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState(null);
  const [testerKey, setTesterKey] = useState("");
  const [testerOk, setTesterOk] = useState(false);
  const [testerErr, setTesterErr] = useState(false);
  const [impMsg, setImpMsg] = useState(null);
  const impRef = useRef(null);
  const [diagOn, setDiagOn] = useState(() => D.on());
  const [diagCopied, setDiagCopied] = useState(false);
  const verTaps = useRef([]);

  const makeSave = async () => {
    const c = await encodeSave(s);
    setCode(c); setCopied(false);
    try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e) { /* user can copy manually */ }
  };
  const shareSave = async () => {
    const c = code || await encodeSave(s);
    setCode(c);
    try { await navigator.share({ title: "Ascend save code", text: c }); } catch (e) { try { await navigator.clipboard.writeText(c); setCopied(true); } catch (e2) { /* manual copy */ } }
  };
  const load = async () => {
    try {
      const { data, saved } = await decodeSave(paste);
      const when = new Date(saved).toLocaleString();
      ask(`Load save from ${when}? This replaces everything currently in the app.`, () => {
        D.withSource("restore", () => setS((p) => normalizeState({ ...DEFAULT, ...data, active: null, settings: { ...DEFAULT.settings, ...(data.settings || {}) }, playerId: data.playerId || p.playerId })));
        setPaste(""); setMsg({ ok: true, text: `Save loaded: level ${levelFromXp(data.xp || 0).lvl}, ${data.workouts.length} workouts.` });
      }, "Load");
    } catch (e) {
      setMsg({ ok: false, text: "That code didn't work. Make sure you copied the whole thing, starting with ASC2-, ASC1-, or ASCEND-." });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">Settings</h1>
      </div>

      <h2 className="text-lg font-bold">Appearance</h2>
      <div className="panel p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[["dark", Moon, "Dark"], ["light", Sun, "Light"]].map(([id, Icon, l]) => (
            <button key={id} onClick={() => setSet("theme", id)} className="py-3 flex items-center justify-center gap-2 font-bold" style={{ borderRadius: 4, background: (st.theme || "dark") === id ? C.blue : C.soft, color: (st.theme || "dark") === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>
              <Icon size={18} />{l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Zesty mode</div>
            <div className="body text-xs" style={{ color: C.dim }}>Rainbow everything, plus disco music and a disco ball. Tap the disco ball button to start or stop the party.</div>
          </div>
          <SettingsToggle label="Zesty mode" on={!!st.zesty} onClick={() => { const on = !st.zesty; setSet("zesty", on); setParty(on); }} />
        </div>
        <div className="flex items-center gap-3">
          <Type size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Easy-read font</div>
            <div className="body text-xs" style={{ color: C.dim }}>Switches everything to Lexend, a rounder font with wider spacing that's easier to read for dyslexia.</div>
          </div>
          <SettingsToggle label="Easy-read font" on={!!st.dysFont} onClick={() => setSet("dysFont", !st.dysFont)} />
        </div>
        <div className="flex items-center gap-3">
          <Palette size={22} style={{ color: C.cyan }} />
          <div className="flex-1">
            <div className="font-bold">Custom colors</div>
            <div className="body text-xs" style={{ color: C.dim }}>Pick your own accent, secondary, and background. Zesty mode overrides this while it's on.</div>
          </div>
          <SettingsToggle label="Custom colors" on={!!st.custom?.on} onClick={() => setSet("custom", { ...(st.custom || DEFAULT.settings.custom), on: !st.custom?.on })} />
        </div>
        {st.custom?.on && (
          <div className="grid grid-cols-3 gap-2 body text-sm">
            {[["cyan", "Accent"], ["blue", "Secondary"], ["bg", "Background"]].map(([k, l]) => (
              <label key={k} className="flex flex-col items-center gap-1">
                <input type="color" value={st.custom[k] || DEFAULT.settings.custom[k]} onChange={(e) => setSet("custom", { ...st.custom, [k]: e.target.value })} aria-label={`${l} color`} style={{ width: "100%", height: 44, border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent" }} />
                <span style={{ color: C.dim }}>{l}</span>
              </label>
            ))}
            <button onClick={() => setSet("custom", { ...DEFAULT.settings.custom, on: true })} className="col-span-3 ghost py-2 text-sm">Reset colors</button>
            <div className="col-span-3 body text-xs flex items-center gap-1" style={{ color: C.green }}><Check size={14} />Saved to your account and this device{st.savedAt ? ` · ${new Date(st.savedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</div>
          </div>
        )}
        <div className="flex items-center gap-3">
          {st.voice ? <Volume2 size={22} style={{ color: C.cyan }} /> : <VolumeX size={22} style={{ color: C.mute }} />}
          <div className="flex-1">
            <div className="font-bold">Assistant voice</div>
            <div className="body text-xs" style={{ color: C.dim }}>Sterling reads replies out loud.</div>
          </div>
          <SettingsToggle label="Assistant voice" on={!!st.voice} onClick={() => setSet("voice", !st.voice)} />
        </div>
        <div className="flex items-center gap-3">
          <Volume2 size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Sound effects</div><div className="body text-xs" style={{ color: C.dim }}>Set clicks, PR chime, level-up and rank-up fanfares.</div></div>
          <SettingsToggle label="Sound effects" on={st.sounds !== false} onClick={() => setSet("sounds", st.sounds === false)} />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TimerIcon size={22} style={{ color: C.cyan }} />
          <div className="flex-1"><div className="font-bold">Rest timer</div><div className="body text-xs" style={{ color: C.dim }}>Starts when you check off a set. Tap the pill for a watch-size view.</div></div>
          <div className="flex gap-1">{[0, 60, 90, 120, 180].map((v) => <button key={v} onClick={() => setSet("rest", v)} className="px-2 py-1 text-xs font-semibold" style={{ borderRadius: 999, background: (st.rest ?? 90) === v ? C.blue : C.soft, color: (st.rest ?? 90) === v ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v ? `${v}s` : "Off"}</button>)}</div>
        </div>
        {st.voice && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Object.entries(VOICE_STYLES).map(([id, v]) => (
              <button key={id} onClick={() => setSet("voiceStyle", id)} className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0" style={{ borderRadius: 999, background: (st.voiceStyle || "goblin") === id ? C.blue : C.soft, color: (st.voiceStyle || "goblin") === id ? "#fff" : C.text, border: `1px solid ${C.border}` }}>{v.name}</button>
            ))}
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold">Tutorial</h2>
      <div className="panel p-4 space-y-3">
        <div>
          <div className="font-bold">Replay tutorial</div>
          <div className="body text-xs" style={{ color: C.dim }}>Shows the visual guide again from the welcome step. Clears only the onboarded flag. Workouts, XP, streaks, quests, and unlocks stay as they are.</div>
        </div>
        <button type="button" onClick={() => ask("Replay the tutorial from the start? This only clears the onboarded flag.", () => onReplayTutorial?.(), "Replay")} className="btn w-full py-3" style={{ minHeight: 40, touchAction: "manipulation" }}>Replay tutorial</button>
      </div>

      <h2 className="text-lg font-bold">Workout tools</h2>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => openTool("timer")} className="panel p-4 text-left">
          <TimerIcon size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Interval timer</div>
          <div className="body text-xs mt-0.5" style={{ color: C.dim }}>Beeps for work and rest</div>
        </button>
        <button onClick={() => openTool("cards")} className="panel p-4 text-left">
          <Layers size={26} style={{ color: C.cyan }} />
          <div className="font-bold mt-2">Deck of cards</div>
          <div className="body text-xs mt-0.5" style={{ color: C.dim }}>Draw a card, do the reps</div>
        </button>
      </div>

      <h2 className="text-lg font-bold">Gyms</h2>
      <GymsSettings s={s} setS={setS} />

      <h2 className="text-lg font-bold">Exercises</h2>
      <DedupeSettings s={s} setS={setS} />

      {window.ascendAuth && (
        <div className="panel p-4 flex items-center justify-between gap-3">
          <div className="min-w-0"><div className="font-bold">Account</div><div className="body text-xs truncate" style={{ color: C.dim }}>{window.ascendAuth.email}</div></div>
          <button onClick={() => ask("Sign out on this device? Your progress stays saved in your account.", () => window.ascendAuth.signOut(), "Sign out")} className="ghost px-4 py-2 text-sm font-bold" style={{ color: C.red }}>Sign out</button>
        </div>
      )}

      <div className="panel p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Shield size={22} style={{ color: C.cyan }} />
          <div className="flex-1 min-w-0">
            <div className="font-bold">Tester tools</div>
            <div className="body text-xs" style={{ color: C.dim }}>Password required. Ghost mode hides this profile from other players and unlocks every aura, title, and border for preview. Turning it off puts real unlocks back.</div>
          </div>
        </div>
        {!testerOk ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (testerKey === "Tester") { setTesterOk(true); setTesterErr(false); setTesterKey(""); } else setTesterErr(true); }}>
            <input type="password" className="inp flex-1" placeholder="Tester password" value={testerKey} onChange={(e) => { setTesterKey(e.target.value); setTesterErr(false); }} autoComplete="off" aria-label="Tester password" />
            <button type="submit" className="btn px-4 py-2 text-sm">Unlock</button>
          </form>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold">Ghost / test account</div>
              <div className="body text-xs" style={{ color: C.dim }}>{s.test ? "Hidden from boards, bosses, seasons, and duels. All cosmetics are unlocked." : "Off. Your real unlocks apply."}</div>
            </div>
            <SettingsToggle label="Ghost / test account" on={!!s.test} onClick={() => setS((p) => (p.test ? stripGhostCosmetics(p) : { ...p, test: true }))} />
          </div>
        )}
        {testerErr && <div className="body text-xs" style={{ color: C.red }}>Wrong password.</div>}
      </div>

      <button type="button" onClick={() => {
        const t = Date.now();
        verTaps.current = verTaps.current.filter((x) => t - x < 2500);
        verTaps.current.push(t);
        if (verTaps.current.length >= 5) {
          verTaps.current = [];
          setDiagOn(D.toggle(s.playerId));
          setDiagCopied(false);
        }
      }} className="body text-xs text-center w-full" style={{ color: C.mute, background: "transparent", border: "none", padding: 0 }}>Ascend version {APP_VERSION}{runningBundle() ? ` · build ${runningBundle().replace(/^index-|\.js$/g, "")}` : ""}</button>
      <div className="body text-xs text-center" style={{ color: C.mute }}>State {saveDiag?.kb ?? 0} KB{saveDiag?.ms != null ? ` · last save ${saveDiag.ms} ms` : ""}</div>
      {diagOn && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(D.formatDump({ version: APP_VERSION, sw: "ascend-v7g" })); setDiagCopied(true); } catch (e) { /* clipboard blocked */ } }} className="ghost py-3 text-sm font-bold">{diagCopied ? "Copied" : "Copy diagnostic log"}</button>
          <button type="button" onClick={() => { D.clear(); setDiagCopied(false); }} className="ghost py-3 text-sm font-bold">Clear</button>
        </div>
      )}

      <h2 className="text-lg font-bold">Contact support</h2>
      <SupportForm s={s} />

      <h2 className="text-lg font-bold">Achievements</h2>
      <div className="panel p-4 space-y-2">
        <div className="body text-sm" style={{ color: C.dim }}>Achievements from the old, easier rank scale were already removed. If anything else looks wrong, recheck: any badge you no longer qualify for is removed and its XP taken back.</div>
        <button onClick={() => ask("Recheck all achievements against your current data?", () => { const before = Object.keys(s.ach || {}).length; const next = reconcileAchievements(s); D.withSource("achievements", () => setS(() => next)); setMsg({ ok: true, text: `Rechecked. ${before - Object.keys(next.ach).length} removed.` }); }, "Recheck")} className="ghost w-full py-3 font-bold" style={{ color: C.cyan }}>Recheck achievements</button>
      </div>

      <h2 className="text-lg font-bold">Export / import</h2>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => exportWorkouts(s)} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Download size={16} />Workouts CSV</button>
        <button type="button" onClick={() => exportFood(s)} className="ghost py-3 text-sm font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Download size={16} />Food log CSV</button>
      </div>
      <div className="panel p-4 space-y-2">
        <div className="font-bold">Import Strong / Hevy / Ascend</div>
        <div className="body text-xs" style={{ color: C.dim }}>Web apps can't write to Apple Health. Export a CSV from Strong or Hevy (or Ascend's own export) and load it here. Apple Health XML isn't set-level, so it won't import.</div>
        <input ref={impRef} type="file" accept=".csv,.txt,text/csv" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; e.target.value = "";
          if (!f) return;
          setImpMsg(null);
          try {
            const text = await f.text();
            if (/^\s*</.test(text) || /\.xml$/i.test(f.name)) { setImpMsg({ ok: false, text: "That's an XML export. Use Strong or Hevy CSV instead." }); return; }
            const res = importWorkoutsFromCsv(s, text);
            if (!res.ok) { setImpMsg({ ok: false, text: res.err }); return; }
            D.withSource("import", () => setS(() => res.s));
            setImpMsg({ ok: true, text: `Imported ${res.n} session${res.n === 1 ? "" : "s"}${res.skipped ? ` · skipped ${res.skipped} duplicate${res.skipped === 1 ? "" : "s"}` : ""}${res.xp ? ` · ${res.xp > 0 ? "+" : ""}${Math.round(res.xp)} XP` : ""}.` });
          } catch (err) { setImpMsg({ ok: false, text: "Couldn't read that file." }); }
        }} />
        <button type="button" onClick={() => impRef.current?.click()} className="ghost w-full py-3 font-bold flex items-center justify-center gap-2" style={{ color: C.green }}><Upload size={16} />Import workouts CSV</button>
        {impMsg && <div className="body text-sm" style={{ color: impMsg.ok ? C.green : C.red }}>{impMsg.text}</div>}
      </div>

      <h2 className="text-lg font-bold">Save files</h2>
      <div className="panel p-4 space-y-3">
        <div className="body text-sm" style={{ color: C.dim }}>Before switching to a new version of the app, make a save code and keep it somewhere like your Notes app. Then paste it into the new version to get all your progress back. Only load your own save, since it includes your leaderboard identity.</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={makeSave} className="btn py-3 flex items-center justify-center gap-2"><Save size={18} />Copy save code</button>
          <button onClick={shareSave} className="ghost py-3 font-bold flex items-center justify-center gap-2" style={{ color: C.cyan }}><Share2 size={18} />Share…</button>
        </div>
        <div className="body text-xs" style={{ color: C.mute }}>Codes are compressed now, so they're a fraction of the old length. "Share…" opens your phone's share sheet so you can drop it straight into Notes or a text to yourself. Old ASCEND- codes still load.</div>
        {code && (
          <>
            <textarea readOnly value={code} onFocus={(e) => e.target.select()} className="inp body text-xs" rows={3} aria-label="Save code" style={{ wordBreak: "break-all" }} />
            <div className="body text-xs" style={{ color: C.dim }}>{code.length.toLocaleString()} characters</div>
            <div className="body text-xs flex items-center gap-2" style={{ color: copied ? C.green : C.dim }}>
              {copied ? <><Check size={14} />Copied. Paste it somewhere safe.</> : <><Copy size={14} />Tap the box, select all, and copy it.</>}
            </div>
          </>
        )}
        <div className="neonline" />
        <textarea value={paste} onChange={(e) => { setPaste(e.target.value); setMsg(null); }} className="inp body text-xs" rows={3} placeholder="Paste a save code here" aria-label="Paste save code" />
        <button onClick={load} disabled={!paste.trim()} className="ghost w-full py-3 font-bold flex items-center justify-center gap-2" style={{ color: paste.trim() ? C.cyan : C.mute }}><Upload size={18} />Load save</button>
        {msg && <div className="body text-sm" style={{ color: msg.ok ? C.green : C.red }}>{msg.text}</div>}
        <button type="button" onClick={() => ask("Restore the pre-update backup? This replaces everything currently in the app with the snapshot saved before this update.", async () => {
          try {
            const b = await window.storage.get(BACKUP_KEY, false);
            if (!b?.value) { setMsg({ ok: false, text: "No backup found on this account." }); return; }
            const blob = typeof b.value === "string" ? JSON.parse(b.value) : b.value;
            const data = blob.state && typeof blob.state === "object" ? blob.state : blob;
            D.withSource("restore", () => setS((p) => normalizeState({ ...DEFAULT, ...data, active: null, settings: { ...DEFAULT.settings, ...(data.settings || {}) }, playerId: data.playerId || p.playerId })));
            setMsg({ ok: true, text: "Pre-update backup restored." });
          } catch (e) { setMsg({ ok: false, text: "Couldn't restore that backup." }); }
        }, "Restore")} className="ghost w-full py-3 font-bold" style={{ color: C.orange }}>Restore pre-update backup</button>
      </div>
    </div>
  );
}

/* ---------- Voice assistant ---------- */
