// Per-frame JS cost of a given aura list at 4x CPU via the auraProbe hook
// (canvas._aura.frame). Each aura is opened alone in the gallery stage.
// Usage: node scripts/aura-7h-p2-framecost.mjs [--base http://localhost:5173] [--out file.json] aura,aura,...
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
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
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5173";
const out = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const auras = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--base" && args[i - 1] !== "--out").join(",").split(",").filter(Boolean);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 900, height: 1000 } });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.goto(`${base}/?auras=1&auraProbe=1`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => [...document.querySelectorAll("button")].find(b => b.textContent.trim().startsWith("88"))?.click());
const results = {};
const measure = async (aura) => {
  await page.evaluate(() => [...document.querySelectorAll("button")].find(x => x.textContent.trim() === "All auras")?.click());
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate((a) => [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${a}`))?.click(), aura);
  await new Promise(r => setTimeout(r, 900));
  const stats = await page.evaluate(async () => {
    const cv = [...document.querySelectorAll("canvas")].find((c) => c._aura);
    if (!cv) return { err: "no _aura" };
    const inst = cv._aura;
    const times = [];
    const orig = inst.frame.bind(inst);
    inst.frame = (dt) => { const t0 = performance.now(); orig(dt); times.push(performance.now() - t0); };
    await new Promise(r => setTimeout(r, 2600));
    inst.frame = orig;
    times.sort((a, b) => a - b);
    const avg = times.reduce((s, v) => s + v, 0) / times.length;
    return { n: times.length, avg: +avg.toFixed(3), p50: +times[Math.floor(times.length * 0.5)].toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3), max: +times[times.length - 1].toFixed(3) };
  });
  results[aura] = stats;
  console.log(`${aura.padEnd(14)} frames=${stats.n} avg=${stats.avg}ms p50=${stats.p50} p95=${stats.p95} max=${stats.max}`);
};
for (const a of auras) await measure(a);
await browser.close();
if (out) writeFileSync(out, JSON.stringify(results, null, 2));
