import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium) return m.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage();
await page.goto("http://localhost:5180/?auras=1&auraProbe=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise(r => setTimeout(r, 800));
await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.querySelector("canvas") && x.textContent.includes("· godray"))?.click());
await new Promise(r => setTimeout(r, 1500));
const out = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = [...document.querySelectorAll("canvas")].find(c => c._aura);
  return {
    cacheSize: mod._auraImageCache.size,
    cacheEntries: [...mod._auraImageCache.entries()].map(([k, v]) => `${k}: ready=${v.ready}`),
    loopSize: mod.AuraLoop.set.size,
    hasAura: !!cv,
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
