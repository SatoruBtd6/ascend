import { SFX } from "./sfx.js";
export function juice(kind = "pr") {
  try { window.dispatchEvent(new CustomEvent("ascend-juice", { detail: kind })); } catch (e) { /* ignore */ }
  if (kind === "pr") { SFX.slam(); try { navigator.vibrate?.([70, 40, 140]); } catch (e) { /* unsupported */ } }
  else { SFX.thud(); try { navigator.vibrate?.(60); } catch (e) { /* unsupported */ } }
}
