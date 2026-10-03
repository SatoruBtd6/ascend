// Status tab p95 frame time — the 7q declutter baseline/after.
// Signs in as the test account (lands on Status), samples rAF gaps while
// scrolled through the page, reports median / p95 / p99, page height,
// canvases, and where the "Start training" button sits (fold check).
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "status-perf", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(OUT, { recursive: true });

let chromium;
for (const dir of ["node_modules/playwright-core", "node_modules/playwright"]) {
  try { const m = await import(pathToFileURL(join(REPO, dir, "index.js")).href); if (m.chromium || m.default?.chromium) { chromium = m.chromium || m.default.chromium; break; } } catch {}
}
if (!chromium) chromium = (await import("playwright-core")).chromium;

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
const client = await ctx.newCDPSession(page);
await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="password"]', { timeout: 15000 });
await page.fill('input[type="email"]', env.TEST_EMAIL);
await page.fill('input[type="password"]', env.TEST_PASSWORD);
await page.locator("form button").first().click();
await page.waitForSelector('text=Train', { timeout: 30000 });
await page.waitForTimeout(3000); // Status is the default tab — let canvases/polls spin up

const metrics = await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const inner = sc?.firstElementChild;
  const btn = [...document.querySelectorAll("button")].find((b) => /Start training|Resume workout/.test(b.textContent));
  const r = btn?.getBoundingClientRect();
  return {
    canvases: document.querySelectorAll("canvas").length,
    pageHeightPx: inner ? inner.scrollHeight : (sc || document.documentElement).scrollHeight,
    startBtn: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom) } : null,
    innerH: window.innerHeight,
  };
});
console.log(JSON.stringify(metrics));

const samples = [];
for (const frac of [0, 0.35, 0.7, 1]) {
  const navGap = await page.evaluate((f) => {
    const sc = document.getElementById("ascend-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight * f; else window.scrollTo(0, document.documentElement.scrollHeight * f);
    const nav = document.querySelector("#ascend-root nav");
    const r = nav.getBoundingClientRect();
    return { scrollTop: sc ? sc.scrollTop : window.scrollY, navBottom: r.bottom };
  }, frac);
  console.log(`scroll ${frac}: top=${Math.round(navGap.scrollTop)} navBottom=${navGap.navBottom.toFixed(1)}`);
  await page.waitForTimeout(300);
  const gaps = await page.evaluate(() => new Promise((res) => {
    const g = [];
    let last = performance.now(), n = 0;
    const tick = (t) => { g.push(t - last); last = t; if (++n < 120) requestAnimationFrame(tick); else res(g); };
    requestAnimationFrame(tick);
  }));
  samples.push(...gaps);
}
samples.sort((a, b) => a - b);
const pct = (p) => samples[Math.floor(samples.length * p / 100)]?.toFixed(1);
const med = pct(50), p95 = pct(95), p99 = pct(99);
const mean = (samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(1);
const over16 = ((samples.filter((g) => g > 16.7).length / samples.length) * 100).toFixed(1);

const report = { when: new Date().toISOString(), ...metrics, samples: samples.length, mean, p50: med, p95, p99, over16msPct: over16, cpuThrottle: 4, viewport: "390x844" };
writeFileSync(join(OUT, "result.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log("OUT:", OUT);
await browser.close();
