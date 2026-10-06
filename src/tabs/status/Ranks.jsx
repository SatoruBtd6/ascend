import { useState } from "react";
import { ChevronRight, Info, Search, X } from "lucide-react";
import { GROUP_WEIGHT, RANKS, RANK_INFO, ladderRanks } from "../../data/ranks.js";
import { sexLabel } from "../../lib/dates.js";
import { allExercises, exerciseGroups } from "../../lib/exercises.js";
import { computeBests, overallInfo, rankFor, rankFromScore } from "../../lib/stats.js";
import { thresholds } from "../../math.js";
import { C } from "../../theme.js";
import { AnchoredMenu } from "../../ui/AnchoredMenu.jsx";
import { Bar, ExpandBox, Tap, Title } from "../../ui/primitives.jsx";
import { RankBadge } from "../train/RankBadge.jsx";

const HAIR = "1px solid rgba(255,255,255,.08)";

export function RankGuideRow({ e, p, bests }) {
  const steps = thresholds(e, p);
  const cur = bests[e.name] ? rankFor(e, bests[e.name].v, bests[e.name].p) : null;
  return (
    <div className="grid items-center gap-1" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)", padding: "10px 0", borderTop: HAIR }}>
      <div className="min-w-0">
        <div className="font-semibold" style={{ fontSize: 16, color: C.text, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.name}{e.perHand ? <span className="body text-xs font-normal" style={{ color: C.mute }}> /hand</span> : null}</div>
        <div className="body" style={{ fontSize: 14, color: cur ? cur.rank.color : C.dim }}>{cur ? `You: ${cur.label}` : "Not logged"}</div>
      </div>
      {steps.map((v, i) => {
        const reached = cur && cur.score >= i + 1;
        return <div key={i} className="text-right tabular-nums" style={{ fontSize: 16, color: reached ? RANKS[i + 1].color : C.text, textShadow: reached ? `0 0 8px ${RANKS[i + 1].glow}` : "none" }}>{v}</div>;
      })}
    </div>
  );
}

const InfoBtn = ({ k, label, info, setInfo }) => (
  <Tap tight label={label} menu onClick={(e) => setInfo(info?.k === k ? null : { k, anchor: e.currentTarget })}>
    <Info size={16} style={{ color: C.mute }} />
  </Tap>
);
const Head = ({ k, label, info, setInfo, children }) => (
  <h2 className="text-lg font-bold glowtext flex items-center gap-1" style={{ color: C.text }}>
    {children}<InfoBtn k={k} label={label} info={info} setInfo={setInfo} />
  </h2>
);

const INFO_TEXT = {
  targets: (p, ft, inch) => `Targets are built for you: ${p.weight} lb, ${ft}'${inch}", ${sexLabel(p)}. Heavier lifters need to lift more, and taller frames need more too, because a strong physique at that height means carrying more muscle. Update your body stats on the Status tab whenever they change.`,
  ladder: "Each rank has three divisions: III, II, then I. S I sits 35% past the S line. Rumour has it there's something above S.",
  takes: "Weighted lifts show estimated one-rep max in lb, so 225 × 5 counts as about a 263 lb max. Lifts marked /hand use the weight in one hand. Pull-ups show strict reps in one set, and added weight counts extra. Shoulders and arms are held to a stricter standard.",
};

