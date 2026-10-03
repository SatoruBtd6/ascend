// One-off: screenshot of the collapsed Crew tab at phone width (390x844).
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "crew-perf");
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
await page.waitForSelector('text=Train', { timeout: 30000 });
await page.waitForTimeout(2500);
await page.locator('nav button:has-text("Board")').first().click();
await page.waitForTimeout(1500);
await page.locator('button:has-text("Crew")').first().click();
await page.waitForTimeout(3000);
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
await page.screenshot({ path: join(OUT, `crew-collapsed-${stamp}.png`) });
// expand raid + duels for a second state shot
await page.locator('button:has-text("Raid night")').first().click();
await page.waitForTimeout(600);
await page.locator('button:has-text("Duels")').first().click();
await page.waitForTimeout(900);
await page.screenshot({ path: join(OUT, `crew-expanded-${stamp}.png`) });
console.log("OUT:", OUT);
await browser.close();
