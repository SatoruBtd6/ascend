import { havM } from "../../run.js";

export function encodePoly(pts) {
  let out = "", pLat = 0, pLng = 0;
  const enc = (v) => { v = v < 0 ? ~(v << 1) : v << 1; let s = ""; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); };
  pts.forEach(([la, ln]) => { const a = Math.round(la * 1e5), b = Math.round(ln * 1e5); out += enc(a - pLat) + enc(b - pLng); pLat = a; pLng = b; });
  return out;
}
export function decodePoly(str) {
  const pts = []; let i = 0, lat = 0, lng = 0;
  while (i < (str || "").length) {
    for (const k of [0, 1]) {
      let b, shift = 0, result = 0;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}
export function thinPts(pts, minGapM = 8, maxPts = 900) {
  if (!pts.length) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) if (havM(out[out.length - 1], pts[i]) >= minGapM || i === pts.length - 1) out.push(pts[i]);
  if (out.length <= maxPts) return out;
  const step = out.length / maxPts, res = [];
  for (let i = 0; i < out.length; i += step) res.push(out[Math.floor(i)]);
  res.push(out[out.length - 1]);
  return res;
}
