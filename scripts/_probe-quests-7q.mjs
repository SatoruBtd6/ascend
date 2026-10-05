// Quests 7q — before/after layout at 390px, expand/popover/stopPropagation
// checks, claimable + claimed states, 320px challenge rows. Adds progress to
// one quest on the TEST account and claims it — intentional, it's the test acct.
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "quests-7q", new Date().toISOString().replace(/[:.]/g, "-"));
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
await page.evaluate(() => { [...document.querySelectorAll("nav button")].find((x) => /quest/i.test(x.textContent))?.click(); });
await page.waitForSelector('text=Daily quests', { timeout: 10000 });
await page.waitForTimeout(900);

const sleep = (ms) => page.waitForTimeout(ms);
const snap = (name) => page.screenshot({ path: join(OUT, name) });
const questRows = () => page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const inner = sc?.firstElementChild;
  return {
    contentScrollHeight: inner ? inner.scrollHeight : 0,
    screens: inner ? +(inner.scrollHeight / window.innerHeight).toFixed(2) : 0,
    panels: inner ? inner.querySelectorAll(".panel").length : 0,
    rows: [...inner.querySelectorAll('[role="button"][aria-expanded]')].map((r) => ({ h: Math.round(r.getBoundingClientRect().height), open: r.getAttribute("aria-expanded") })),
  };
});

// 1. collapsed landing measurement
const m0 = await questRows();
console.log("collapsed", JSON.stringify(m0));
await snap("quests-collapsed.png");
await page.evaluate(() => { document.getElementById("ascend-scroll").scrollTop = 99999; });
await sleep(300);
await snap("quests-bottom.png");
await page.evaluate(() => { document.getElementById("ascend-scroll").scrollTop = 0; });
await sleep(200);

// 2. expand first quest row; check only-one-open + controls visible
const clickRow = (i) => page.evaluate((i) => {
  const rows = [...document.querySelectorAll('[role="button"][aria-expanded]')];
  const r = rows[i]?.getBoundingClientRect();
  if (!r) return null;
  const el = document.elementFromPoint(r.left + 30, r.top + 20);
  el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  return true;
}, i);
await clickRow(0);
await sleep(400);
const exp1 = await questRows();
console.log("expanded row0", JSON.stringify(exp1.rows));
await snap("quests-expanded.png");

// 3. open second row → first must close
await clickRow(1);
await sleep(400);
const exp2 = await questRows();
console.log("expanded row1", JSON.stringify(exp2.rows));
const oneOpen = exp2.rows.filter((r) => r.open === "true").length === 1 && exp2.rows[1]?.open === "true";
console.log("oneOpenAtATime", oneOpen);

// 4. header info popover: opens, shows merged text, dismisses on expand
await page.evaluate(() => document.querySelector('button[aria-label="About daily quests"]')?.click());
await sleep(350);
const headInfo = await page.evaluate(() => {
  const m = document.querySelector('[role="menu"]');
  return m ? { text: m.textContent.slice(0, 220) } : null;
});
console.log("headInfo", JSON.stringify(headInfo));
await snap("quests-headinfo.png");
// expanding a row below the popover must close it (menu overlaps row0 — click last row)
const lastIdx = m0.rows.length - 1;
await clickRow(lastIdx);
await sleep(400);
const headClosed = await page.evaluate(() => !document.querySelector('[role="menu"]'));
const openAfter = await page.evaluate(() => [...document.querySelectorAll('[role="button"][aria-expanded]')].map((r) => r.getAttribute("aria-expanded")));
console.log("expandClosesPopover", headClosed, "rows", JSON.stringify(openAfter));

// 5. per-quest info icon: opens popover, does NOT toggle the row
const before = await page.evaluate(() => [...document.querySelectorAll('[role="button"][aria-expanded]')].map((r) => r.getAttribute("aria-expanded")));
await page.evaluate(() => { [...document.querySelectorAll('button[aria-label^="How "]')][0]?.click(); });
await sleep(350);
const qInfo = await page.evaluate(() => {
  const m = document.querySelector('[role="menu"]');
  const rows = [...document.querySelectorAll('[role="button"][aria-expanded]')].map((r) => r.getAttribute("aria-expanded"));
  return { open: !!m, text: m ? m.textContent.slice(0, 160) : null, rows };
});
console.log("qInfo", JSON.stringify(qInfo), "rowToggled:", JSON.stringify(before) !== JSON.stringify(qInfo.rows));
await snap("quests-qinfo.png");

