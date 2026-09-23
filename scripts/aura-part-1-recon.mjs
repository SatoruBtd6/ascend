// Recon: champion crown placement on figure vs photo, anchors overlay.
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
const page = await (await browser.newContext({ viewport: { width: 900, height: 1100 } })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

const openAura = async (id) => {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate((a) => {
    [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click();
  }, id);
  await new Promise((r) => setTimeout(r, 900));
};
const shotStage = async (name) => {
  const clip = await page.evaluate(() => {
    const el = [...document.querySelectorAll("canvas")].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 40)[0];
    if (!el) return null;
    const pad = 30;
    return { x: Math.max(0, el.x - pad), y: Math.max(0, el.y - pad), width: Math.min(el.width + pad * 2, 900), height: Math.min(el.height + pad * 2, 1100) };
  });
  if (clip) await page.screenshot({ path: join(OUT, name), clip });
};

for (const aura of ["champion", "halo", "blacksun", "godray", "inferno"]) {
  await openAura(aura);
  // anchors on
  await page.evaluate(() => { const c = document.querySelector("#aura-anchors"); if (c && !c.checked) c.click(); });
  await new Promise((r) => setTimeout(r, 400));
  await shotStage(`p1-recon-${aura}-figure.png`);
}
await browser.close();
console.log("done");
