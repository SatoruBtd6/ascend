import { useContext } from "react";
import { Loader2, CloudOff, Check, Cloud } from "lucide-react";
import { C } from "../theme.js";
import { SaveCtx } from "./saveCtx.js";
export function SaveMark() {
  const { status } = useContext(SaveCtx);
  const common = { size: 14, className: "shrink-0", "aria-hidden": true };
  if (status === "saving") return <Loader2 {...common} className="shrink-0 animate-spin" style={{ color: C.cyan }} />;
  if (status === "error") return <CloudOff {...common} style={{ color: C.orange }} />;
  if (status === "saved") return <Check {...common} style={{ color: C.green }} />;
  return <Cloud {...common} style={{ color: C.mute }} />;
}
