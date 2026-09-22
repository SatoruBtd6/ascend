import { BossFight } from "./BossFight.jsx";
import { CrewPanel } from "./Crew.jsx";
import { DuelsPanel } from "./Duels.jsx";

export function Crew({ s, setS, gainXp, rows, openProfile }) {
  return (
    <div className="space-y-3">
      <CrewPanel s={s} setS={setS} rows={rows} openProfile={openProfile} gainXp={gainXp} />
      {s.crew?.code && <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="crew" crewId={s.crew.code} />}
      <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="global" />
      <DuelsPanel s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} />
    </div>
  );
}
