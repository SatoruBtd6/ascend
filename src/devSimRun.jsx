import { useEffect, useRef, useState } from "react";

const M_LAT = 111320;

/** DEV-only GPS feeder. Production never imports this module. */
export function SimRunDock({ onFix, origin }) {
  const [speed, setSpeed] = useState(1.4);
  const [paused, setPaused] = useState(false);
  const st = useRef({
    lat: origin?.[0] || 30.2672,
    lng: origin?.[1] || -97.7431,
    t: Date.now(),
    heading: 0,
  });
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onFixRef = useRef(onFix);
  onFixRef.current = onFix;

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const now = Date.now();
      const dt = Math.min(2, (now - st.current.t) / 1000);
      const v = speedRef.current;
      const jitter = () => (Math.random() - 0.5) * 4 / M_LAT;
      st.current.lat += (v * dt) / M_LAT + jitter() * 0.15;
      st.current.lng += jitter() * 0.15;
      st.current.t = now;
      const acc = 6 + Math.random() * 6;
      onFixRef.current?.({ lat: st.current.lat, lng: st.current.lng, acc, t: now });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const gap = () => {
    const dt = 40;
    const v = speedRef.current;
    st.current.lat += (v * dt) / M_LAT;
    st.current.t += dt * 1000;
    onFixRef.current?.({ lat: st.current.lat, lng: st.current.lng, acc: 10, t: st.current.t });
  };

  return (
    <div className="panel p-3 space-y-2" style={{ border: "1px dashed #f59e0b" }}>
      <div className="body text-xs font-bold" style={{ color: "#f59e0b" }}>DEV GPS sim · {speed.toFixed(1)} m/s · {(speed * 2.23694).toFixed(1)} mph</div>
      <input type="range" min="0.5" max="7" step="0.1" value={speed} onChange={(e) => setSpeed(+e.target.value)} aria-label="Sim speed" className="w-full" />
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setPaused((p) => !p)} className="ghost py-2 text-xs font-bold">{paused ? "Sim play" : "Sim pause"}</button>
        <button type="button" onClick={gap} className="ghost py-2 text-xs font-bold">Screen-off gap</button>
        <button type="button" onClick={() => setSpeed(speed < 2 ? 3 : 1.4)} className="ghost py-2 text-xs font-bold">{speed < 2 ? "Jog 3 m/s" : "Walk 1.4"}</button>
      </div>
    </div>
  );
}
