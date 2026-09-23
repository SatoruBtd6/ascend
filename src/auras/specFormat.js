// Lossless JS for an AURA_FX entry. A copied spec parses back to the same value.

const IDENT = /^[A-Za-z_$][\w$]*$/;

export function cloneSpec(value) {
  if (Array.isArray(value)) return value.map(cloneSpec);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value)) out[key] = cloneSpec(value[key]);
    return out;
  }
  return value;
}

function ident(key) {
  return IDENT.test(key) ? key : JSON.stringify(key);
}

function fmt(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "null";
    return Object.is(value, -0) ? "-0" : String(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "null";
  if (Array.isArray(value)) return `[${value.map(fmt).join(", ")}]`;
  const keys = Object.keys(value);
  return `{ ${keys.map((key) => `${ident(key)}: ${fmt(value[key])}`).join(", ")} }`;
}

export function formatAuraEntry(id, spec) {
  return `${ident(id)}: ${fmt(spec)}`;
}

export function parseAuraEntry(src) {
  const text = String(src).trim().replace(/;\s*$/, "");
  const match = text.match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/);
  if (!match) throw new Error("aura entry must look like id: { ... }");
  const spec = Function(`"use strict"; return (${match[2]});`)();
  return { id: match[1], spec };
}

export function setPath(root, path, value) {
  const next = cloneSpec(root);
  let cur = next;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
  return next;
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function specFields(value, path = [], out = []) {
  if (typeof value === "number" && Number.isFinite(value)) out.push({ path, kind: "number", value });
  else if (typeof value === "string" && HEX.test(value)) out.push({ path, kind: "color", value });
  else if (Array.isArray(value)) value.forEach((item, i) => specFields(item, path.concat(i), out));
  else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) specFields(value[key], path.concat(key), out);
  }
  return out;
}
