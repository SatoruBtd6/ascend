// Profile-preview pane shots: the real 76px Avatar/AuraRing path.
// Usage: node aura-part-2-previewshots.mjs [aura[,aura...]] [--theme dark] [--tag p2b]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h");
mkdirSync(OUT, { recursive: true });

const args = process.argv.slice(2);
const auras = (args[0] && !args[0].startsWith("--") ? args[0] : "godray,blacksun,inferno,ascended").split(",");
const theme = args.includes("--theme") ? args[args.indexOf("--theme") + 1] : "dark";
const tag = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : "p2b";
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate((t) => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim().toLowerCase() === t)?.click();
}, theme);
await new Promise((r) => setTimeout(r, 300));

for (const aura of auras) {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate((a) => {
    [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click();
  }, aura);
  await new Promise((r) => setTimeout(r, 1600));
  const clip = await page.evaluate(() => {
    const label = [...document.querySelectorAll("div")].find((d) => d.textContent.trim() === "Profile avatar (76px, real chrome)");
    const panel = label?.parentElement;
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
  });
  if (clip) {
    await page.screenshot({ path: join(OUT, `${tag}-${aura}-avatar76-${theme}.png`), clip });
    console.log(`${aura}: preview shot`);
  } else console.log(`${aura}: NO PREVIEW PANEL`);
}
await browser.close();
console.log("done");
