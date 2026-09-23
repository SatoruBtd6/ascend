// Verify the new labels/controls render: wings note (ascended), blend select
// (smolder), icons note (chud), images note (eclipseheart), bolt-from note
// (bonewright). Screenshot each editor.
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
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

const checks = {
  ascended: ["Wings", "not tunable here"],
  smolder: ["Blend mode", "Additive glow"],
  chud: ["Icons", "not editable here"],
  eclipseheart: ["Images —", "cycle across particles", "Blend mode"],
  bonewright: ["Strike direction", "above"],
};
for (const [aura, needles] of Object.entries(checks)) {
  await page.evaluate((id) => {
    [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${id}`))?.click();
  }, aura);
  await new Promise((r) => setTimeout(r, 700));
  const found = await page.evaluate((needles2) => {
    const editor = document.querySelector("[data-control-group]")?.parentElement;
    const text = editor?.textContent || "";
    return needles2.map((n) => `${n}: ${text.includes(n) ? "OK" : "MISSING"}`);
  }, needles);
  console.log(`${aura}: ${found.join(" | ")}`);
  const clip = await page.evaluate(() => {
    const el = document.querySelector("[data-control-group]")?.parentElement;
    const r = el?.getBoundingClientRect();
    return r ? { x: Math.max(0, r.x), y: Math.max(0, r.y), width: Math.min(r.width, 1100), height: Math.min(r.height, 1400) } : null;
  });
  if (clip) await page.screenshot({ path: join(OUT, `p0c-editor-${aura}.png`), clip });
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 300));
}
await browser.close();
