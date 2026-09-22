import { useState, useEffect } from "react";
export function Timer({ start }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const sec = Math.floor((now - start) / 1000);
  const f = (n) => String(n).padStart(2, "0");
  return <span className="text-3xl font-bold tabular-nums glowtext">{f(Math.floor(sec / 3600))}:{f(Math.floor(sec / 60) % 60)}:{f(sec % 60)}</span>;
}

