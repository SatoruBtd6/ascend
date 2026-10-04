import { useEffect, useRef, useState } from "react";
import { C } from "../../theme.js";
export { encodePoly, decodePoly, thinPts } from "./polyline.js";
const CARTO_KEY = "cb1_487p_1_e44f571331f95034e3437766";

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
      // Public basemaps key — safe in client code; restrict domains/apps in
      // the CARTO basemaps dashboard (carto.com/basemaps).
      L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/${light ? "light_all" : "dark_all"}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`, { maxZoom: 20, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attribution/">CARTO</a>' }).addTo(map);
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
