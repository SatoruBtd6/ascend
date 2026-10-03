// Empty-workout state — "Same as last" chip + no paragraph.
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "train-7q", new Date().toISOString().replace(/[:.]/g, "-"));
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

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="password"]', { timeout: 15000 });
await page.fill('input[type="email"]', env.TEST_EMAIL);
await page.fill('input[type="password"]', env.TEST_PASSWORD);
await page.locator("form button").first().click();
await page.waitForSelector('nav button', { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { [...document.querySelectorAll("nav button")].find((x) => /train/i.test(x.textContent))?.click(); });
await page.waitForTimeout(1200);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Start workout")?.click(); });
await page.waitForSelector('text=What are you training', { timeout: 8000 });
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Skip/.test(b.textContent))?.click(); });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => {
  const chip = [...document.querySelectorAll("button")].find((b) => /Same as last/.test(b.textContent));
  const r = chip?.getBoundingClientRect();
  return {
    chipText: chip?.textContent.trim() || null,
    chipH: r ? Math.round(r.height) : null,
    chipW: r ? Math.round(r.width) : null,
    chipLeft: r ? Math.round(r.left) : null,
    hasParagraph: /Check off each set as you finish/.test(document.body.textContent),
    shortLine: /Only checked sets count/.test(document.body.textContent),
  };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: join(OUT, "empty-state.png") });
console.log("screens ->", OUT);
await browser.close();
