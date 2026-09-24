// 7i rename evidence: mount CrateTeaser + CrateVault with a fake non-sandbox
// state and screenshot both. Run before and after the rename for A/B proof.
// Usage: node scripts/aura-7i-crate-rename-shots.mjs [--base URL] [--tag before|after]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:5173";
const tag = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : "after";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(async () => {
  const React = (await import("/node_modules/.vite/deps/react.js")).default;
  const RD = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
  const { CrateTeaser } = await import("/src/tabs/profile/crateTeaser.jsx");
  const { CrateVault } = await import("/src/tabs/profile/CrateVault.jsx");
  window.__R = { React, RD, CrateTeaser, CrateVault };
});
const renderTeaser = () => page.evaluate(() => {
  const { React, RD, CrateTeaser } = window.__R;
  document.body.innerHTML = "";
  document.body.style.cssText = "margin:0;background:#0B0F17;padding:16px";
  const s = { xp: 5200, workouts: [], crateUnlocks: { chud: "2026-09-01", sigil: "2026-09-02" }, crateLog: [], crateSpent: 0, profile: { look: {} }, test: false };
  const teaser = document.createElement("div"); teaser.id = "teaser"; document.body.appendChild(teaser);
  RD.createRoot(teaser).render(React.createElement(CrateTeaser, { s, onOpen: () => {} }));
});
await renderTeaser();
await page.waitForTimeout(400);
await page.$("#teaser").then((el) => el.screenshot({ path: join(OUT, `7i-crate-card-${tag}.png`) }));
console.log(`7i-crate-card-${tag}.png`);

await page.evaluate(() => {
  const { React, RD, CrateVault } = window.__R;
  document.body.innerHTML = "";
  const s = { xp: 5200, workouts: [], crateUnlocks: { chud: "2026-09-01", sigil: "2026-09-02" }, crateLog: [], crateSpent: 0, cratePity: 12, profile: { look: {} }, test: false };
  const vault = document.createElement("div"); vault.id = "vault"; document.body.appendChild(vault);
  RD.createRoot(vault).render(React.createElement(CrateVault, { s, setS: () => {} }));
});
await page.waitForTimeout(600);
await page.$("#vault").then((el) => el.screenshot({ path: join(OUT, `7i-crate-vault-${tag}.png`) }));
console.log(`7i-crate-vault-${tag}.png`);
await browser.close();
