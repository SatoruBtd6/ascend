// check — the PR gate. Runs tests, lint, and the circular-dependency check;
// every step runs even if an earlier one fails. Prints PASS/FAIL per step and
// exits 1 if any step failed.

import { spawnSync } from "node:child_process";

const num = (re, s) => { const m = s.match(re); return m ? +m[1] : NaN; };

const section = (label, cmd) => {
  console.log(`=== ${label} — ${cmd}`);
  const r = spawnSync("cmd.exe", ["/d", "/s", "/c", cmd], { encoding: "utf8" });
  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);
  console.log("");
  return r;
};

const results = [];

const t = section("tests", "npm test");
const tPass = num(/pass (\d+)/, t.stdout), tFail = num(/fail (\d+)/, t.stdout);
results.push({
  name: "tests",
  ok: t.status === 0 && tFail === 0,
  detail: `${tPass} pass, ${tFail} fail`,
});

const l = section("lint", "npx eslint src --max-warnings 5");
const lErr = num(/(\d+) errors?/, l.stdout + l.stderr), lWarn = num(/(\d+) warnings?/, l.stdout + l.stderr);
results.push({
  name: "lint",
  ok: l.status === 0,
  detail: `${lErr || 0} errors, ${lWarn || 0} warnings (budget 5)`,
});

const m = section("cycles", "npx madge --circular --extensions js,jsx,mjs src");
const mFiles = num(/Processed (\d+) files/, m.stdout + m.stderr), mCycles = num(/Found (\d+) circular/, m.stdout + m.stderr);
results.push({
  name: "cycles",
  ok: m.status === 0 && mCycles !== 0,
  detail: `${mFiles} files, ${mCycles || 0} circular`,
});

console.log("=== summary");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"} ${r.name} — ${r.detail}`);
const bad = results.filter((r) => !r.ok).length;
if (bad) {
  console.log(`${bad} step(s) failed.`);
  process.exit(1);
}
console.log("check passed.");
