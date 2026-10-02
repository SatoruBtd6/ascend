import { BossFight } from "./BossFight.jsx";
import { CrewPanel, CrewQuestsSection } from "./Crew.jsx";
import { DuelsSection } from "./Duels.jsx";

export function Crew({ s, setS, gainXp, rows, openProfile }) {
  return (
    <div className="space-y-3">
      <CrewPanel s={s} setS={setS} rows={rows} openProfile={openProfile} gainXp={gainXp}>
        {({ memberRows, crew }) => (
          <>
            {s.crew?.code && <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="crew" crewId={s.crew.code} />}
            <BossFight s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} scope="global" />
            {s.crew?.code && <CrewQuestsSection s={s} setS={setS} rows={memberRows} crew={crew} code={s.crew.code} />}
            <DuelsSection s={s} setS={setS} gainXp={gainXp} rows={rows} openProfile={openProfile} />
          </>
        )}
      </CrewPanel>
    </div>
  );
}
