// Audit every range slider in the dev gallery: label, live value, min, max.
// Flags any control whose spec value sits outside [min, max] (clamped thumb)
// or whose range is wildly mismatched (thumb parked in a corner).
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

const BASE = process.argv[2] || "http://localhost:5173";
const AURAS = process.argv[3]?.split(",") || null;

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage();
await page.goto(`${BASE}/?auras=1`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1500));

const ids = AURAS || await page.evaluate(() =>
  [...document.querySelectorAll("button")].filter((b) => b.querySelector("canvas")).map((b) => (b.textContent.match(/· (\w+)$/) || [])[1]).filter(Boolean));
console.log(`auditing ${ids.length} auras`);

const report = [];
for (const id of ids) {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 250));
  await page.evaluate((a) => [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click(), id);
  await new Promise((r) => setTimeout(r, 500));
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("input[type=range]")].map((el) => {
      const label = el.closest("label")?.querySelector("span")?.textContent || el.closest("label")?.textContent?.trim() || "?";
      return { label, value: +el.value, min: +el.min, max: +el.max, step: el.step };
    }));
  for (const row of rows) {
    const clamped = row.value < row.min || row.value > row.max;
    const parked = !clamped && row.max > row.min && (row.value - row.min) / (row.max - row.min) < 0.05 && row.value !== row.min;
    if (clamped || parked) report.push({ aura: id, ...row, issue: clamped ? "CLAMPED" : "parked<5%" });
  }
}
console.log("issue\taura\tlabel\tvalue\tmin\tmax\tstep");
for (const r of report) console.log(`${r.issue}\t${r.aura}\t${r.label}\t${r.value}\t${r.min}\t${r.max}\t${r.step}`);
console.log(`\n${report.length} problem sliders`);
await browser.close();
