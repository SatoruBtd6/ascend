/* ---------- Feed, Crews & Helper Exports ---------- */
function postFeed(s, type, text, extra = {}, eventId = null) {
  if (!s.lb || !s.profile.name) return;
  const key = eventId ? `feed:${s.playerId}_${eventId}` : `feed:${Date.now()}_${s.playerId}`;
  publishShared(key, { type, text, name: s.profile.name, from: s.playerId, look: s.profile.look || null, t: Date.now(), ...extra });
}

async function readShared(prefix) {
  if (!window.storage?.list) return [];
  try {
    const res = await window.storage.list(prefix, true);
    const items = await Promise.all((res?.keys || []).map(async (k) => {
      try {
        const r = await window.storage.get(k, true);
        return r?.value ? { key: k, ...JSON.parse(r.value) } : null;
      } catch {
        return null;
      }
    }));
    return items.filter(Boolean);
  } catch {
    return [];
  }
}

function Feed({ s, openProfile }) {
  const [items, setItems] = useState(null);

  const load = async () => {
    const all = (await readShared("feed:")).sort((a, b) => (b.t || 0) - (a.t || 0));
    setItems(all.slice(0, 40));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-2">
      {items === null && <div className="body text-sm" style={{ color: C.dim }}>Loading feed…</div>}
      {items?.length === 0 && <Empty>Nothing yet. Workouts and rank updates will appear here.</Empty>}
      {items?.map((it) => (
        <div key={it.key} className="panel p-3 flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <button onClick={() => openProfile(it.from)} className="font-bold text-sm truncate block">
              <FancyName name={it.name} look={it.look} />
            </button>
            <div className="body text-sm mt-0.5" style={{ color: C.text }}>{it.text}</div>
            {it.detail && <div className="body text-xs mt-0.5" style={{ color: C.dim }}>{it.detail}</div>}
          </div>
          <button onClick={() => reportItem(it.key)} className="ghost text-xs px-2 py-1" style={{ color: C.red, borderColor: C.border }}>
            Report
          </button>
        </div>
      ))}
    </div>
  );
}

const CREW_PER_PLAYER = 12, CREW_XP = 500, DUEL_XP = 100;

function Crew({ s, setS, gainXp, rows, openProfile, activeCrewId, setActiveCrewId }) {
  const mk = monthKey(), ws = weekStart();
  const players = rows.length || 1;
  const goal = CREW_PER_PLAYER * players;
  const done = rows.reduce((a, r) => a + (r.month?.key === mk ? r.month.workouts || 0 : 0), 0);
  const claimed = s.groupClaimed?.[mk];
  const monthName = new Date(`${mk}-01T12:00`).toLocaleDateString(undefined, { month: "long" });

  const [duels, setDuels] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [crews, setCrews] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const loadCrews = async () => {
    const { data } = await supabase
      .from("crew_members")
      .select("crew_id, crews(id, name)")
      .eq("user_id", s.playerId);
    if (data) setCrews(data.map((d) => d.crews).filter(Boolean));
  };

  useEffect(() => {
    readShared("duel:").then((d) =>
      setDuels(d.filter((x) => x.from === s.playerId || x.to === s.playerId).sort((a, b) => (b.t || 0) - (a.t || 0)))
    );
    loadCrews();
  }, []);

  const joinCrew = async () => {
    if (!inviteCode.trim()) return;
    setBusy(true);
    setMsg("");
    const { data: crewMatch } = await supabase
      .from("crews")
      .select("id, name")
      .eq("invite_code", inviteCode.trim())
      .single();

    if (!crewMatch) {
      setMsg("Invalid invite code.");
    } else {
      const { error } = await supabase
        .from("crew_members")
        .insert({ crew_id: crewMatch.id, user_id: s.playerId });
      if (error) setMsg("You are already in this crew.");
      else {
        setMsg(`Joined ${crewMatch.name}!`);
        setInviteCode("");
        loadCrews();
      }
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 space-y-3">
        <div className="font-bold flex items-center gap-2">
          <Users size={18} style={{ color: C.cyan }} />Your Crews
        </div>
        {crews.length === 0 ? (
          <div className="body text-sm" style={{ color: C.dim }}>
            You aren't in any crews yet. Enter an invite code below to join one.
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCrewId(null)}
              className="px-3 py-2 text-sm font-bold"
              style={{
                borderRadius: 4,
                background: activeCrewId === null ? C.blue : C.soft,
                color: activeCrewId === null ? "#fff" : C.text,
                border: `1px solid ${C.border}`,
              }}
            >
              Global Board
            </button>
            {crews.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCrewId(c.id)}
                className="px-3 py-2 text-sm font-bold"
                style={{
                  borderRadius: 4,
                  background: activeCrewId === c.id ? C.blue : C.soft,
                  color: activeCrewId === c.id ? "#fff" : C.text,
                  border: `1px solid ${C.border}`,
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        <div className="neonline my-3" />
        <div className="font-bold text-sm">Join a Crew</div>
        <div className="flex gap-2">
          <input
            className="inp text-sm"
            placeholder="Enter invite code"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button
            onClick={joinCrew}
            disabled={busy || !inviteCode.trim()}
            className="btn px-4 text-sm"
          >
            {busy ? "Joining..." : "Join"}
          </button>
        </div>
        {msg && (
          <div
            className="body text-xs"
            style={{
              color: msg.includes("Invalid") || msg.includes("already") ? C.orange : C.green,
            }}
          >
            {msg}
          </div>
        )}
      </div>

      <div className="panel p-4 space-y-2">
        <div className="flex justify-between items-start">
          <div className="font-bold flex items-center gap-2">
            <Users size={18} style={{ color: C.cyan }} />Crew goal: {goal} workouts in {monthName}
          </div>
          <span className="text-sm font-bold" style={{ color: C.gold }}>
            +{CREW_XP} XP each
          </span>
        </div>
        <div className="body text-xs" style={{ color: C.dim }}>
          {CREW_PER_PLAYER} per person across {players} player{players === 1 ? "" : "s"} on the board.
        </div>
        <Bar pct={(done / goal) * 100} color={C.cyan} />
        <div className="flex justify-between text-sm">
          <span className="font-semibold">{done} / {goal}</span>
          {claimed ? (
            <span style={{ color: C.green }}>Claimed</span>
          ) : (
            <button
              disabled={done < goal}
              onClick={() => {
                setS((p) => ({
                  ...p,
                  groupClaimed: { ...(p.groupClaimed || {}), [mk]: true },
                }));
                gainXp(CREW_XP, "Crew goal");
              }}
              className="px-3 py-1 font-bold text-sm"
              style={{
                borderRadius: 4,
                background: done >= goal ? C.gold : C.soft,
                color: done >= goal ? "#0A1630" : C.mute,
              }}
            >
              Claim
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SharePreset() { return null; }
function SharedPresets() { return null; }
function PlanGenerator() { return null; }
function exportWorkouts() {}
function exportFood() {}
function VersusPanel() { return null; }
function QuestAdd({ unit, onAdd }) {
  const [v, setV] = useState("");
  const go = () => {
    const n = +v;
    if (n > 0) {
      onAdd(n);
      setV("");
    }
  };
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        inputMode="decimal"
        className="inp text-sm"
        style={{ width: 62, padding: "5px 6px" }}
        placeholder={unit}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
      />
      <button onClick={go} disabled={!(+v > 0)} className="btn px-2.5 py-1.5 text-sm">Add</button>
    </div>
  );
}
