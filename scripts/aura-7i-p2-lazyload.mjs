// 7i Part 2 lazy-load proof: /aura/blindfold.webp must NOT be fetched on page
// load or when other auras mount — only when a nullpoint instance is created.
// /aura/hair-white.webp must not fetch at all while hair is the default
// "strands" (it only loads if the asset variant is selected).
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

const base = process.argv[2] || "http://localhost:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext()).newPage();
const auraReqs = [];
page.on("request", (r) => { if (r.url().includes("/aura/")) auraReqs.push(r.url().split("/aura/")[1]); });

await page.goto(`${base}/`, { waitUntil: "networkidle" });
console.log("after app load:", auraReqs.length ? auraReqs : "(no /aura/ requests)");

// mount a non-nullpoint aura — still no blindfold fetch
await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  mod.makeAura(cv, { aura: "atlas", w: 160, h: 160, mode: "circle", ringR: 50 });
});
await page.waitForTimeout(600);
console.log(`after makeAura(atlas): ${auraReqs.length} /aura/ reqs (${auraReqs.join(", ") || "none"}), blindfold: ${auraReqs.some((u) => u.includes("blindfold")) ? "FETCHED (bad)" : "no"}`);

// mount a nullpoint instance — only now should the blindfold load; the
// hair-white asset must stay unfetched (spec ships hair:"strands")
const before = auraReqs.length;
await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 160;
  const inst = mod.makeAura(cv, { aura: "nullpoint", w: 160, h: 160, mode: "circle", ringR: 50, overCanvas: cv2 });
  for (let i = 0; i < 30; i++) inst.frame(1 / 60);
});
await page.waitForFunction(() => [...performance.getEntriesByType("resource")].some((e) => e.name.includes("blindfold")), { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const foldReqs = auraReqs.slice(before).filter((u) => u.includes("blindfold"));
const hairReqs = auraReqs.filter((u) => u.includes("hair-white"));
console.log(`after makeAura(nullpoint): ${auraReqs.length - before} new /aura/ reqs, blindfold fetches: ${foldReqs.length}, hair-white fetches: ${hairReqs.length}`);
const pass = foldReqs.length === 1 && hairReqs.length === 0;
console.log(pass ? "PASS: blindfold.webp lazy-loads only on nullpoint mount; hair-white.webp stays unloaded under strands" : "FAIL");
await browser.close();
process.exit(pass ? 0 : 1);
