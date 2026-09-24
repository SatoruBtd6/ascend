// 7i Part 1 lazy-load proof: /aura/hat-straw.webp must NOT be fetched on page
// load or when other auras mount — only when a crownfall instance is created.
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

const base = process.argv[2] || "http://localhost:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
const auraReqs = [];
page.on("request", (r) => { if (r.url().includes("/aura/")) auraReqs.push(r.url().split("/aura/")[1]); });

await page.goto(`${base}/`, { waitUntil: "networkidle" });
console.log("after app load:", auraReqs.length ? auraReqs : "(no /aura/ requests)");

// mount a non-crownfall aura — still no hat fetch
await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  mod.makeAura(cv, { aura: "atlas", w: 160, h: 160, mode: "circle", ringR: 50 });
});
await page.waitForTimeout(600);
console.log(`after makeAura(atlas): ${auraReqs.length} /aura/ reqs (${auraReqs.join(", ") || "none"}), hat-straw: ${auraReqs.some((u) => u.includes("hat-straw")) ? "FETCHED (bad)" : "no"}`);

// mount a crownfall instance — only now should the hat load
const before = auraReqs.length;
await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  mod.makeAura(cv, { aura: "crownfall", w: 160, h: 160, mode: "circle", ringR: 50 });
});
await page.waitForFunction(() => [...performance.getEntriesByType("resource")].some((e) => e.name.includes("hat-straw")), { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const hatReqs = auraReqs.slice(before).filter((u) => u.includes("hat-straw"));
console.log(`after makeAura(crownfall): ${auraReqs.length - before} new /aura/ reqs, hat-straw fetches: ${hatReqs.length}`);
console.log(hatReqs.length === 1 ? "PASS: hat-straw.webp lazy-loads only on crownfall mount" : "FAIL");
await browser.close();
process.exit(hatReqs.length === 1 ? 0 : 1);
