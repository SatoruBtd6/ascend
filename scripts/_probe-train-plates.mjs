// PlateSheet — sheet covers nav, custom bar input, per-exercise memory.
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "train-plates", new Date().toISOString().replace(/[:.]/g, "-"));
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
await page.waitForTimeout(1500);

// Ensure an exercise exists — resume or start+add Bench Press
const hasEx = await page.evaluate(() => !!document.querySelector('button[aria-label^="More actions for"]'));
if (!hasEx) {
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Start workout")?.click(); });
  await page.waitForSelector('text=What are you training', { timeout: 8000 });
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Skip/.test(b.textContent))?.click(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Add exercise/.test(b.textContent))?.click(); });
  await page.waitForSelector('input[placeholder*="Search"]', { timeout: 8000 });
  await page.fill('input[placeholder*="Search"]', "Squat");
  await page.waitForTimeout(450);
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.querySelector(".font-semibold")?.textContent.trim() === "Squat")?.click(); });
  await page.waitForTimeout(700);
}

// Open ··· → Plate calculator on the first exercise
const openCalc = async () => {
  await page.evaluate(() => {
    const b = document.querySelector('button[aria-label^="More actions for"]');
    b?.scrollIntoView({ block: "center" });
    b?.click();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => { [...document.querySelectorAll('[role="menuitem"]')].find((b) => /Plate calculator/.test(b.textContent))?.click(); });
  await page.waitForSelector('text=Plate calculator', { timeout: 5000 });
  await page.waitForTimeout(400);
};

const sheetInfo = () => page.evaluate(() => {
  const nav = document.querySelector("#ascend-root nav").getBoundingClientRect();
  // sheet panel = the bottom card inside the fixed items-end overlay
  const overlay = [...document.querySelectorAll("#ascend-root > div")].find((d) => d.className.includes("items-end"));
  const panel = overlay?.lastElementChild || overlay;
  const pr = panel?.getBoundingClientRect();
  // what's on top at the nav's centre — backdrop should win over nav
  const hit = document.elementFromPoint(window.innerWidth / 2, nav.top + nav.height / 2);
  const barBtns = [...document.querySelectorAll("button")].filter((b) => /lb|Custom/.test(b.textContent) && b.closest('[class*="items-end"]')).map((b) => b.textContent.trim());
  const totalLbl = [...document.querySelectorAll("span")].find((sp) => /lb total/.test(sp.textContent));
  const lblR = totalLbl?.getBoundingClientRect();
  return {
    inRoot: !!overlay?.closest("#ascend-root"),
    panelBottom: pr ? Math.round(pr.bottom) : null,
    navTop: Math.round(nav.top), innerH: window.innerHeight,
    navHit: hit ? (hit.closest("nav") ? "nav" : hit.className?.toString().slice(0, 30) || hit.tagName) : null,
    barBtns,
    lblOneLine: lblR ? Math.round(lblR.height) <= 22 : null,
    panelH: pr ? Math.round(pr.height) : null,
  };
});

await openCalc();
console.log("open", JSON.stringify(await sheetInfo()));
await page.screenshot({ path: join(OUT, "plates-open.png") });

// Custom bar → type 0 → diagram + button update
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Custom")?.click(); });
await page.waitForSelector('input[aria-label="Bar weight (lb)"]', { timeout: 4000 });
await page.fill('input[aria-label="Bar weight (lb)"]', "0");
await page.waitForTimeout(350);
const customInfo = await page.evaluate(() => ({
  btn: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => /lb$|Custom/.test(t)),
  perSide: document.body.textContent.match(/(\d+(?:\.\d+)?) lb per side/)?.[0] || null,
}));
console.log("custom0", JSON.stringify(customInfo));
await page.screenshot({ path: join(OUT, "plates-custom0.png") });

// Close, reopen — bar should persist at 0 for this exercise
await page.evaluate(() => { [...document.querySelectorAll('button[aria-label="Close"]')].pop()?.click(); });
await page.waitForTimeout(400);
await openCalc();
const persistInfo = await page.evaluate(() => ({
  btn: [...document.querySelectorAll("button")].map((b) => b.textContent.trim()).filter((t) => /lb$|Custom/.test(t)),
  customInputShown: !!document.querySelector('input[aria-label="Bar weight (lb)"]'),
  saved: JSON.parse(localStorage.getItem("ascend-state") || "{}")?.plateBars || null,
}));
console.log("reopen", JSON.stringify(persistInfo));
await page.screenshot({ path: join(OUT, "plates-reopen.png") });
console.log("screens ->", OUT);
await browser.close();
