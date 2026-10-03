// Fuel 7q — landing layout, goal AnchoredMenu, compact rows, AddFood lists.
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "fuel-7q", new Date().toISOString().replace(/[:.]/g, "-"));
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
await page.evaluate(() => { [...document.querySelectorAll("nav button")].find((x) => /fuel/i.test(x.textContent))?.click(); });
await page.waitForSelector('text=Daily fuel goal', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(800);

const landing = await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const inner = sc?.firstElementChild;
  const claim = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Claim");
  const chip = [...document.querySelectorAll("button")].find((b) => /Cut|Maintain|Lean bulk|Bulk/.test(b.textContent) && b.getAttribute("aria-haspopup") === "menu");
  const cr = chip?.getBoundingClientRect();
  const meals = inner ? [...inner.querySelectorAll('[data-diag="fuel-servings"]')] : [];
  const sv = meals[0]?.getBoundingClientRect();
  return {
    pageHeightPx: inner ? inner.scrollHeight : 0,
    screens: inner ? +(inner.scrollHeight / window.innerHeight).toFixed(1) : 0,
    goalChip: chip ? { text: chip.textContent.trim(), h: Math.round(cr.height) } : null,
    claimVisible: !!claim,
    dayCardPanels: inner ? [...inner.querySelectorAll(".panel")].length : 0,
    servingsH: sv ? Math.round(sv.height) : null,
    fourChipRow: [...document.querySelectorAll("button")].filter((b) => /^(Cut|Maintain|Lean bulk|Bulk)$/.test(b.textContent.trim())).length,
  };
});
console.log("landing", JSON.stringify(landing));
await page.screenshot({ path: join(OUT, "fuel-landing.png") });

// Goal menu
if (landing.goalChip) {
  const pt = await page.evaluate(() => {
    const chip = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-haspopup") === "menu");
    const r = chip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(450);
  const menu = await page.evaluate(() => {
    const m = document.querySelector('[role="menu"]');
    if (!m) return { open: false };
    const r = m.getBoundingClientRect();
    return { open: true, items: [...m.querySelectorAll('[role="menuitem"]')].map((x) => x.textContent.trim()), right: Math.round(r.right), rightEdgeOk: r.right <= window.innerWidth - 12, inRoot: !!m.closest("#ascend-root") };
  });
  console.log("goalMenu", JSON.stringify(menu));
  await page.screenshot({ path: join(OUT, "fuel-goalmenu.png") });
  await page.evaluate(() => { [...document.querySelectorAll("#ascend-root > div")].find((d) => d.className.includes("fixed") && d.className.includes("inset-0"))?.click(); });
  await page.waitForTimeout(300);
}

// ⓘ popover
await page.evaluate(() => { document.querySelector('button[aria-label="About your calorie target"]')?.click(); });
await page.waitForTimeout(350);
const info = await page.evaluate(() => {
  const m = document.querySelector('[role="menu"]');
  return { open: !!m, text: m ? m.textContent.slice(0, 80) : null, menusOpen: document.querySelectorAll('[role="menu"]').length };
});
console.log("infoPop", JSON.stringify(info));
await page.screenshot({ path: join(OUT, "fuel-info.png") });
await page.evaluate(() => { [...document.querySelectorAll("#ascend-root > div")].find((d) => d.className.includes("fixed") && d.className.includes("inset-0"))?.click(); });
await page.waitForTimeout(250);

// Disclosures present
const disc = await page.evaluate(() => [...document.querySelectorAll('button[aria-expanded]')].map((b) => ({ t: b.textContent.trim().slice(0, 40), open: b.getAttribute("aria-expanded") })));
console.log("disclosures", JSON.stringify(disc));

// AddFood screen
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Add food/.test(b.textContent))?.click(); });
await page.waitForSelector('input[placeholder*="Search"]', { timeout: 8000 });
await page.waitForTimeout(700);
const addfood = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("button")].filter((b) => /cal · P/.test(b.textContent));
  const r0 = rows[0]?.getBoundingClientRect();
  const name0 = rows[0]?.querySelector(".font-semibold");
  return {
    recentRows: rows.length,
    rowH: r0 ? Math.round(r0.height) : null,
    firstName: name0?.textContent?.slice(0, 50) || null,
  };
});
console.log("addfood", JSON.stringify(addfood));
await page.screenshot({ path: join(OUT, "fuel-addfood.png") });

// Log one food → back on landing → compact meal row + servings tap target
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /cal · P/.test(b.textContent))?.click(); });
await page.waitForTimeout(900);
const mealRow = await page.evaluate(() => {
  const sv = document.querySelector('[data-diag="fuel-servings"]')?.getBoundingClientRect();
  const trash = document.querySelector('button[aria-label="Remove food"]')?.getBoundingClientRect();
  const row = document.querySelector('[data-diag="fuel-servings"]')?.closest("div");
  return { servingsH: sv ? Math.round(sv.height) : null, servingsW: sv ? Math.round(sv.width) : null, trashW: trash ? Math.round(trash.width) : null, trashH: trash ? Math.round(trash.height) : null, rowH: row ? Math.round(row.getBoundingClientRect().height) : null };
});
console.log("mealRow", JSON.stringify(mealRow));
await page.screenshot({ path: join(OUT, "fuel-mealrow.png") });
// clean up the logged test meal
await page.evaluate(() => document.querySelector('button[aria-label="Remove food"]')?.click());
await page.waitForTimeout(400);
console.log("screens ->", OUT);
await browser.close();
