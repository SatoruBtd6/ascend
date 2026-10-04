import { decodePoly } from "./polyline.js";

export const wetCode = (c) => (c >= 51 && c <= 67) || (c >= 71 && c <= 77) || (c >= 80 && c <= 86) || c >= 95;
// wxScan schema: 2 = window-scan reconcile. Runs stamped wxScan:2 were either
// fetched with the window method, verified as out of API reach, or have no
// location to check — reconciles never revisit them.
export const WX_SCAN_V = 2;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Fold Open-Meteo's series into the session's weather over [since, until]:
// wet if ANY overlapping interval had precipitation or a wet code (radar
// minutely_15 catches the brief showers the hourly model misses), t = coldest
// temperature in the window, code = worst code observed. Pure; unit-testable.
export function scanWxWindow(j, since, until) {
  const acc = { wet: false, t: Infinity, code: 0, hit: false };
  const take = (b, stepMs) => {
    const times = b?.time;
    if (!times?.length) return;
    for (let i = 0; i < times.length; i++) {
      const t = new Date(`${times[i]}Z`).getTime();
      if (!(t < until && t + stepMs > since)) continue;
      acc.hit = true;
      const p = +b.precipitation?.[i] || 0, c = +b.weather_code?.[i] || 0;
      if (p > 0 || wetCode(c)) { acc.wet = true; acc.code = Math.max(acc.code, c); }
      else if (!acc.wet) acc.code = Math.max(acc.code, c);
      const tp = +b.temperature_2m?.[i];
      if (isFinite(tp) && tp < acc.t) acc.t = tp;
    }
  };
  take(j?.minutely_15, 15 * 60000);
  take(j?.hourly, 3600e3);
  const c = j?.current;
  if (!acc.hit && c) {
    const p = +c.precipitation || 0, code = +c.weather_code || 0;
    return { t: Math.round(c.temperature_2m), code, wet: p > 0 || wetCode(code) };
  }
  if (!acc.hit || !isFinite(acc.t)) return null;
  return { t: Math.round(acc.t), code: acc.code, wet: acc.wet };
}

// Weather for the whole session window [since, until], not just the save
// instant — a single snapshot missed a shower that ended before save. One
// request: minutely_15 radar for the recent past (reaches ~1000 intervals ≈
// 10 days), hourly for temperature and windows beyond minutely reach (≤92d).
// Returns {t,code,wet,ll,v} | {outOfRange:true} | null on fetch failure.
export async function fetchRunWeather(lat, lng, { since, until = Date.now() } = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const pm = since ? clamp(Math.ceil((until - since) / 900e3) + 4, 8, 1000) : 8;
    const pd = since ? clamp(Math.ceil((until - since) / 86400e3) + 1, 1, 92) : 1;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=temperature_2m,precipitation,weather_code&minutely_15=precipitation,weather_code,temperature_2m&hourly=temperature_2m,precipitation,weather_code&past_minutely_15=${pm}&forecast_minutely_15=4&past_days=${pd}&forecast_days=1&temperature_unit=fahrenheit&timezone=UTC`, { signal: ctl.signal });
    const j = await r.json();
    if (j?.error) return null;
    const hasSeries = (j?.minutely_15?.time?.length || 0) + (j?.hourly?.time?.length || 0) > 0;
    const wx = scanWxWindow(j, since ?? (until - 900e3), until);
    if (!wx) return hasSeries || !j?.current ? { outOfRange: true } : null;
    return { ...wx, ll: [+lat.toFixed(2), +lng.toFixed(2)], v: WX_SCAN_V };
  } catch (e) { return null; } finally { clearTimeout(t); }
}

// Any GPS-tracked outdoor cardio session qualifies — run, walk, hike and any
// future tracker mode all persist a w.run; wxScan is the reconcile marker.
export const wxNeedsScan = (w) => !!(w?.run && w.startedAt && w.run.wxScan !== WX_SCAN_V);

// Re-check one saved session's weather under the window-scan schema. Location
// comes from wx.ll when present, else the first point of the stored track.
// Returns {scan, wx?} to merge onto w.run, or null on network failure (retry).
export async function reconcileRunWeather(w, get) {
  let ll = w.run.wx?.ll;
  if (!ll && w.run.hasMap) {
    try {
      const r = await get(`run:${w.run.id || w.id}`);
      const p = decodePoly(r?.value || "");
      if (p[0]) ll = p[0];
    } catch (e) { /* track blob unavailable */ }
  }
  if (!ll) return { scan: WX_SCAN_V };
  const since = w.startedAt;
  const until = Math.min(Date.now(), since + (+w.run.secs || 0) * 1000 + 30 * 60000);
  const wx = await fetchRunWeather(ll[0], ll[1], { since, until });
  if (wx === null) return null;
  if (wx.outOfRange) return { scan: WX_SCAN_V };
  return { scan: WX_SCAN_V, wx };
}
