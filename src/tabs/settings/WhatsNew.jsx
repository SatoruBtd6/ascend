import { ChevronLeft } from "lucide-react";
import { APP_VERSION } from "../../appStay.js";
import { CHANGELOG } from "../../data/changelog.js";
import { C } from "../../theme.js";
export function WhatsNew({ onBack }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button aria-label="Back" onClick={onBack} className="p-1" style={{ color: C.cyan }}><ChevronLeft size={26} /></button>
        <h1 className="text-2xl font-bold glowtext">What's new</h1>
      </div>
      {CHANGELOG.map((rel) => (
        <div key={rel.v} className="panel p-4 space-y-2">
          <div className="font-bold flex items-center gap-2">
            Version {rel.v}
            {rel.v === APP_VERSION && <span className="text-xs font-bold px-1.5" style={{ borderRadius: 999, color: C.cyan, border: `1px solid ${C.cyan}66` }}>current</span>}
          </div>
          {rel.items.map((it, i) => (
            <div key={i} className="body text-sm flex gap-2" style={{ color: C.dim }}>
              <span style={{ color: C.cyan }}>•</span><span style={{ color: C.text }}>{it}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