// 6. reroll button must not toggle row (reroll is disabled on progressed quests — use row with progress 0)
await page.evaluate(() => { document.querySelector('[role="menu"]')?.closest?.("div"); });
await page.evaluate(() => { const b = [...document.querySelectorAll("#ascend-root > div")].find((d) => d.className.includes("fixed") && d.className.includes("inset-0")); b?.click(); });
await sleep(250);
const rerollCheck = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[role="button"][aria-expanded]')];
  const r = rows[0];
  const btn = r.querySelector('button[aria-label="Reroll quest"]');
  const was = r.getAttribute("aria-expanded");
  btn?.click();
  return { was, now: r.getAttribute("aria-expanded"), disabled: btn?.disabled };
});
console.log("rerollNoToggle", JSON.stringify(rerollCheck));

// 7. claimable: expand first reps quest and tap chips to finish, then Claim
await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[role="button"][aria-expanded]')];
  const r = rows.find((row) => /reps/.test(row.textContent));
  if (r && r.getAttribute("aria-expanded") !== "true") r.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await sleep(400);
const claimRes = await page.evaluate(async () => {
  const row = [...document.querySelectorAll('[role="button"][aria-expanded="true"]')][0];
  if (!row) return { err: "no open row" };
  for (let i = 0; i < 60; i++) {
    const m = row.textContent.match(/([\d,]+) \/ ([\d,]+)/);
    if (m && +m[1].replace(/,/g, "") >= +m[2].replace(/,/g, "")) break;
    const chip = [...row.querySelectorAll("button")].filter((b) => /^\+/.test(b.textContent.trim())).pop();
    chip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 60));
  }
  const m = row.textContent.match(/([\d,]+) \/ ([\d,]+)/);
  const claim = [...row.querySelectorAll("button")].find((b) => b.textContent.trim() === "Claim");
  return { progress: m ? `${m[1]}/${m[2]}` : "?", claimVisible: !!claim };
});
console.log("claimable", JSON.stringify(claimRes));
await snap("quests-claimable.png");
const claimed = await page.evaluate(() => {
  const claim = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Claim");
  claim?.click();
  return !!claim;
});
await sleep(600);
const afterClaim = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("#ascend-scroll div")].filter((d) => /Claimed ·/.test(d.textContent) && d.children.length <= 3);
  return { claimClicked: undefined, claimedRows: rows.length, claimedText: rows[0]?.textContent.trim().slice(0, 80) };
});
console.log("claimed", JSON.stringify({ clicked: claimed, ...afterClaim }));
await snap("quests-claimed.png");

// 8. 320px challenge rows
const ctx2 = await browser.newContext({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p2 = await ctx2.newPage();
await p2.goto("http://localhost:5173/", { waitUntil: "domcontentloaded" });
await p2.waitForSelector('input[type="password"]', { timeout: 15000 });
await p2.fill('input[type="email"]', env.TEST_EMAIL);
await p2.fill('input[type="password"]', env.TEST_PASSWORD);
await p2.locator("form button").first().click();
await p2.waitForSelector('nav button', { timeout: 30000 });
await p2.waitForTimeout(1500);
await p2.evaluate(() => { [...document.querySelectorAll("nav button")].find((x) => /quest/i.test(x.textContent))?.click(); });
await p2.waitForSelector('text=Weekly challenges', { timeout: 10000 });
await p2.waitForTimeout(700);
const c320 = await p2.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  sc.scrollTop = 99999;
  const golds = [...document.querySelectorAll("#ascend-scroll span")].filter((x) => /XP$/.test(x.textContent.trim()));
  const overlap = golds.map((g) => {
    const r = g.getBoundingClientRect();
    const prev = g.previousElementSibling?.getBoundingClientRect?.();
    return { xp: g.textContent.trim(), left: Math.round(r.left), titleRight: prev ? Math.round(prev.right) : null };
  });
  return { w: window.innerWidth, contentScrollHeight: sc.firstElementChild?.scrollHeight, xp: overlap };
});
console.log("width320", JSON.stringify(c320));
await p2.screenshot({ path: join(OUT, "quests-320.png"), fullPage: true });
await ctx2.close();

console.log("screens ->", OUT);
await browser.close();
