export const BOSSES = [
  { id: "wyrm", name: "The Iron Wyrm", tag: "Coils of cold steel", color: "#3DF08A", icon: "🐉", title: "Wyrmslayer", aura: "wyrm" },
  { id: "colossus", eye: "#7DF9FF", name: "Frost Colossus", tag: "A glacier that learned to walk", color: "#B3ECFF", icon: "🧊", title: "Icebreaker", aura: "frost" },
  { id: "gravemaw", name: "Gravemaw", tag: "It eats skipped leg days", color: "#B14BFF", icon: "💀", title: "Gravebane", aura: "abyss" },
  { id: "chud", name: "The Chud King", tag: "Rules from a throne of double cheeseburgers", color: "#FFB43C", icon: "chud", title: "Chud King", aura: "chud" },
  { id: "rust", eye: "#FF9A3D", name: "The Rust Titan", tag: "Every rep a grinding gear", color: "#C7743A", icon: "⚙️", title: "Titanbreaker", aura: "rust" },
  { id: "harpy", eye: "#FFF27A", name: "Stormcaller Harpy", tag: "Screeches at half reps", color: "#7DD3FC", icon: "⚡", title: "Stormbound", aura: "thunder" },
  { id: "warden", eye: "#7DF9FF", name: "The Hollow Warden", tag: "An empty suit of armor that never skips a set", color: "#9AA7BD", icon: "🗡️", title: "Wardenbane", aura: "hollow" },
  { id: "leviathan", eye: "#9BF6FF", name: "Leviathan of the Deep", tag: "Drags lifters into the abyss of cardio", color: "#2F6BFF", icon: "🐙", title: "Tidebreaker", aura: "deep" },
  { id: "behemoth", name: "Molten Behemoth", tag: "Sweats lava, lifts mountains", color: "#FF5A1F", icon: "🌋", title: "Magmaforged", aura: "magma" },
  { id: "ratlord", eye: "#C6F07A", name: "The Plague Rat Lord", tag: "Hoards chalk and dirty towels", color: "#8BC34A", icon: "🐀", title: "Ratcatcher", aura: "plague" },
  { id: "pharaoh", eye: "#7DF9FF", name: "Sandstorm Pharaoh", tag: "Buried his gains for 3,000 years", color: "#E8C872", icon: "🏺", title: "Sunbreaker", aura: "sand" },
  { id: "void", eye: "#C9A8FF", name: "The Void Sovereign", tag: "The end of all excuses", color: "#6A00FF", icon: "🌑", title: "Voidwalker", aura: "void" },
];
// Boss HP. Damage: 1 per pound lifted, 5 per rep, 800 per mile.
// Crew and global bosses share the same HP curve: 150k + 150k per person in that fight.
export const GLOBAL_BOSS_HP_PER_PLAYER = 150000, GLOBAL_BOSS_HP_BASE = 150000, BOSS_XP = 600;
export const crewBossHp = (members) => GLOBAL_BOSS_HP_BASE + GLOBAL_BOSS_HP_PER_PLAYER * Math.max(1, members);
export const globalBossHp = (players) => GLOBAL_BOSS_HP_BASE + GLOBAL_BOSS_HP_PER_PLAYER * Math.max(1, players);
export const bossFor = (mk, scope) => { const mi = (parseInt(mk.slice(5, 7), 10) - 1) % BOSSES.length; return scope === "crew" ? BOSSES[(mi + 6) % BOSSES.length] : BOSSES[mi]; };
export const monthEnd = (mk) => { const d = new Date(+mk.slice(0, 4), +mk.slice(5, 7), 0); return `${mk}-${String(d.getDate()).padStart(2, "0")}`; };
export const minDay = (a, b) => (a < b ? a : b);
// Crews shipped in September 2026 with boss damage counted from the 1st of the month.
// Crew boss kills from that window were the exploit.
export const EXPLOIT_LAST_MONTH = "2026-09";

// Strip crew boss loot that came from the exploit window: Gravemaw only
export function revertBossExploit(s) {
  const claimed = { ...(s.loot?.claimed || {}) };
  const bad = Object.keys(claimed).filter((k) => /^\d{4}-\d{2}_crew$/.test(k) && k.slice(0, 7) <= EXPLOIT_LAST_MONTH && bossFor(k.slice(0, 7), "crew").id === "gravemaw");
  if (!bad.length) return { s, reverted: false };
  bad.forEach((k) => delete claimed[k]);
  // Keep Gravemaw only if it was also beaten some other legit way (e.g. as a global boss)
  const stillEarned = Object.keys(claimed).some((k) => bossFor(k.slice(0, 7), k.endsWith("_crew") ? "crew" : "global").id === "gravemaw");
  const bosses = stillEarned ? s.loot?.bosses || [] : (s.loot?.bosses || []).filter((b) => b !== "gravemaw");
  const loot = { ...(s.loot || {}), claimed, bosses };
  const next = { ...s, loot };
  const look = { ...(s.profile.look || {}) };
  if (!stillEarned && look.aura === "abyss") look.aura = "none";
  if (!bosses.length && look.border === "bone") look.border = "none";
  const title = !stillEarned && ["boss_gravemaw", "gravebane"].includes(s.profile.title) ? "none" : s.profile.title;
  next.profile = { ...s.profile, look, title };
  next.xpDone = Object.fromEntries(Object.entries(s.xpDone || {}).filter(([k]) => !bad.some((b) => k.startsWith(`boss_${b.slice(0, 7)}_gravemaw`))));
  return { s: next, reverted: true };
}

