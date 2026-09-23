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
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1 })).newPage();
await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes("· huntersmoon"));
  b?.click();
});
await new Promise((r) => setTimeout(r, 900));
await page.evaluate(() => {
  const el = document.querySelector('[data-control-group="ring-0"]') || [...document.querySelectorAll("[data-control-group]")].pop();
  el?.scrollIntoView({ block: "start" });
});
await new Promise((r) => setTimeout(r, 500));
await page.screenshot({ path: join(OUT, "p0b-editor-huntersmoon-bottom.png") });
await browser.close();
console.log("done");
