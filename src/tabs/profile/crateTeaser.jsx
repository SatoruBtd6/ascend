import { ChevronRight, Crown } from "lucide-react";
import { C } from "../../theme.js";
import { ACTIVE_CRATE } from "./crate.js";
import { crateBank } from "./points.js";

export function CrateTeaser({ s, onOpen }) {
  const crate = ACTIVE_CRATE;
  const bank = crateBank(s);
  return (
    <button type="button" onClick={onOpen} className="mt-3 w-full flex items-center gap-3 px-3 py-2.5 text-left" style={{ borderRadius: 12, background: "linear-gradient(90deg, rgba(106,0,255,.18), rgba(255,212,71,.1))", border: `1px solid ${C.gold}55`, animation: "cratepulse 2.8s ease-in-out infinite" }}>
      <Crown size={18} style={{ color: C.gold }} />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{crate.name}</span>
        <span className="block body text-xs" style={{ color: C.dim }}>{s.test ? "Ghost sandbox · unlimited opens" : `${bank.toLocaleString()} pts ready · ${crate.cost} per open`}</span>
      </span>
      <ChevronRight size={16} style={{ color: C.gold }} />
    </button>
  );
}
