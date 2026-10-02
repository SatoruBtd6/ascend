// Page scroll lives inside the app-shell scroller (#ascend-scroll), not the
// window — the document itself never scrolls, so iOS standalone mode cannot
// misposition viewport-anchored UI. window.scrollTo stays as the fallback.
export const scrollPageTop = () => {
  const sc = document.getElementById("ascend-scroll");
  if (sc) sc.scrollTop = 0;
  else window.scrollTo?.(0, 0);
};

// Old home-screen installs were added while apple-mobile-web-app-status-bar-
// style was "black-translucent": iOS captures that mode at install time, lets
// the app paint behind the status bar, but still subtracts the bar's height
// from the standalone layout viewport — leaving a dead strip at the bottom
// that position:fixed content cannot paint into. New installs (status bar
// "black") place the webview below the bar and report envT=0. Detect the old
// mode: standalone + nonzero top inset + the missing height equals it.
let _legacySA;
export const legacyStandalone = () => {
  if (_legacySA !== undefined) return _legacySA;
  _legacySA = false;
  try {
    const sa = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
    if (!sa) return _legacySA;
    const p = document.createElement("div");
    p.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)";
    document.body.appendChild(p);
    const t = parseFloat(getComputedStyle(p).paddingTop) || 0;
    p.remove();
    _legacySA = t > 0 && Math.abs(window.innerHeight + t - screen.height) < 4;
  } catch { /* env()/matchMedia unavailable */ }
  return _legacySA;
};
