// Screenshot the SpecEditor for a few auras to verify plain-English labels.
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
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 }, deviceScaleFactor: 1 })).newPage();
await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

for (const aura of ["huntersmoon", "blacksun", "ascended"]) {
  await page.evaluate((id) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${id}`));
    b?.click();
  }, aura);
  await new Promise((r) => setTimeout(r, 900));
  // Screenshot the editor column (right side of the stage).
  const clip = await page.evaluate(() => {
    const groups = [...document.querySelectorAll("[data-control-group]")];
    if (!groups.length) return null;
    const editor = groups[0].closest("div[style*='grid']")?.parentElement || groups[0].parentElement;
    const r = editor.getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(1100 - Math.max(0, r.x), r.width + 20), height: Math.min(1400, r.height) };
  });
  if (clip) await page.screenshot({ path: join(OUT, `p0b-editor-${aura}.png`), clip });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras");
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
}
await browser.close();
console.log("done");
