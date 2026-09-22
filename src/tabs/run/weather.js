export const wetCode = (c) => (c >= 51 && c <= 67) || (c >= 71 && c <= 77) || (c >= 80 && c <= 86) || c >= 95;
export async function fetchRunWeather(lat, lng) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
  try {
    // Rounded to ~1 km so the exact start point never leaves the phone
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(2)}&longitude=${lng.toFixed(2)}&current=temperature_2m,precipitation,weather_code&temperature_unit=fahrenheit`, { signal: ctl.signal });
    const j = await r.json();
    const c = j?.current;
    if (!c) return null;
    return { t: Math.round(c.temperature_2m), code: c.weather_code, wet: (c.precipitation || 0) > 0 || wetCode(c.weather_code) };
  } catch (e) { return null; } finally { clearTimeout(t); }
}
