import { b64url, fromB64url } from "../profile/lookConsts.js";
export async function encodeSave(s) {
  const data = { ...s, active: null, community: undefined, chat: undefined };
  const raw = new TextEncoder().encode(JSON.stringify({ app: "ascend", v: 2, saved: Date.now(), data }));
  if (typeof CompressionStream !== "undefined") {
    try {
      const gz = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
      return "ASC2-" + b64url(gz);
    } catch (e) { /* fall back to plain */ }
  }
  return "ASC1-" + b64url(raw);
}
export async function decodeSave(code) {
  const t = code.trim().replace(/\s+/g, "");
  let bytes;
  if (t.startsWith("ASC2-")) bytes = new Uint8Array(await new Response(new Blob([fromB64url(t.slice(5))]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
  else if (t.startsWith("ASC1-")) bytes = fromB64url(t.slice(5));
  else bytes = Uint8Array.from(atob(t.replace(/^ASCEND-/, "")), (c) => c.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  if (parsed.app !== "ascend" || !parsed.data?.profile || !Array.isArray(parsed.data.workouts)) throw new Error("bad save");
  return parsed;
}
