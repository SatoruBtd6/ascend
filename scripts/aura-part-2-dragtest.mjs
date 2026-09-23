// Drag-test: for each range input in the editor, set value to min then max via
// synthetic input events, then read back the spec (via Copy spec path is heavy —
// instead we check the rendered canvas changed + the number input value).
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

const BASE = "http://localhost:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await browser.newPage();
await page.goto(`${BASE}/?auras=1`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1500));

for (const aura of ["godray", "inferno", "blacksun", "eclipseheart"]) {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 250));
  await page.evaluate((a) => [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click(), aura);
  await new Promise((r) => setTimeout(r, 600));
  const rows = await page.evaluate(async () => {
    const out = [];
    for (const el of [...document.querySelectorAll("input[type=range]")]) {
      const label = el.closest("label")?.querySelector("span")?.textContent || "?";
      const num = el.closest("label")?.querySelector("input[type=number]");
      const start = num ? num.value : el.value;
      const set = (v) => { // React-compatible setter
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
        setter.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      };
      set(el.max); el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      const atMax = num ? num.value : el.value;
      set(el.min); el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      const atMin = num ? num.value : el.value;
      set(start); el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 150));
      out.push({ label, start, atMin, atMax, min: el.min, max: el.max });
    }
    return out;
  });
  console.log(`\n=== ${aura} ===`);
  for (const r of rows) {
    const stuck = r.atMax === r.start && +r.atMax !== +r.max && +r.start !== +r.max;
    console.log(`${r.label.padEnd(28)} start=${r.start} min→${r.atMin} max→${r.atMax}  [${r.min}..${r.max}]${stuck ? "  STUCK?" : ""}`);
  }
}
await browser.close();
