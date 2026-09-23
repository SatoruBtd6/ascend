// Capture a burst of frames to inspect the godray pingpong cycle.
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h");
mkdirSync(OUT, { recursive: true });
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise(r => setTimeout(r, 1000));
await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.trim().startsWith("160"))?.click());
await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.querySelector("canvas") && x.textContent.includes("· godray"))?.click());
await new Promise(r => setTimeout(r, 1500));
for (let i = 0; i < 6; i++) {
  const clip = await page.evaluate(() => {
    const c = [...document.querySelectorAll("canvas")].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 30)[0];
    const pad = 24;
    return { x: Math.max(0, c.x - pad), y: Math.max(0, c.y - pad), width: c.width + pad * 2, height: c.height + pad * 2 };
  });
  await page.screenshot({ path: join(OUT, `p1-cycle-${i}.png`), clip });
  await new Promise(r => setTimeout(r, 620));
}
await browser.close();
console.log("done");
