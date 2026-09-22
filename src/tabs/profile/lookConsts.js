export const PROFILE_BGS = [
  { id: "none", name: "Default", css: null },
  { id: "sunset", name: "Sunset", css: "linear-gradient(135deg,#ff6a3d 0%,#ff3c8e 50%,#7b2ff7 100%)" },
  { id: "ocean", name: "Ocean", css: "linear-gradient(135deg,#00c6ff,#0072ff 60%,#001a4d)" },
  { id: "ember", name: "Ember", css: "radial-gradient(circle at 30% 20%,#ffb347,#ff2a2a 45%,#2a0000)" },
  { id: "aurora", name: "Aurora", css: "linear-gradient(135deg,#00ffa3,#00c2ff 45%,#6a00ff)" },
  { id: "galaxy", name: "Galaxy", css: "radial-gradient(circle at 70% 30%,#8a2be2,#1a0533 50%,#000)" },
  { id: "gold", name: "Gold", css: "linear-gradient(135deg,#f9d976,#c79a1a 50%,#5a3a00)" },
  { id: "carbon", name: "Carbon", css: "repeating-linear-gradient(45deg,#151515 0 6px,#2a2a2a 6px 12px)" },
  { id: "toxic", name: "Toxic", css: "linear-gradient(135deg,#a8ff78,#39ff14 50%,#004d00)" },
  { id: "rainbow", name: "Rainbow", css: "linear-gradient(90deg,#ff3cac,#ffb43c,#f7ff3c,#3cff9e,#3cc8ff,#9b5cff)" },
];
export function lookStyle(look, strength = 0.55) {
  const bg = PROFILE_BGS.find((b) => b.id === look?.bg);
  const st = {};
  if (bg?.css) { st.background = `linear-gradient(rgba(0,0,0,${strength}),rgba(0,0,0,${strength + 0.15})), ${bg.css}`; st.backgroundSize = "cover"; }
  if (look?.accent) st.borderColor = look.accent;
  return Object.keys(st).length ? st : null;
}
// Keeps a photo's shape but limits its size, for comment pictures
// Turns an uploaded song into a small 20-second mono WAV clip that plays on every phone
export async function makeClip(file, seconds = 20, rate = 11025) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("no audio");
  const ctx = new AC();
  const buf = await file.arrayBuffer();
  const decoded = await new Promise((res, rej) => { try { const r = ctx.decodeAudioData(buf, res, rej); if (r?.then) r.then(res, rej); } catch (e) { rej(e); } });
  const n = Math.min(decoded.length, Math.floor(seconds * decoded.sampleRate));
  const chans = decoded.numberOfChannels, data = Array.from({ length: chans }, (_, c) => decoded.getChannelData(c));
  const step = decoded.sampleRate / rate, outLen = Math.floor(n / step);
  const tmp = new Float32Array(outLen);
  let peak = 0;
  for (let i = 0; i < outLen; i++) {
    const a = Math.floor(i * step), b = Math.min(n, Math.max(a + 1, Math.floor((i + 1) * step)));
    let sum = 0, cnt = 0;
    for (let j = a; j < b; j++) for (let c = 0; c < chans; c++) { sum += data[c][j]; cnt++; }
    tmp[i] = cnt ? sum / cnt : 0; peak = Math.max(peak, Math.abs(tmp[i]));
  }
  const g = peak > 0 ? 0.95 / peak : 1;
  const pcm = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) { let v = tmp[i] * g; const rem = outLen - i; if (rem < rate) v *= rem / rate; if (i < rate / 4) v *= i / (rate / 4); pcm[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767))); }
  const bytes = new Uint8Array(44 + outLen * 2), dv = new DataView(bytes.buffer);
  const wstr = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
  wstr(0, "RIFF"); dv.setUint32(4, 36 + outLen * 2, true); wstr(8, "WAVE"); wstr(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); wstr(36, "data"); dv.setUint32(40, outLen * 2, true);
  bytes.set(new Uint8Array(pcm.buffer), 44);
  try { ctx.close?.(); } catch (e) { /* ignore */ }
  return "data:audio/wav;base64," + b64(bytes);
}
export const b64 = (bytes) => { let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)); return btoa(bin); };
export const b64url = (bytes) => b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const fromB64url = (t) => { const s = t.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(s + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
export const songLinkLabel = (url) => (/youtu\.?be/i.test(url) ? "YouTube" : /spotify/i.test(url) ? "Spotify" : /apple/i.test(url) ? "Apple Music" : /soundcloud/i.test(url) ? "SoundCloud" : "Link");

/* ---------- Profiles ---------- */
export const NAME_FONTS = [
  { id: "default", name: "Ascend", family: "'Oxanium', sans-serif" },
  { id: "orbitron", name: "Orbitron", family: "'Orbitron', sans-serif" },
  { id: "bangers", name: "Comic", family: "'Bangers', cursive" },
  { id: "cinzel", name: "Royal", family: "'Cinzel', serif" },
  { id: "marker", name: "Marker", family: "'Permanent Marker', cursive" },
  { id: "pixel", name: "Pixel", family: "'Press Start 2P', monospace" },
  { id: "pacifico", name: "Script", family: "'Pacifico', cursive" },
  { id: "creepster", name: "Creepy", family: "'Creepster', cursive" },
];
export const NAME_ANIMS = [
  { id: "none", name: "None" }, { id: "pulse", name: "Pulse" }, { id: "rainbow", name: "Rainbow" }, { id: "wave", name: "Wave" },
  { id: "wobble", name: "Wobble" }, { id: "flicker", name: "Flicker" }, { id: "float", name: "Float" }, { id: "shake", name: "Shake" },
];
export const NAME_COLORS = ["#00D9FF", "#3DF08A", "#FFD447", "#FF9340", "#FF2D6F", "#B14BFF", "#F4FBFF", "#E8C872"];
export const AURA_GROUPS = [["crate", "Anime Crate", "Opened from the Anime Crate. Owned crate auras multiply your board points — best one counts, even if another aura is equipped."], ["rank", "Rank auras", "Unlock by ranking up any lift."], ["feat", "Feats", "Earned by doing something specific, once."], ["boss", "Boss loot", "Drop from bosses you help defeat."], ["special", "Special", "Limited and exclusive."], ["soon", "Coming soon", "More exclusive auras on the way."]];
export const titleGroup = (t) => (t.soon ? "soon" : t.crate ? "crate" : t.id.startsWith("boss_") ? "boss" : t.id === "champion" || t.id === "contender" || t.id === "reigning" ? "season" : t.id === "nemesis_slayer" ? "rivalry" : "progress");
