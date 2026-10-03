// Train menu stacking check — 3 exercises, open ··· on each, verify the menu
// renders above every card (elementFromPoint hits menu, not a later card) and
// flips upward near the bottom.
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "train-menu", new Date().toISOString().replace(/[:.]/g, "-"));
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
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("CONSOLE", m.text().slice(0, 300)); });

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('input[type="password"]', { timeout: 15000 });
await page.fill('input[type="email"]', env.TEST_EMAIL);
await page.fill('input[type="password"]', env.TEST_PASSWORD);
await page.locator("form button").first().click();
await page.waitForSelector('nav button', { timeout: 30000 });
await page.waitForTimeout(2000);
await page.evaluate(() => { [...document.querySelectorAll("nav button")].find((x) => /train/i.test(x.textContent))?.click(); });
await page.waitForTimeout(1500);
const hasActive = await page.evaluate(() => !!document.querySelector('button[aria-label="Workout title"]') || [...document.querySelectorAll("button")].some((b) => /Add exercise/.test(b.textContent)));
if (!hasActive) {
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent === "Start workout")?.click(); });
  await page.waitForSelector('text=What are you training', { timeout: 8000 });
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Push" || b.textContent.startsWith("Push"))?.click(); });
  await page.waitForTimeout(600);
} else console.log("resumed active workout");

// Add 3 exercises through the picker
const PICKS = ["Bench Press", "Squat", "Lat Pulldown"];
const currentCount = await page.evaluate(() => document.querySelectorAll('button[aria-label^="Drag to reorder"]').length);
for (const name of PICKS.slice(currentCount)) {
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => /Add exercise/.test(b.textContent))?.click(); });
  await page.waitForSelector('input[placeholder*="Search"]', { timeout: 8000 });
  await page.fill('input[placeholder*="Search"]', name);
  await page.waitForTimeout(450);
  const ok = await page.evaluate((name) => {
    const r = [...document.querySelectorAll("button")].find((b) => b.querySelector(".font-semibold")?.textContent.trim() === name);
    if (!r) return false;
    r.click();
    return true;
  }, name);
  console.log("picked", name, ok);
  await page.waitForTimeout(700);
}

const count = await page.evaluate(() => document.querySelectorAll('button[aria-label^="Drag to reorder"]').length);
console.log("exercise cards:", count);
await page.evaluate(() => {
  window.__log = [];
  window.__muts = [];
  document.addEventListener("click", (e) => window.__log.push(`${e.target.getAttribute?.("aria-label") || e.target.tagName} @${Math.round(e.clientY)} keep=${!!e.target.closest?.("[data-keep-menu]")}`), true);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.querySelector?.('[role="menu"]') || n.getAttribute?.("role") === "menu") window.__muts.push("menuNode+" + n.tagName); }))).observe(document.body, { childList: true, subtree: true });
});

async function openMenu(i) {
  await page.evaluate((i) => {
    const btns = [...document.querySelectorAll('button[aria-label^="More actions for"]')];
    btns[i]?.scrollIntoView({ block: i === btns.length - 1 ? "end" : "center" });
  }, i);
  await page.waitForTimeout(350);
  // real pointer click at the button's center
  await page.evaluate((i) => {
    const b = [...document.querySelectorAll('button[aria-label^="More actions for"]')][i];
    const r = b.getBoundingClientRect();
    window.__pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, i);
  const pt = await page.evaluate(() => window.__pt);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(120);
  const early = await page.evaluate(() => ({ menuNow: !!document.querySelector('[role="menu"]'), expanded: document.querySelectorAll('button[aria-expanded="true"]').length }));
  await page.waitForTimeout(400);
  const late = await page.evaluate(() => ({ menuNow: !!document.querySelector('[role="menu"]'), expanded: document.querySelectorAll('button[aria-expanded="true"]').length, log: window.__log.splice(0), muts: window.__muts.splice(0), dbg: (window.__menuDbg || []).splice(0) }));
  console.log(`   early=${JSON.stringify(early)} late=${JSON.stringify(late)}`);
  if (!early.menuNow) {
    // second click — is it a transient race or a dead button?
    await page.evaluate((i) => { [...document.querySelectorAll('button[aria-label^="More actions for"]')][i]?.click(); }, i);
    await page.waitForTimeout(300);
    const retry = await page.evaluate(() => ({ menuNow: !!document.querySelector('[role="menu"]') }));
    console.log(`   retry=${JSON.stringify(retry)}`);
  }
  return page.evaluate(() => {
    const m = document.querySelector('[role="menu"]');
    if (!m) return { open: false };
    const r = m.getBoundingClientRect();
    const items = [...m.querySelectorAll('[role="menuitem"]')];
    // elementFromPoint on the LAST menu item — the part the next card covered
    const last = items[items.length - 1]?.getBoundingClientRect();
    const hit = last ? document.elementFromPoint(last.left + last.width / 2, last.top + last.height / 2) : null;
    const anchor = [...document.querySelectorAll('button[aria-expanded="true"]')][0]?.getBoundingClientRect();
    return {
      open: true,
      items: items.map((x) => x.textContent.trim()),
      menuRect: { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left) },
      anchorBottom: anchor ? Math.round(anchor.bottom) : null,
      anchorTop: anchor ? Math.round(anchor.top) : null,
      flipped: anchor ? r.bottom < anchor.top : null,
      lastItemHit: hit ? (hit.closest('[role="menu"]') ? "menu" : hit.tagName + "." + String(hit.className).slice(0, 40)) : null,
      lastItemInViewport: last ? last.bottom < window.innerHeight : null,
    };
  });
}

for (let i = 0; i < count; i++) {
  const res = await openMenu(i);
  console.log(`menu[${i}]`, JSON.stringify(res));
  await page.screenshot({ path: join(OUT, `menu-${i}.png`) });
  await page.evaluate(() => document.body.click()); // close via backdrop? backdrop is div.fixed — click it
  await page.waitForTimeout(250);
}
console.log("screens ->", OUT);
await browser.close();