export function Ranks({ s, openMuscle }) {
  const p = s.profile;
  const [pick, setPick] = useState(null);
  const [q, setQ] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [takesOpen, setTakesOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const overall = overallInfo(s);
  const key = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Barbell Row", "Pull-up"];
  const all = allExercises(s).filter((e) => e.type !== "timed" && e.type !== "assisted");
  const bests = computeBests(s);
  const ft = Math.floor(p.height / 12), inch = Math.round(p.height % 12);
  const totalW = Object.values(GROUP_WEIGHT).reduce((a, b) => a + b, 0);
  const groups = exerciseGroups(all, q);

  return (
    <div className="space-y-4">
      <div>
        <Title right={<span className="font-extrabold text-xl" style={{ color: overall.rank.color, textShadow: `0 0 12px ${overall.rank.glow}` }}>{overall.label}</span>}>Ranks</Title>
        <div className="flex items-center gap-1 body" style={{ fontSize: 14, color: C.dim }}>
          <span>{p.weight} lb · {ft}'{inch}" · {sexLabel(p)}</span>
          <InfoBtn k="targets" label="How rank targets are built" info={info} setInfo={setInfo} />
        </div>
      </div>

      <div>
        <Head k="groups" label="How overall rank works" info={info} setInfo={setInfo}>Muscle groups</Head>
        <div>
          {Object.entries(GROUP_WEIGHT).map(([k, w], i) => {
            const sc = overall.groups[k] || 0;
            const r = rankFromScore(sc);
            return (
              <div key={k} role="button" tabIndex={0} onClick={() => openMuscle?.(k)}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMuscle?.(k); } }}
                style={{ padding: "10px 0", borderTop: i ? HAIR : null, minHeight: 56 }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>{k}</span>
                  <span className="flex items-center gap-1">
                    <span style={{ fontSize: 17, fontWeight: 700, color: sc ? r.rank.color : C.mute }}>{sc ? r.label : "Untrained"}</span>
                    <ChevronRight size={16} style={{ color: C.mute }} />
                  </span>
                </div>
                <div className="body" style={{ fontSize: 14, color: C.mute, margin: "2px 0 8px" }}>{Math.round((w / totalW) * 100)}% of overall</div>
                <Bar pct={(sc / 6) * 100} color={sc ? r.rank.color : C.mute} h={4} />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <Head k="ladder" label="About rank divisions" info={info} setInfo={setInfo}>Rank ladder</Head>
        <div>
          {ladderRanks(overall.score).map((r, i, arr) => {
            const mine = overall.rank.id === r.id;
            const prevMine = i > 0 && arr[i - 1].id === overall.rank.id;
            return (
              <div key={r.id} className="flex items-center gap-3" style={mine
                ? { padding: "10px 12px", margin: "6px 0", border: `1px solid ${r.color}`, borderRadius: 14, boxShadow: `0 0 22px ${r.glow}` }
                : { padding: "10px 0", borderTop: i && !prevMine ? HAIR : null }}>
                <RankBadge rank={r} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <span style={{ fontSize: 17, fontWeight: 700, color: r.color }}>{r.id}-Rank · {RANK_INFO[r.id][0]}</span>
                    {mine && <span className="text-sm font-bold shrink-0" style={{ color: r.color }}>You · {overall.label}</span>}
                  </div>
                  <div className="body" style={{ fontSize: 14, color: C.dim, marginTop: 2 }}>{RANK_INFO[r.id][1]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div role="button" tabIndex={0} aria-expanded={takesOpen}
          onClick={(e) => { if (e.target.closest("button,input,a")) return; setInfo(null); setTakesOpen(!takesOpen); }}
          onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setInfo(null); setTakesOpen(!takesOpen); } }}
          className="flex items-center gap-1" style={{ minHeight: 44 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.text }}>What each rank takes</span>
          <InfoBtn k="takes" label="How the threshold numbers work" info={info} setInfo={setInfo} />
          <span className="body ml-auto" style={{ fontSize: 14, color: C.mute }}>6 lifts</span>
          <ChevronRight size={18} className="shrink-0" style={{ color: C.mute, transform: takesOpen ? "rotate(90deg)" : "none", transition: "transform .25s ease-out" }} />
        </div>
        <ExpandBox open={takesOpen}>
          <div className="grid gap-1 pb-1 text-xs font-bold" style={{ gridTemplateColumns: "1.6fr repeat(5, 1fr)", paddingTop: 8 }}>
            <span style={{ color: C.dim }}>Lift</span>
            {RANKS.slice(1, 6).map((r) => <span key={r.id} className="text-right" style={{ color: r.color, textShadow: `0 0 8px ${r.glow}` }}>{r.id}</span>)}
          </div>
          {key.map((n) => { const e = all.find((x) => x.name === n); return e ? <RankGuideRow key={n} e={e} p={p} bests={bests} /> : null; })}
        </ExpandBox>
      </div>

      <div>
        <div className="flex items-center gap-2" style={{ height: 40, paddingLeft: 12, borderRadius: 10, background: C.inpBg, border: `1px solid ${C.glassLine}` }}>
          <Search size={16} className="shrink-0" style={{ color: C.mute }} />
          <input value={q} placeholder="Look up any exercise" aria-label="Look up any exercise"
            onChange={(e) => { setQ(e.target.value); setListOpen(true); if (pick && e.target.value !== pick.name) setPick(null); }}
            onFocus={(e) => { setListOpen(true); setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 350); }}
            onBlur={() => setTimeout(() => setListOpen(false), 150)}
            className="flex-1 min-w-0 bg-transparent outline-none" style={{ fontSize: 16, color: C.text, height: "100%" }} />
          {(q || pick) && (
            <Tap tight label="Clear exercise search" onClick={() => { setQ(""); setPick(null); }}>
              <X size={16} style={{ color: C.mute }} />
            </Tap>
          )}
        </div>
        {listOpen && (
          <div onMouseDown={(e) => e.preventDefault()} className="overflow-y-auto" style={{ maxHeight: 320, borderBottom: HAIR }}>
            {groups.length === 0 && <div className="body" style={{ fontSize: 14, color: C.mute, padding: "12px 0" }}>No exercises match.</div>}
            {groups.map((g) => (
              <div key={g.group}>
                <div className="body" style={{ fontSize: 13, color: C.mute, padding: "10px 0 2px" }}>{g.group}</div>
                {g.items.map((e) => (
                  <button key={e.name} type="button" onClick={() => { setPick(e); setQ(e.name); setListOpen(false); }}
                    className="w-full text-left flex items-center" style={{ minHeight: 44, fontSize: 16, color: C.text, borderTop: HAIR }}>
                    {e.name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        {pick && <RankGuideRow e={pick} p={p} bests={bests} />}
      </div>

      {info && (
        <AnchoredMenu anchor={info.anchor} onClose={() => setInfo(null)} minWidth={240}>
          <div className="px-4 py-3 body text-xs space-y-2" style={{ color: C.mute }}>
            {info.k === "groups" ? (
              <>
                <div>Your best lift in each muscle group counts, weighted like this. To be overall S, you need to be elite across your whole body, not on one machine.</div>
                <div>Cardio and timed exercises earn XP but don't affect rank.</div>
              </>
            ) : (
              <div>{info.k === "targets" ? INFO_TEXT.targets(p, ft, inch) : INFO_TEXT[info.k]}</div>
            )}
          </div>
        </AnchoredMenu>
      )}
    </div>
  );
}

/* ---------- Settings ---------- */
