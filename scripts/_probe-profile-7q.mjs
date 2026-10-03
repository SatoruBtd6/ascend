// Phase 7q evidence: collapsed profile, open sections, mog rows, aura drop %.
import { mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "profile-7q", new Date().toISOString().replace(/[:.]/g, "-"));
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
await page.waitForTimeout(2000);

await page.locator('button[aria-label="Open your profile"], button:has-text("Profile · achievements")').first().click();
await page.waitForTimeout(2500);

const h = await page.evaluate(() => document.documentElement.scrollHeight);
const cv = await page.evaluate(() => document.querySelectorAll("canvas").length);
await page.screenshot({ path: join(OUT, "1-collapsed.png"), fullPage: true });
console.log(`shot 1: collapsed — pageHeight ${h}px, ${cv} canvases`);

// open Auras & cosmetics
await page.locator('button:has-text("Auras & cosmetics")').first().click();
await page.waitForTimeout(1200);
await page.evaluate(() => document.querySelector('button[aria-expanded="true"]')?.scrollIntoView({ block: "start" }));
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "2-aura-spin.png") });
console.log("shot 2: auras open — spin block");

// scroll into the aura grid for the drop-rate tile shot
await page.evaluate(() => { const els = [...document.querySelectorAll("*")].filter((e) => e.textContent === "Aura Spin" && e.children.length === 0); els[els.length - 1]?.scrollIntoView({ block: "start" }); });
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "3-aura-grid.png") });
console.log("shot 3: aura grid with drop rates");

// mog-offs
await page.locator('button:has-text("Mog-offs")').first().click();
await page.waitForTimeout(900);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Mog-offs"))?.scrollIntoView({ block: "start" }); });
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, "4-mogs.png") });
console.log("shot 4: mog rows");

// expand first mog row if present
await page.evaluate(() => {
  const sec = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Mog-offs"));
  const row = sec?.parentElement?.querySelector('[aria-expanded] ~ div button, .flex.items-center.gap-2.py-2\\.5');
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "5-mog-open.png") });
console.log("shot 5: mog expanded attempt");

// comments + theme song
await page.locator('button:has-text("Theme song")').first().click().catch(() => {});
await page.locator('button:has-text("Comments")').first().click().catch(() => {});
await page.waitForTimeout(800);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim().startsWith("Comments"))?.scrollIntoView({ block: "center" }); });
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, "6-comments-song.png") });
console.log("shot 6: comments + theme song");

// achievements open
await page.locator('button:has-text("Achievements")').first().click();
await page.waitForTimeout(900);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Achievements"))?.scrollIntoView({ block: "start" }); });
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, "7-achievements.png") });
console.log("shot 7: achievements");

console.log("OUT:", OUT);
await browser.close();
