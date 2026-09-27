// aura:baseline — re-pin the baseline worktree to a tag or commit.
// Refuses to run on a dirty worktree; runs npm.cmd ci in it only when the
// target's package-lock.json differs from what's checked out.

import { existsSync, readFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { baselineDir, git } from "./aura-lib.mjs";

const target = process.argv[2];
if (!target) {
  console.error("usage: npm.cmd run aura:baseline -- <tag-or-commit>");
  process.exit(1);
}

const dir = baselineDir();
if (!existsSync(dir)) {
  console.error(`baseline worktree ${dir} does not exist.`);
  console.error(`create it once:  git worktree add --detach "${dir}" ${target}`);
  process.exit(1);
}
// Resolve the target in the main repo first so a bad name fails before checkout.
let targetSha;
try { targetSha = git(".", `rev-parse "${target}"`); } catch {
  console.error(`unknown tag or commit: ${target}`);
  process.exit(1);
}

const dirty = git(dir, "status --porcelain");
if (dirty) {
  console.error(`baseline worktree ${dir} has local changes — refusing to re-pin:`);
  console.error(dirty);
  process.exit(1);
}

const lockHash = () => {
  const f = join(dir, "package-lock.json");
  return existsSync(f) ? createHash("sha256").update(readFileSync(f)).digest("hex") : "";
};

const before = git(dir, "rev-parse HEAD");
const beforeLock = lockHash();

try {
  execSync(`git -C "${dir}" checkout --detach ${targetSha}`, { stdio: "inherit" });
} catch {
  console.error(`checkout of ${target} failed — worktree left as git left it`);
  process.exit(1);
}

const after = git(dir, "rev-parse HEAD");
const tag = git(dir, "tag --points-at HEAD");

if (lockHash() !== beforeLock) {
  console.log("package-lock.json changed — running npm.cmd ci in the baseline worktree");
  const r = spawnSync("cmd.exe", ["/d", "/s", "/c", "npm.cmd ci"], { cwd: dir, stdio: "inherit" });
  if (r.status !== 0) {
    console.error(`npm.cmd ci failed in ${dir} (exit ${r.status})`);
    process.exit(1);
  }
}

console.log(`baseline ${dir}`);
console.log(`  before: ${before}`);
console.log(`  after:  ${after}${tag ? `  (${tag})` : ""}`);
