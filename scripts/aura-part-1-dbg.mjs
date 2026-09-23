import { createRequire } from "node:module";
import { existsSync } from "node:fs";
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
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1100 } })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise(r => setTimeout(r, 1000));
// size 160
await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.trim().startsWith("160"))?.click());
await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.querySelector("canvas") && x.textContent.includes("· halo"))?.click());
await new Promise(r => setTimeout(r, 800));
const sel = await page.$("#aura-backdrop");
await sel.selectOption("photo");
const fi = await page.$("#aura-photo");
await fi.setInputFiles("C:/Users/rms76/ascend/public/avatars/E.webp");
await new Promise(r => setTimeout(r, 1200));
console.log("backdrop:", await sel.evaluate(s => s.value));
const info = await page.evaluate(() => ({
  canvases: [...document.querySelectorAll("canvas")].map(c => { const r = c.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }; }),
  imgs: [...document.querySelectorAll("img")].map(i => { const r = i.getBoundingClientRect(); return { src: i.src.slice(-45), w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y) }; }),
}));
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: join(OUT, "p1-dbg-full.png") });
await browser.close();
