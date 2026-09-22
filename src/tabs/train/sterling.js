import { rankedLifts } from "../../lib/stats.js";
import { allExercises } from "../../lib/exercises.js";
export const VOICE_STYLES = {
  goblin: { name: "Unhinged goblin", seq: [[2, 1.3], [0.3, 0.8], [1.9, 1.5], [0.6, 1.05]] },
  chipmunk: { name: "Chipmunk", seq: [[2, 1.4]] },
  deep: { name: "Deep bloke", seq: [[0.15, 0.8]] },
  pints: { name: "Two pints in", seq: [[0.7, 0.6]] },
  hyper: { name: "Hyper", seq: [[1.4, 1.9]] },
  posh: { name: "Posh butler (normal)", seq: [[0.92, 1.02]] },
};
export function pickBritishVoice() {
  const vs = window.speechSynthesis?.getVoices?.() || [];
  const gb = vs.filter((v) => /en[-_]GB/i.test(v.lang));
  return gb.find((v) => /daniel|arthur|oliver|george|uk english male|male/i.test(v.name)) || gb[0] || null;
}
export async function claudeChat(body) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5", ...body }),
  });
  return res.json();
}
export function promptKey(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
export function exerciseNameList(s, n = 70) {
  const seen = new Set();
  const out = [];
  const add = (nm) => { if (nm && !seen.has(nm)) { seen.add(nm); out.push(nm); } };
  rankedLifts(s).slice(0, 16).forEach((r) => add(r.e.name));
  [...(s.workouts || [])].reverse().slice(0, 8).forEach((w) => (w.exercises || []).forEach((e) => add(e.name)));
  allExercises(s).forEach((e) => add(e.name));
  return out.slice(0, n).join(", ");
}
export async function askJson(system, user, maxTokens = 500) {
  const ck = promptKey(`${system}\n${user}`);
  try { const hit = sessionStorage.getItem("ascend-ai:" + ck); if (hit) return JSON.parse(hit); } catch (e) { /* */ }
  const data = await claudeChat({
    max_tokens: Math.min(maxTokens, 700),
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  try { sessionStorage.setItem("ascend-ai:" + ck, JSON.stringify(parsed)); } catch (e) { /* */ }
  return parsed;
}
export const STERLING_SYS = "You are Sterling, the wildly over-the-top but genuinely competent British butler coach inside the Ascend gym app. Be brief and funny in the quip fields, but keep every recommendation accurate and practical. Match advice to the user's body type (male or female) when it affects training or nutrition.";
export function sterlingSay(s, text) {
  if (!window.speechSynthesis || s.settings?.voice === false) return;
  try {
    window.speechSynthesis.cancel();
    const style = VOICE_STYLES[s.settings?.voiceStyle] || VOICE_STYLES.goblin;
    const v = pickBritishVoice();
    text.split(/(?<=[.!?])\s+/).filter(Boolean).forEach((part, i) => {
      const u = new SpeechSynthesisUtterance(part); if (v) u.voice = v;
      const [pitch, rate] = style.seq[i % style.seq.length]; u.lang = "en-GB"; u.pitch = pitch; u.rate = rate;
      window.speechSynthesis.speak(u);
    });
  } catch (e) { /* ignore */ }
}
