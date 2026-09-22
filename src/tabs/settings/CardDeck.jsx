import { useState } from "react";
import { Check, ChevronLeft, RotateCcw, SkipForward } from "lucide-react";
import { ask } from "../../lib/ask.js";
import { uid } from "../../lib/dates.js";
import { allExercises } from "../../lib/exercises.js";
import { addDeckSet, computeBests, workoutXp } from "../../lib/stats.js";
import { C } from "../../theme.js";
import { NumField } from "../../ui/NumField.jsx";
export const SUITS = [
  { id: "S", sym: "♠", name: "Spades", red: false },
  { id: "H", sym: "♥", name: "Hearts", red: true },
  { id: "D", sym: "♦", name: "Diamonds", red: true },
  { id: "C", sym: "♣", name: "Clubs", red: false },
];
export const FACES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export function freshDeck(jokers) {
  const d = [];
  SUITS.forEach((su) => FACES.forEach((f, i) => d.push({ suit: su.id, face: f, rank: i + 1 })));
  if (jokers) { d.push({ suit: "J", face: "JOKER", rank: 0 }); d.push({ suit: "J", face: "JOKER", rank: 0 }); }
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

export function CardDeck({ visible, s, setS, gainXp, onBack }) {
  const [cfg, setCfg] = useState({ S: "Burpee", H: "Push-up", D: "Air Squat", C: "Sit-up", faces: "ten", aces: 11, jokers: false, jokerReps: 20, jokerEx: "Burpee" });
  const [deck, setDeck] = useState(() => freshDeck(false));
  const [current, setCurrent] = useState(null); // { card, status: "open" }
  const [log, setLog] = useState([]); // completed or skipped cards
  const [flip, setFlip] = useState(0);
  const [sessionId, setSessionId] = useState(uid);
  const all = allExercises(s).filter((e) => e.type !== "timed");

  const repsFor = (card) => {
    if (card.suit === "J") return cfg.jokerReps;
    if (card.rank === 1) return cfg.aces;
    if (card.rank > 10) return cfg.faces === "ten" ? 10 : card.rank;
    return card.rank;
  };
  const exFor = (card) => (card.suit === "J" ? cfg.jokerEx : cfg[card.suit]);
  const xpFor = (card) => workoutXp(s, [{ name: exFor(card), sets: [{ w: "", r: repsFor(card) }] }], null).xp;

  const draw = () => {
    if (!deck.length || current) return;
    const [card, ...rest] = deck;
    setDeck(rest); setCurrent(card); setFlip((f) => f + 1);
  };

  const complete = () => {
    if (!current) return;
    const name = exFor(current), reps = repsFor(current);
    const { xp } = workoutXp(s, [{ name, sets: [{ w: "", r: reps }] }], computeBests(s), { skipPr: true });
    const lastCard = deck.length === 0;
    const bonus = lastCard ? 150 : 0;
    setS((p) => addDeckSet(p, sessionId, name, reps, xp + bonus));
    gainXp(xp + bonus, lastCard ? "Card deck cleared" : `Card deck · ${reps} ${name}`, `deck_${sessionId}_${log.length}`);
    setLog((l) => [...l, { card: current, name, reps, xp: xp + bonus, done: true }]);
    setCurrent(null);
  };

  const skip = () => {
    if (!current) return;
    setLog((l) => [...l, { card: current, name: exFor(current), reps: repsFor(current), xp: 0, done: false }]);
    setCurrent(null);
  };

  const reshuffle = () => { setDeck(freshDeck(cfg.jokers)); setCurrent(null); setLog([]); setSessionId(uid()); };

  if (!visible) return null;

  const doneCards = log.filter((x) => x.done);
  const totals = {};
  doneCards.forEach((x) => { totals[x.name] = (totals[x.name] || 0) + x.reps; });
  const sessionXp = doneCards.reduce((a, x) => a + x.xp, 0);
  const card = current || (log.length ? log[log.length - 1].card : null);
  const suit = card && SUITS.find((x) => x.id === card.suit);
  const cardColor = card ? (card.suit === "J" ? "#9b5cff" : suit.red ? "#E0284A" : "#0B1220") : C.text;
  const finished = !deck.length && !current;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext flex-1">Deck of cards</h1>
        <span className="body text-sm" style={{ color: C.dim }}>{deck.length + (current ? 1 : 0)} left</span>
      </div>

      <style>{`@keyframes cardin{0%{transform:translateY(-30px) rotateY(90deg) scale(.9);opacity:0}100%{transform:none;opacity:1}}`}</style>
      <div className="flex justify-center" style={{ perspective: 800 }}>
        {current ? (
          <div key={flip} className="relative flex flex-col justify-between p-3" style={{ width: 210, height: 294, borderRadius: 14, background: "#FDFDFB", color: cardColor, boxShadow: `0 0 28px ${C.glow}, 0 10px 30px rgba(0,0,0,.4)`, animation: "cardin .35s ease-out", fontFamily: "Georgia, serif" }}>
            <div className="text-left leading-none"><div className="text-3xl font-bold">{card.suit === "J" ? "★" : card.face}</div><div className="text-2xl">{suit ? suit.sym : ""}</div></div>
            <div className="absolute inset-0 flex items-center justify-center"><div style={{ fontSize: card.suit === "J" ? 64 : 88, lineHeight: 1 }}>{card.suit === "J" ? "🃏" : suit.sym}</div></div>
            <div className="text-right leading-none" style={{ transform: "rotate(180deg)" }}><div className="text-3xl font-bold">{card.suit === "J" ? "★" : card.face}</div><div className="text-2xl">{suit ? suit.sym : ""}</div></div>
          </div>
        ) : (
          <button onClick={finished ? reshuffle : draw} aria-label={finished ? "Start a new deck" : "Draw a card"} className="relative flex items-center justify-center" style={{ width: 210, height: 294, borderRadius: 14, background: `repeating-linear-gradient(45deg, ${C.blue} 0 10px, ${C.accentBg} 10px 20px)`, border: `4px solid ${C.soft}`, boxShadow: `0 0 28px ${C.glow}` }}>
            <span className="px-4 py-2 font-extrabold text-lg" style={{ background: C.sheet, color: C.cyan, borderRadius: 4 }}>{finished ? "New deck" : "Tap to draw"}</span>
          </button>
        )}
      </div>

      {current && (
        <div className="panel p-4 text-center">
          <div className="text-4xl font-extrabold glowtext">{repsFor(current)} reps</div>
          <div className="text-xl font-bold mt-1" style={{ color: C.cyan }}>{exFor(current)}</div>
          <div className="body text-sm mt-1 font-bold" style={{ color: C.gold }}>Worth +{xpFor(current)} XP{deck.length === 0 ? " · +150 for the last card" : ""}</div>
        </div>
      )}

      {current ? (
        <div className="grid grid-cols-3 gap-2">
          <button onClick={complete} className="btn col-span-2 py-4 text-lg flex items-center justify-center gap-2"><Check size={20} />Done</button>
          <button onClick={skip} className="ghost py-4 font-bold flex items-center justify-center gap-1"><SkipForward size={18} />Skip</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={finished ? reshuffle : draw} className="btn py-4 text-lg">{finished ? "New deck" : log.length ? "Next card" : "Draw card"}</button>
          <button onClick={() => (log.length ? ask("Start a fresh deck? Reps you already finished stay saved.", reshuffle, "Reshuffle") : reshuffle())} className="ghost py-4 font-bold flex items-center justify-center gap-2"><RotateCcw size={18} />Reshuffle</button>
        </div>
      )}
      <div className="body text-xs" style={{ color: C.mute }}>Tap Done after each card. Every finished card saves right away, earns XP, counts toward that exercise's rank, and fills matching daily quests. Skipped cards earn nothing.</div>

      {log.length > 0 && (
        <div className="panel p-4 space-y-2">
          <div className="flex justify-between font-bold"><span>This deck</span><span style={{ color: C.gold }}>+{sessionXp} XP</span></div>
          <div className="body text-xs" style={{ color: C.dim }}>{doneCards.length} done{log.length - doneCards.length ? ` · ${log.length - doneCards.length} skipped` : ""}</div>
          {Object.entries(totals).map(([n, r]) => (
            <div key={n} className="flex justify-between body text-sm" style={{ color: C.sub }}><span>{n}</span><span>{r} reps</span></div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold pt-2">Your deck</h2>
      <div className="panel p-4 space-y-3">
        {SUITS.map((su) => (
          <label key={su.id} className="flex items-center gap-3 body text-sm">
            <span className="w-8 text-2xl text-center" style={{ color: su.red ? C.red : C.text }}>{su.sym}</span>
            <select className="inp" value={cfg[su.id]} onChange={(e) => setCfg({ ...cfg, [su.id]: e.target.value })} aria-label={`${su.name} exercise`}>
              {all.map((e) => <option key={e.name}>{e.name}</option>)}
            </select>
          </label>
        ))}
        <div className="grid grid-cols-2 gap-2 body text-sm">
          <label>J, Q, K count as<select className="inp mt-1" value={cfg.faces} onChange={(e) => setCfg({ ...cfg, faces: e.target.value })}><option value="ten">10 reps</option><option value="rank">11, 12, 13</option></select></label>
          <label>Aces count as<select className="inp mt-1" value={cfg.aces} onChange={(e) => setCfg({ ...cfg, aces: +e.target.value })}><option value={1}>1 rep</option><option value={11}>11 reps</option><option value={15}>15 reps</option></select></label>
        </div>
        <label className="flex items-center gap-3 body text-sm">
          <input type="checkbox" checked={cfg.jokers} onChange={(e) => setCfg({ ...cfg, jokers: e.target.checked })} style={{ width: 20, height: 20, accentColor: C.cyan }} />
          <span className="flex-1">Add 2 jokers (applies on next reshuffle)</span>
        </label>
        {cfg.jokers && (
          <div className="grid grid-cols-2 gap-2 body text-sm">
            <label>Joker exercise<select className="inp mt-1" value={cfg.jokerEx} onChange={(e) => setCfg({ ...cfg, jokerEx: e.target.value })}>{all.map((e) => <option key={e.name}>{e.name}</option>)}</select></label>
            <label>Joker reps<NumField inputMode="numeric" className="inp mt-1" value={cfg.jokerReps} onCommit={(v) => { if (v === "") return; setCfg({ ...cfg, jokerReps: Math.max(1, v) }); }} /></label>
          </div>
        )}
        <div className="body text-xs" style={{ color: C.mute }}>A full deck with these settings is about {(() => { let t = 0; FACES.forEach((f, i) => { const r = i + 1; t += 4 * (r === 1 ? cfg.aces : r > 10 ? (cfg.faces === "ten" ? 10 : r) : r); }); return t + (cfg.jokers ? 2 * cfg.jokerReps : 0); })()} total reps.</div>
      </div>
    </div>
  );
}

/* ---------- Profile looks, theme songs, comment photos ---------- */
