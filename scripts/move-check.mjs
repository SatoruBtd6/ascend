#!/usr/bin/env node
/**
 * Prove Foundations 2 moves are cut-and-paste.
 * Compares pre-foundations-2 src/App.jsx to the current src tree (moved files + App.jsx).
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const TAG = process.env.MOVE_CHECK_TAG || "pre-foundations-2";

const LEAVE_OUT = new Set([
  "math.js", "shims.js", "supabase.js", "Auth.jsx", "Boot.jsx", "diag.js", "main.jsx",
  "run.js", "run.test.mjs", "math.test.mjs", "diag.test.mjs",
  "devBigFixture.js", "devSimRun.jsx",
]);

function isImportLine(s) {
  const t = s.trim();
  return /^import\s/.test(t) || /^import\s*['"]/.test(t);
}

function isReexportOnly(s) {
  const t = s.trim();
  return /^export\s*\{/.test(t) || /^export\s*\*/.test(t);
}

function stripExport(s) {
  return s.replace(/^(\s*)export\s+default\s+/, "$1").replace(/^(\s*)export\s+/, "$1");
}

function keepLine(raw) {
  const trimmedEnd = raw.replace(/[ \t]+$/, "");
  if (isImportLine(trimmedEnd) || isReexportOnly(trimmedEnd)) return null;
  return stripExport(trimmedEnd);
}

function bagLines(text, file) {
  const out = [];
  const lines = text.split(/\n/);
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  lines.forEach((raw, i) => {
    const kept = keepLine(raw.replace(/\r$/, ""));
    if (kept == null) return;
    out.push({ file, n: i + 1, line: kept });
  });
  return out;
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(js|jsx)$/.test(name) && !LEAVE_OUT.has(name)) acc.push(p);
  }
  return acc;
}

function gitShow(path) {
  return execFileSync("git", ["show", `${TAG}:${path}`], { encoding: "utf8", cwd: ROOT });
}

const original = bagLines(gitShow("src/App.jsx"), `tag:${TAG}:src/App.jsx`);
const files = walk(SRC);
const current = files.flatMap((p) => bagLines(readFileSync(p, "utf8"), relative(SRC, p).replace(/\\/g, "/")));

const count = (items) => {
  const m = new Map();
  for (const it of items) m.set(it.line, (m.get(it.line) || 0) + 1);
  return m;
};

const origC = count(original);
const curC = count(current);

const missing = [];
const extra = [];
for (const [line, n] of origC) {
  const got = curC.get(line) || 0;
  if (got < n) missing.push({ line, need: n, got, where: original.filter((x) => x.line === line).slice(0, 3) });
}
for (const [line, n] of curC) {
  const need = origC.get(line) || 0;
  if (n > need) extra.push({ line, need, got: n, where: current.filter((x) => x.line === line).slice(0, 3) });
}

const summarize = (kind, arr) => {
  if (!arr.length) return;
  console.error(`${kind} (${arr.length}):`);
  for (const hit of arr.slice(0, 40)) {
    const loc = hit.where.map((w) => `${w.file}:${w.n}`).join(", ");
    const preview = hit.line.length > 120 ? `${hit.line.slice(0, 117)}...` : hit.line;
    console.error(`  [${loc}] need ${hit.need} got ${hit.got} :: ${JSON.stringify(preview)}`);
  }
  if (arr.length > 40) console.error(`  … ${arr.length - 40} more`);
};

if (missing.length || extra.length) {
  summarize("MISSING from new tree", missing);
  summarize("EXTRA in new tree", extra);
  console.error(`move-check FAIL missing=${missing.length} extra=${extra.length} origLines=${original.length} newLines=${current.length}`);
  process.exit(1);
}

console.log(`move-check OK origLines=${original.length} newLines=${current.length} files=${files.length}`);
