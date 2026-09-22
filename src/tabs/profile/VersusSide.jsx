import { C } from "../../theme.js";
import { RankBadge } from "../train/RankBadge.jsx";
import { Avatar, FancyName } from "./Avatar.jsx";
export function VersusSide({ c, r }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center min-w-0">
      <Avatar src={c.avatar} name={c.name} size={64} ring={c.look?.accent || r.color} look={c.look} />
      <div className="font-bold mt-2 truncate w-full"><FancyName name={c.name} look={c.look} /></div>
      {c.title && <div className="text-xs font-bold tracking-wider uppercase" style={{ color: c.look?.accent || C.cyan }}>{c.title}</div>}
      <div className="mt-1"><RankBadge rank={r} size={34} /></div>
      <div className="ranklabel text-sm font-bold" style={{ color: r.color }}>{c.rank}{c.div ? ` ${c.div}` : ""}</div>
    </div>
  );
}
