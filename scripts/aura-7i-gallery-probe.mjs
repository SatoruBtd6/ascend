// Focused probe: drag specific sliders and log el.min/max/step/value live,
// to pin down bounds-that-move and snap-back-on-release behaviour.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const base = process.argv[2] || "http://127.0.0.1:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Ossuary/ }).first().click();
await page.waitForTimeout(800);

const handles = await page.$$('label input[type="range"]');
const meta = await Promise.all(handles.map((h) => h.evaluate((el) => el.closest("label")?.querySelector("span")?.textContent?.trim() || "?")));
const read = (h) => h.evaluate((el) => {
  const num = el.closest("label")?.querySelector('input[type="number"]');
  return `v=${el.value} rng=[${el.min}..${el.max}/${el.step}] num=${num?.value}`;
}).catch(() => "DETACHED");

for (const target of ["To", "Every", "1 — max", "Size — min", "Tremble"]) {
  const i = meta.lastIndexOf(target);
  if (i < 0) { console.log(`${target}: not found`); continue; }
  const h = handles[i];
  await h.scrollIntoViewIfNeeded().catch(() => {});
  const bb = await h.boundingBox();
  if (!bb) { console.log(`${target}: no box`); continue; }
  const y = Math.max(bb.y, 96) + bb.height / 2;
  const v0 = parseFloat(await h.evaluate((el) => el.value));
  const mn = parseFloat(await h.evaluate((el) => el.min));
  const mx = parseFloat(await h.evaluate((el) => el.max));
  const sx = bb.x + 8 + (bb.width - 16) * Math.min(1, Math.max(0, (v0 - mn) / (mx - mn || 1)));
  console.log(`\n### "${target}" start: ${await read(h)} @thumb frac=${((v0 - mn) / (mx - mn || 1)).toFixed(2)}`);
  await page.mouse.move(sx, y); await page.mouse.down();
  for (let s = 1; s <= 5; s += 1) {
    await page.mouse.move(sx + (bb.x + bb.width * 0.85 - sx) * (s / 5), y, { steps: 2 });
    await page.waitForTimeout(160);
    console.log(`  step ${s}: ${await read(h)}`);
  }
  await page.mouse.up();
  await page.waitForTimeout(400);
  console.log(`  released: ${await read(h)}`);
}
await browser.close();
