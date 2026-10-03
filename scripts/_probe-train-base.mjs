// Train tab baseline — page height + what's on the landing (7q audit).
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));

let chromium;
for (const dir of ["node_modules/playwright-core", "node_modules/playwright"]) {
  try { const m = await import(pathToFileURL(join(REPO, dir, "index.js")).href); if (m.chromium || m.default?.chromium) { chromium = m.chromium || m.default.chromium; break; } } catch {}
}
if (!chromium) chromium = (await import("playwright-core")).chromium;

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="password"]', { timeout: 15000 });
await page.fill('input[type="email"]', env.TEST_EMAIL);
await page.fill('input[type="password"]', env.TEST_PASSWORD);
await page.locator("form button").first().click();
await page.waitForSelector('nav button', { timeout: 30000 });
await page.waitForTimeout(2500);

// Click the Train tab
await page.evaluate(() => {
  const b = [...document.querySelectorAll("nav button")].find((x) => /train/i.test(x.textContent));
  b?.click();
});
await page.waitForSelector('text=Start workout', { timeout: 10000 });
await page.waitForTimeout(800);

const metrics = await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const inner = sc?.firstElementChild;
  const panels = inner ? [...inner.querySelectorAll(".panel")].length : 0;
  const nav = document.querySelector("#ascend-root nav");
  const hist = inner ? [...inner.querySelectorAll("h2")].find((h) => /history/i.test(h.textContent)) : null;
  const hr = hist?.getBoundingClientRect();
  return {
    pageHeightPx: inner ? inner.scrollHeight : 0,
    viewportH: window.innerHeight,
    screens: inner ? +(inner.scrollHeight / window.innerHeight).toFixed(1) : 0,
    historyCards: panels,
    historyHeaderY: hr ? Math.round(hr.top + sc.scrollTop) : null,
    navBottom: nav ? nav.getBoundingClientRect().bottom : null,
    workoutsShown: inner ? [...inner.querySelectorAll(".panel")].length - 1 : 0,
  };
});
console.log(JSON.stringify(metrics, null, 1));
import { mkdirSync } from "node:fs";
const OUT = join(REPO, "evidence", "train-7q", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(OUT, { recursive: true });
await page.screenshot({ path: join(OUT, "train-collapsed.png") });
// expand first history card
await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  if (sc) sc.scrollTop = sc.scrollHeight;
});
await page.waitForTimeout(400);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-expanded]')].find((x) => x.textContent.includes("·"));
  b?.scrollIntoView({ block: "center" }); b?.click();
});
await page.waitForTimeout(450);
await page.screenshot({ path: join(OUT, "train-expanded.png") });
// open the ··· menu on the FIRST history card (visible)
await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  if (sc) sc.scrollTop = 260;
});
await page.waitForTimeout(300);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-label="More actions"]')].find((x) => { const r = x.getBoundingClientRect(); return r.top > 100 && r.bottom < 800; });
  b?.click();
});
await page.waitForTimeout(350);
await page.screenshot({ path: join(OUT, "train-menu.png") });
// active workout screen: start a workout
await page.evaluate(() => { document.body.click(); });
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Start workout")?.click(); });
await page.waitForSelector('text=What are you training', { timeout: 8000 });
await page.screenshot({ path: join(OUT, "train-titlepicker.png") });
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Push" || b.textContent.startsWith("Push"))?.click(); });
await page.waitForTimeout(800);
await page.screenshot({ path: join(OUT, "train-active.png") });
console.log("screens ->", OUT);
await browser.close();
