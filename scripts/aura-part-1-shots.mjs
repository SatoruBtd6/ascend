// Part 1 iteration shots: <aura> on figure + photo, size + theme selectable.
// Usage: node aura-part-1-shots.mjs [aura[,aura...]] [--size 160] [--theme dark]
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
const auras = (args[0] && !args[0].startsWith("--") ? args[0] : "blacksun,godray,halo,inferno").split(",");
const size = args.includes("--size") ? args[args.indexOf("--size") + 1] : "160";
const theme = args.includes("--theme") ? args[args.indexOf("--theme") + 1] : "dark";
const tag = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : "p1";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

// theme + size buttons
await page.evaluate((t) => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim().toLowerCase() === t)?.click();
}, theme);
await page.evaluate((s) => {
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith(s))?.click();
}, size);
await new Promise((r) => setTimeout(r, 400));

const shotStage = async (name) => {
  const clip = await page.evaluate(() => {
    const c = [...document.querySelectorAll("canvas")].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 30)[0];
    if (!c) return null;
    const pad = 24;
    return { x: Math.max(0, c.x - pad), y: Math.max(0, c.y - pad), width: Math.min(c.width + pad * 2, 900), height: Math.min(c.height + pad * 2, 1200) };
  });
  if (clip) await page.screenshot({ path: join(OUT, name), clip });
};

for (const aura of auras) {
  for (const kind of ["figure", "photo"]) {
    await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
    await new Promise((r) => setTimeout(r, 400));
    await page.evaluate((a) => {
      [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click();
    }, aura);
    await new Promise((r) => setTimeout(r, 800));
    const bsel = await page.$("#aura-backdrop");
    if (kind === "photo") {
      await bsel.selectOption("photo");
      const fi = await page.$("#aura-photo");
      if (fi) await fi.setInputFiles(join(process.cwd(), "public", "avatars", "E.webp"));
    } else {
      await bsel.selectOption("/avatars/E.webp");
    }
    await new Promise((r) => setTimeout(r, 1400));
    console.log(`  backdrop now: ${await bsel.evaluate((s) => s.value)}`);
    await shotStage(`${tag}-${aura}-${kind}-${size}-${theme}.png`);
    console.log(`${aura} ${kind}: shot`);
  }
}
await browser.close();
console.log("done");
