import { useEffect } from "react";
import * as D from "../diag.js";
export function DiagProbe({ kind, id }) {
  useEffect(() => {
    if (!D.on()) return;
    const n = D.nextSeq();
    D.push({ k: "mount", kind, n, id: typeof id === "number" ? id : 0 });
    return () => D.push({ k: "unmount", kind, n });
  }, [kind, id]);
  return null;
}
