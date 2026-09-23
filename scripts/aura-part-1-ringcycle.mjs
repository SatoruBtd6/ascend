// Verify blacksun ring colour cycle: sample the top-of-ring pixel over time.
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
const page = await (await browser.newContext({ viewport: { width: 900, height: 1000 } })).newPage();
await page.goto("http://localhost:5180/?auras=1&auraProbe=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.trim().startsWith("160"))?.click());
await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.querySelector("canvas") && x.textContent.includes("· blacksun"))?.click());
await new Promise(r => setTimeout(r, 1200));
// ring at r=1.18 of rx; canvas 160px circle mode: cx=80, cy=80, rx=ringR=52
// top of ring: (80, 80 - 52*1.18) = (80, 18.6). Sample a few px around it.
const sample = () => page.evaluate(() => {
  const cv = [...document.querySelectorAll("canvas")].find(c => c._aura);
  const g = cv.getContext("2d");
  const d = g.getImageData(70, 10, 20, 20).data;
  let best = 0, sum = 0;
  for (let i = 3; i < d.length; i += 4) { if (d[i] > best) { best = d[i]; sum = d[i - 3] + d[i - 2] + d[i - 1]; } }
  return { alpha: best, sum };
});
for (let i = 0; i < 7; i++) {
  console.log(`t+${(i * 1.2).toFixed(1)}s`, JSON.stringify(await sample()));
  await new Promise(r => setTimeout(r, 1200));
}
await browser.close();
