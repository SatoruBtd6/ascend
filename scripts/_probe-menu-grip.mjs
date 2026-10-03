// Phone-width evidence shots for the Train exercise menu + drag grip.
// Signs in as the test account, builds a workout through the real UI,
// captures: (1) grip column, (2) opaque exercise menu, (3) mid-drag state.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "menu-grip", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(OUT, { recursive: true });

const require = createRequire(import.meta.url);
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
// sign in (test account)
await page.waitForSelector('input[type="password"]', { timeout: 15000 });
await page.fill('input[type="email"]', env.TEST_EMAIL);
await page.fill('input[type="password"]', env.TEST_PASSWORD);
await page.locator("form button").first().click();
await page.waitForSelector('text=Train', { timeout: 30000 });
await page.waitForTimeout(2500);

// go to Train, start a titled workout
await page.getByText("Train", { exact: true }).last().click();
await page.waitForTimeout(800);
await page.getByText("Start workout", { exact: false }).click().catch(() => {});
await page.waitForTimeout(600);
await page.getByText("Push", { exact: true }).first().click().catch(() => {});
await page.waitForTimeout(600);

// add exercises via the picker — enough rows that the list can scroll
for (const name of ["Bench Press", "Squat", "Stairmaster", "Deadlift", "Overhead Press", "Face Pull", "Rowing Machine"]) {
  await page.getByText("Add exercise", { exact: false }).click();
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="Search"]', name);
  await page.waitForTimeout(700);
  await page.getByText(new RegExp(`^${name}$`), { exact: false }).first().click().catch(async () => {
    await page.keyboard.press("Enter");
  });
  await page.waitForTimeout(500);
}

await page.screenshot({ path: join(OUT, "1-grips.png"), fullPage: false });
console.log("shot 1: grips");

// open the first exercise's overflow menu
await page.locator('button[aria-label^="More actions for"]').first().click();
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, "2-menu.png") });
console.log("shot 2: menu open");
// close via the scrim
await page.locator("div.fixed.inset-0").first().click({ force: true }).catch(() => page.mouse.click(30, 760));
await page.waitForTimeout(400);

// mid-drag: synthetic pointer events on the first grip, pull down ~90px
await page.evaluate(async () => {
  const grip = document.querySelector('button[aria-label^="Drag to reorder"]');
  const card = grip.closest(".panel");
  window.__dragCard = card;
  const r = grip.getBoundingClientRect();
  const opts = (y) => ({ bubbles: true, pointerId: 7, pointerType: "touch", clientX: r.x + r.width / 2, clientY: y, isPrimary: true });
  grip.dispatchEvent(new PointerEvent("pointerdown", opts(r.y + r.height / 2)));
  await new Promise((r2) => setTimeout(r2, 60));
  for (let i = 1; i <= 6; i++) { card.dispatchEvent(new PointerEvent("pointermove", opts(r.y + r.height / 2 + i * 15))); await new Promise((r2) => setTimeout(r2, 40)); }
});
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "3-mid-drag.png") });
console.log("shot 3: mid drag");
await page.evaluate(() => {
  window.__dragCard?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch", clientX: 100, clientY: 400 }));
});
await page.waitForTimeout(500);
await page.screenshot({ path: join(OUT, "4-after-drop.png") });
console.log("shot 4: after drop");

// warm-up/drop menu — same opaque treatment
await page.locator('button[aria-label="Add warm-up or drop set"]').first().click();
await page.waitForTimeout(400);
await page.screenshot({ path: join(OUT, "5-addmenu.png") });
console.log("shot 5: warm-up/drop menu");
await page.mouse.click(30, 200); // scrim close
await page.waitForTimeout(300);

// auto-scroll: pick up the first grip, park the pointer 70px above the nav
// bar's top edge, hold, and verify the page scrolls while the row stays held
await page.evaluate(async () => {
  const grip = document.querySelector('button[aria-label^="Drag to reorder"]');
  const card = grip.closest(".panel");
  window.__dragCard = card;
  const r = grip.getBoundingClientRect();
  const navTop = document.querySelector("#ascend-root nav")?.getBoundingClientRect().top ?? innerHeight;
  const opts = (y) => ({ bubbles: true, pointerId: 9, pointerType: "touch", clientX: r.x + r.width / 2, clientY: y, isPrimary: true });
  grip.dispatchEvent(new PointerEvent("pointerdown", opts(r.y + r.height / 2)));
  await new Promise((r2) => setTimeout(r2, 60));
  // drag to just inside the bottom edge zone and park
  card.dispatchEvent(new PointerEvent("pointermove", opts(navTop - 70)));
});
const sc0 = await page.evaluate(() => window.scrollY);
await page.waitForTimeout(1400); // let the rAF auto-scroll run
const sc1 = await page.evaluate(() => window.scrollY);
await page.screenshot({ path: join(OUT, "6-autoscroll.png") });
console.log(`shot 6: auto-scroll — scrollY ${Math.round(sc0)} -> ${Math.round(sc1)} (+${Math.round(sc1 - sc0)}px while held)`);
await page.evaluate(() => {
  const d = window.__dragCard;
  d?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, pointerType: "touch", clientX: 100, clientY: innerHeight - 150 }));
});
await page.waitForTimeout(400);
const sc2 = await page.evaluate(() => window.scrollY);
await page.screenshot({ path: join(OUT, "7-after-autoscroll.png") });
console.log(`shot 7: after drop — scrollY ${Math.round(sc2)}`);

console.log("OUT:", OUT);
await browser.close();
