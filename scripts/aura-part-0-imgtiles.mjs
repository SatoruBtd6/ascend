import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1800 } })).newPage();
await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1500));
const info = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => b.querySelector("canvas") && b.textContent.includes("·")).map((b) => ({ label: b.textContent.trim().slice(0, 44), imgs: b.querySelectorAll("img").length, srcs: [...b.querySelectorAll("img")].map((i) => i.src.slice(-30)) })).filter((t) => t.imgs > 0));
console.log(JSON.stringify(info, null, 1));
await browser.close();
