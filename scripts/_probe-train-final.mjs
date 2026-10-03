// Train 7q final check — discard probe-created draft, measure landing,
// verify history ··· menu + expand, screenshot.
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
await page.waitForTimeout(1500);

// Discard probe-created draft so the landing (history) is reachable again
const discarded = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /Discard workout/i.test(x.textContent));
  if (!b) return false;
  b.click();
  return true;
});
if (discarded) {
  await page.waitForTimeout(400);
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((x) => /^(Discard|Yes|Confirm)/i.test(x.textContent.trim()))?.click(); });
  await page.waitForTimeout(800);
  console.log("draft discarded");
}
await page.waitForSelector('text=Start workout', { timeout: 10000 });
await page.waitForTimeout(800);

const metrics = await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const inner = sc?.firstElementChild;
  const nav = document.querySelector("#ascend-root nav");
  const hist = inner ? [...inner.querySelectorAll("h2")].find((h) => /history/i.test(h.textContent)) : null;
  const hr = hist?.getBoundingClientRect();
  return {
    pageHeightPx: inner ? inner.scrollHeight : 0,
    screens: inner ? +(inner.scrollHeight / window.innerHeight).toFixed(1) : 0,
    panels: inner ? [...inner.querySelectorAll(".panel")].length : 0,
    historyHeaderY: hr ? Math.round(hr.top + sc.scrollTop) : null,
    navBottom: nav ? nav.getBoundingClientRect().bottom : null,
  };
});
console.log(JSON.stringify(metrics));
await page.screenshot({ path: join(OUT, "train-collapsed.png") });

// History ··· menu — opens, stays open, lists items, sits above content
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-label="More actions"]')].find((x) => { const r = x.getBoundingClientRect(); return r.top > 60 && r.bottom < 780; }) || document.querySelector('button[aria-label="More actions"]');
  b?.scrollIntoView({ block: "center" });
});
await page.waitForTimeout(400);
const pt = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-label="More actions"]')].find((x) => { const r = x.getBoundingClientRect(); return r.top > 60 && r.bottom < 780; });
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.click(pt.x, pt.y);
await page.waitForTimeout(500);
const histMenu = await page.evaluate(() => {
  const m = document.querySelector('[role="menu"]');
  if (!m) return { open: false };
  const items = [...m.querySelectorAll('[role="menuitem"]')].map((x) => x.textContent.trim());
  const r = m.getBoundingClientRect();
  const last = [...m.querySelectorAll('[role="menuitem"]')].pop()?.getBoundingClientRect();
  const hit = last ? document.elementFromPoint(last.left + last.width / 2, last.top + last.height / 2) : null;
  return { open: true, items, rect: { top: Math.round(r.top), bottom: Math.round(r.bottom) }, lastItemHit: hit?.closest('[role="menu"]') ? "menu" : hit?.tagName };
});
console.log("histMenu", JSON.stringify(histMenu));
await page.screenshot({ path: join(OUT, "train-menu.png") });

// Expand a history card — exercise lines + XP breakdown appear
await page.evaluate(() => document.body.click());
await page.waitForTimeout(250);
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-expanded]')].find((x) => x.textContent.includes("·"));
  b?.scrollIntoView({ block: "center" });
  b?.click();
});
await page.waitForTimeout(500);
const expanded = await page.evaluate(() => {
  const open = [...document.querySelectorAll('button[aria-expanded="true"]')];
  const card = open[0]?.closest(".panel");
  return {
    expandedCards: open.length,
    hasXP: !!card && /XP/i.test(card.textContent),
    text: card ? card.textContent.slice(0, 220) : null,
  };
});
console.log("expanded", JSON.stringify(expanded));
await page.screenshot({ path: join(OUT, "train-expanded.png") });
console.log("screens ->", OUT);
await browser.close();
