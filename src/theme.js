import { RANKS } from "./data/ranks.js";
/* ---------- Theme ---------- */
export const THEMES = {
  dark: {
    bg: "#000000", text: "#F2F8FF", dim: "#A3B6CF", mute: "#71869F", sub: "#CFDCEE",
    blue: "#0A84FF", cyan: "#00D9FF", soft: "#03080F", line: "rgba(0,217,255,.26)", border: "#10283F",
    track: "#081530", sheet: "#040A1C", accentBg: "#0C2350", navBg: "rgba(0,0,0,.96)", badgeBg: "rgba(2,6,16,.8)",
    inpBg: "#000000", panelTop: "rgba(0,34,70,.42)", panelBot: "rgba(0,0,0,.94)", glow: "rgba(0,217,255,.75)",
    grid: "rgba(0,217,255,.028)", halo: "rgba(40,110,255,.20)", glass: "rgba(255,255,255,.045)", glassLine: "rgba(255,255,255,.09)",
    gold: "#FFD447", green: "#39E68F", orange: "#FF9340", red: "#FF4D6D",
  },
  light: {
    bg: "#EEF4FA", text: "#07162A", dim: "#3F5873", mute: "#6F849C", sub: "#2A4461",
    blue: "#0070F0", cyan: "#0088CC", soft: "#FFFFFF", line: "rgba(0,120,210,.28)", border: "#C9D9EA",
    track: "#D6E3F0", sheet: "#FFFFFF", accentBg: "#DDEEFF", navBg: "rgba(255,255,255,.96)", badgeBg: "rgba(255,255,255,.92)",
    inpBg: "#FFFFFF", panelTop: "rgba(255,255,255,.97)", panelBot: "rgba(230,240,250,.97)", glow: "rgba(0,136,204,.3)",
    grid: "rgba(0,120,210,.06)", halo: "rgba(0,144,255,.18)", glass: "rgba(255,255,255,.72)", glassLine: "rgba(10,30,60,.08)",
    gold: "#D99A00", green: "#12A860", orange: "#E8740C", red: "#E0284A",
  },
};
export const ZEST = {
  dark: { cyan: "#FF5AD9", blue: "#8A5CFF", line: "rgba(255,90,217,.35)", glow: "rgba(255,90,217,.8)", accentBg: "#2A0A3A", track: "#1B0B2C" },
  light: { cyan: "#D01FAE", blue: "#7A3CFF", line: "rgba(208,31,174,.3)", glow: "rgba(208,31,174,.3)", accentBg: "#FBE3F7", track: "#EBDDF5" },
};
export const C = { ...THEMES.dark };
export const RAINBOW = "linear-gradient(90deg,#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff,#ff3cac)";
export const RANK_DARK = RANKS.map((r) => r.color);
export const RANK_LIGHT = ["#66748A", "#15A34A", "#0284C7", "#7C3AED", "#D6194F", "#C28A00", "#0B1220"];
export function applyTheme(settings = {}) {
  const mode = settings.theme === "light" ? "light" : "dark";
  Object.keys(C).forEach((k) => delete C[k]);
  Object.assign(C, THEMES[mode], settings.zesty ? ZEST[mode] : {}, settings.custom?.on && !settings.zesty ? customTheme(settings.custom) : {});
  RANKS.forEach((r, i) => { r.color = mode === "light" ? RANK_LIGHT[i] : RANK_DARK[i]; });
}
// Custom RGB theme: derive every color from three picks
const _hexRgbMemo = new Map();
export const hexRgb = (h) => {
  let v = _hexRgbMemo.get(h);
  if (v !== undefined || _hexRgbMemo.has(h)) return v || null;
  const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
  v = m ? (() => { const n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; })() : null;
  if (_hexRgbMemo.size > 256) _hexRgbMemo.clear();
  _hexRgbMemo.set(h, v);
  return v;
};
export const rgbaOf = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export const mixRgb = (a, b, t) => `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * t)).join(",")})`;
export function customTheme(cu) {
  const cy = hexRgb(cu.cyan), bl = hexRgb(cu.blue), bg = hexRgb(cu.bg);
  if (!cy || !bl || !bg) return {};
  const light = (0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2]) / 255 > 0.5;
  const fg = light ? [7, 22, 42] : [230, 246, 255];
  return {
    bg: mixRgb(bg, bg, 0), text: mixRgb(fg, fg, 0), dim: mixRgb(fg, bg, 0.34), mute: mixRgb(fg, bg, 0.52), sub: mixRgb(fg, bg, 0.16),
    cyan: cu.cyan, blue: cu.blue, soft: mixRgb(bg, cy, 0.05), sheet: mixRgb(bg, cy, 0.06), accentBg: mixRgb(bg, cy, 0.18), track: mixRgb(bg, cy, 0.12), border: mixRgb(bg, cy, 0.24), inpBg: mixRgb(bg, bg, 0),
    glass: light ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.05)", glassLine: light ? "rgba(10,30,60,.08)" : rgbaOf(cy, 0.14), line: rgbaOf(cy, 0.3), glow: rgbaOf(cy, light ? 0.35 : 0.75), grid: rgbaOf(cy, 0.05), halo: rgbaOf(bl, light ? 0.18 : 0.3), navBg: rgbaOf(bg, 0.96), badgeBg: rgbaOf(bg, 0.85), panelTop: rgbaOf(cy, 0.12), panelBot: rgbaOf(bg, 0.94),
  };
}
