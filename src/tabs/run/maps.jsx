import { useEffect, useRef, useState } from "react";
import { C } from "../../theme.js";
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

/* ---------- Map (Leaflet, loaded only when needed) ---------- */
export let leafletP = null;
export const loadLeaflet = () => (leafletP ||= Promise.all([import("leaflet"), import("leaflet/dist/leaflet.css")]).then(([m]) => m.default || m));
export function RouteMap({ lines = [], follow = null, height = 240, fit = true, interactive = true }) {
  const el = useRef(null), mapRef = useRef(null), layerRef = useRef(null), meRef = useRef(null), fitted = useRef(false);
  const [failed, setFailed] = useState(false);
  const light = String(C.text || "").startsWith("#07");
  useEffect(() => {
    let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !el.current || mapRef.current) return;
      const map = L.map(el.current, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: false, tap: interactive });
      L.tileLayer(`https://{s}.basemaps.cartocdn.com/${light ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png`, { maxZoom: 19, subdomains: "abcd", attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>' }).addTo(map);
      map.setView(follow || lines[0]?.pts?.[0] || [30.2672, -97.7431], 15);
      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 60);
      draw(L);
    }).catch(() => setFailed(true));
    return () => { dead = true; try { mapRef.current?.remove(); } catch (e) { /* ignore */ } mapRef.current = null; };
  }, []);
  const draw = (L) => {
    const map = mapRef.current; if (!map || !layerRef.current) return;
    layerRef.current.clearLayers();
    let all = [];
    lines.forEach((ln) => {
      if (!ln.pts?.length) return;
      L.polyline(ln.pts, { color: ln.color || C.cyan, weight: ln.weight || 5, opacity: ln.opacity ?? 0.95, dashArray: ln.dash || null, lineJoin: "round" }).addTo(layerRef.current);
      if (ln.startDot) L.circleMarker(ln.pts[0], { radius: 6, color: "#fff", weight: 2, fillColor: "#3DF08A", fillOpacity: 1 }).addTo(layerRef.current);
      all = all.concat(ln.pts);
    });
    if (follow) {
      if (!meRef.current) meRef.current = L.circleMarker(follow, { radius: 8, color: "#fff", weight: 3, fillColor: "#2F8CFF", fillOpacity: 1 });
      meRef.current.setLatLng(follow).addTo(layerRef.current);
      map.panTo(follow, { animate: true });
    } else if (fit && all.length > 1 && !fitted.current) { map.fitBounds(L.latLngBounds(all), { padding: [24, 24] }); fitted.current = true; }
  };
  useEffect(() => { if (mapRef.current) loadLeaflet().then(draw); }, [lines, follow?.[0], follow?.[1]]);
  if (failed) return <div className="panel flex items-center justify-center body text-sm" style={{ height, color: C.dim }}>Map couldn't load. Your run still tracks.</div>;
  return <div ref={el} style={{ height, borderRadius: 14, overflow: "hidden", border: `1px solid ${C.glassLine}`, background: "#0b1020" }} />;
}
