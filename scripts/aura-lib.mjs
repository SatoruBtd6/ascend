// aura-lib.mjs — shared helpers for the aura:* commands.
// Baseline worktree path, dev-server lifecycle, port checks, evidence dirs.
// Per decision D4: aura commands always run the current tree on 5180 and the
// baseline worktree on 5181, and refuse a busy port rather than picking another.
// Per decision D5: ASCEND_BASELINE is the baseline worktree path; ASCEND_BASE
// keeps its existing meaning (a URL) in diag-harness.mjs.

import { existsSync, mkdirSync } from "node:fs";
import { execSync, spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const CURR_PORT = 5180;
export const BASE_PORT = 5181;
export const CURR_URL = `http://localhost:${CURR_PORT}`;
export const BASE_URL = `http://localhost:${BASE_PORT}`;

export function baselineDir() {
  return resolve(process.env.ASCEND_BASELINE || join(REPO, "..", "ascend-baseline"));
}

export function git(dir, args) {
  return execSync(`git -C "${dir}" ${args}`, { encoding: "utf8" }).trim();
}

// Returns the pid listening on the port, or 0 if free. netstat covers both
// IPv4 (TCP) and IPv6 (TCP6) listeners.
export function portOwner(port) {
  let out;
  try { out = execSync("netstat -ano", { encoding: "utf8", timeout: 15000 }); }
  catch { return 0; }
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*TCP6?\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
    if (m && +m[1] === port) return +m[2];
  }
  return 0;
}

function procName(pid) {
  try {
    const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: "utf8" });
    const m = out.match(/^"([^"]+)"/m);
    return m ? `${m[1]} (pid ${pid})` : `pid ${pid}`;
  } catch { return `pid ${pid}`; }
}

export function assertPortFree(port) {
  const pid = portOwner(port);
  if (pid) {
    console.error(`port ${port} is in use by ${procName(pid)} — refusing to use another port. Stop it and rerun.`);
    process.exit(1);
  }
}

const children = new Set();
function killAll() {
  for (const c of children) {
    try { execSync(`taskkill /pid ${c.pid} /T /F`, { stdio: "ignore" }); } catch {}
  }
}
export function stopServers() { killAll(); children.clear(); }
// Ctrl+C: kill the vite children first, then exit non-zero.
process.on("exit", killAll);
process.on("SIGINT", () => { killAll(); process.exit(130); });
process.on("SIGTERM", () => { killAll(); process.exit(143); });

// Spawn `node node_modules/vite/bin/vite.js --port P --strictPort` directly so
// kill reaches the real process (no npm/cmd wrapper to leave orphans behind).
export function startVite(dir, port) {
  const viteJs = join(dir, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteJs)) {
    console.error(`no vite install in ${dir} — run npm.cmd ci there first`);
    process.exit(1);
  }
  const child = spawn(process.execPath, [viteJs, "--port", String(port), "--strictPort"], {
    cwd: dir, stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  let log = "";
  child.stdout.on("data", (d) => { log += d; if (log.length > 4000) log = log.slice(-4000); });
  child.stderr.on("data", (d) => { log += d; if (log.length > 4000) log = log.slice(-4000); });
  child.on("exit", (code) => {
    if (children.has(child) && code !== 0 && code !== null) {
      console.error(`vite in ${dir} exited with code ${code}:\n${log.trim()}`);
      process.exit(1);
    }
  });
  return child;
}

export async function waitReady(url, ms = 90000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try { const r = await fetch(url + "/?auras=1"); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`server at ${url} did not come up within ${ms / 1000}s`);
  process.exit(1);
}

export function evidenceDir(name) {
  const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const dir = join(REPO, "evidence", name, ts);
  mkdirSync(dir, { recursive: true });
  return dir;
}
