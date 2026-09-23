// Part 1 evidence matrix: each aura × size × theme × backdrop (figure + photo).
// Usage: node aura-part-1-matrix.mjs [aura[,aura...]]
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h", "part1");
mkdirSync(OUT, { recursive: true });
const auras = (process.argv[2] || "blacksun,godray,halo,inferno").split(",");

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 2 })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

const clickBtn = (match) => page.evaluate((m) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === m || b.textContent.trim().startsWith(m))?.click(), match);
const openAura = async (id) => {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 350));
  await page.evaluate((a) => [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click(), id);
  await new Promise((r) => setTimeout(r, 700));
};
const shotStage = async (name) => {
  const clip = await page.evaluate(() => {
    const c = [...document.querySelectorAll("canvas")].map((x) => x.getBoundingClientRect()).filter((r) => r.width > 30)[0];
    if (!c) return null;
    const pad = 30;
    return { x: Math.max(0, c.x - pad), y: Math.max(0, c.y - pad), width: Math.min(c.width + pad * 2, 900), height: Math.min(c.height + pad * 2, 1100) };
  });
  if (clip) await page.screenshot({ path: join(OUT, `${name}.png`), clip });
};

for (const aura of auras) {
  for (const size of ["76", "160"]) {
    for (const theme of ["dark", "light"]) {
      for (const kind of ["photo", "figure"]) {
        await openAura(aura);
        await clickBtn(theme === "dark" ? "Dark" : "Light");
        await clickBtn(size);
        const bsel = await page.$("#aura-backdrop");
        if (kind === "photo") {
          await bsel.selectOption("photo");
          const fi = await page.$("#aura-photo");
          if (fi) await fi.setInputFiles(join(process.cwd(), "public", "avatars", "E.webp"));
        } else {
          await bsel.selectOption("/avatars/E.webp");
        }
        await new Promise((r) => setTimeout(r, 1500));
        await shotStage(`${aura}-${size}-${theme}-${kind}`);
        console.log(`${aura} ${size} ${theme} ${kind}`);
      }
    }
  }
}
await browser.close();
console.log("done");
