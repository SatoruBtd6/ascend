export function JuiceBurst({ kind }) {
  const big = kind === "pr";
  const n = big ? 42 : 22;
  const cols = big ? ["#FFD447", "#FFFFFF", "#FF9340", "#F5D27A"] : ["#38C6FF", "#FFFFFF", "#3DF08A"];
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[65] pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={{ background: big ? "radial-gradient(circle at 50% 45%, rgba(255,212,71,.35), transparent 60%)" : "radial-gradient(circle at 50% 45%, rgba(56,198,255,.22), transparent 55%)", animation: "juiceflash .7s ease-out forwards" }} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2, d = (big ? 180 : 120) + ((i * 37) % 120);
        return <span key={i} style={{ position: "absolute", left: "50%", top: "45%", width: i % 4 ? 6 : 10, height: i % 5 ? 6 : 14, borderRadius: i % 3 ? 999 : 2, background: cols[i % cols.length], boxShadow: `0 0 8px ${cols[i % cols.length]}`, "--dx": `${Math.cos(a) * d}px`, "--dy": `${Math.sin(a) * d + 60}px`, "--rot": `${(i * 47) % 360}deg`, animation: `juicespark ${0.9 + (i % 5) * 0.12}s cubic-bezier(.15,.8,.3,1) forwards` }} />;
      })}
      {big && <div className="absolute left-1/2 top-[38%] text-5xl font-black tracking-widest" style={{ transform: "translateX(-50%)", color: "#FFD447", textShadow: "0 0 30px rgba(255,212,71,.9)", fontFamily: "'Cinzel', serif", animation: "juicetext 1.4s ease-out forwards" }}>PR</div>}
    </div>
  );
}

/* ---------- Share receipts ---------- */

/* ---------- Boss fights ---------- */
// Damage dealt each day this month, with that day's sleep/mood buff baked in
