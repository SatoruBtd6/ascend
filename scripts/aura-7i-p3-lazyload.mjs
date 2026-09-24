// 7i Part 3 lazy-load proof: /aura/robe-ledger.webp and /aura/mask-ledger.webp
// must NOT be fetched on page load or when other auras mount — only when a
// ledger instance is created.
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

// mount a non-ledger aura — still no ledger asset fetches
await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  mod.makeAura(cv, { aura: "atlas", w: 160, h: 160, mode: "circle", ringR: 50 });
});
await page.waitForTimeout(600);
console.log(`after makeAura(atlas): ${auraReqs.length} /aura/ reqs (${auraReqs.join(", ") || "none"}), ledger assets: ${auraReqs.some((u) => u.includes("ledger")) ? "FETCHED (bad)" : "no"}`);

// mount a ledger instance — only now should robe + mask load
const before = auraReqs.length;
await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const cv = document.createElement("canvas"); cv.width = cv.height = 160;
  const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 160;
  const inst = mod.makeAura(cv, { aura: "ledger", w: 160, h: 160, mode: "circle", ringR: 50, overCanvas: cv2 });
  for (let i = 0; i < 30; i++) inst.frame(1 / 60);
});
await page.waitForFunction(() => [...performance.getEntriesByType("resource")].some((e) => e.name.includes("mask-ledger")), { timeout: 5000 }).catch(() => {});
await page.waitForTimeout(300);
const newReqs = auraReqs.slice(before);
const robeReqs = newReqs.filter((u) => u.includes("robe-ledger"));
const maskReqs = newReqs.filter((u) => u.includes("mask-ledger"));
console.log(`after makeAura(ledger): ${newReqs.length} new /aura/ reqs (${newReqs.join(", ")}), robe fetches: ${robeReqs.length}, mask fetches: ${maskReqs.length}`);
const pass = robeReqs.length === 1 && maskReqs.length === 1 && !auraReqs.slice(0, before).some((u) => u.includes("ledger"));
console.log(pass ? "PASS: robe-ledger.webp + mask-ledger.webp lazy-load only on ledger mount; nothing in first download" : "FAIL");
await browser.close();
process.exit(pass ? 0 : 1);
