// 7q mog rows: inject 3 fake mog records (won/lost/pending), screenshot the
// compact rows + expanded view, verify sections reset closed on fresh open,
// then delete the records.
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "mog-rows", new Date().toISOString().replace(/[:.]/g, "-"));
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

// inject fake mogs tied to this account's playerId
await page.evaluate(async () => {
  let pid = null, myName = "Chud";
  try {
    const r = await window.storage.get("ascend-state", false);
    const st = r?.value ? JSON.parse(r.value) : null;
    pid = st?.playerId; myName = st?.profile?.name || myName;
  } catch {}
  if (!pid) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("ascend-pending:")) { try { pid = JSON.parse(localStorage.getItem(k))?.state?.playerId || pid; } catch {} }
    }
  }
  if (!pid) throw new Error("no playerId");
  const px = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const face = (n, total) => ({ pucker: 15, brows: 12, stare: 14, jaw: 11, commitment: 13, total, img: px, name: n, quip: "Dead-eyed. Impressive.", t: Date.now() });
  const recs = {
    "mog:7qfake-won": { id: "7qfake-won", from: "cousin1", fromName: "Brodan", to: pid, toName: myName, t: Date.now() - 86400000, a: face("Brodan", 62), b: face(myName, 78), status: "done", winner: pid },
    "mog:7qfake-lost": { id: "7qfake-lost", from: pid, fromName: myName, to: "cousin2", toName: "Finn", t: Date.now(), a: face(myName, 41), b: face("Finn", 70), status: "done", winner: "cousin2" },
    "mog:7qfake-pend": { id: "7qfake-pend", from: "cousin1", fromName: "Brodan", to: pid, toName: myName, t: Date.now() - 3600000, a: face("Brodan", 66), b: null, status: "pending" },
  };
  for (const [k, v] of Object.entries(recs)) await window.storage.set(k, JSON.stringify(v), true);
});
await page.waitForTimeout(500);

// open profile, open Mog-offs section
await page.locator('button[aria-label="Open your profile"], button:has-text("Profile · achievements")').first().click();
await page.waitForTimeout(2000);
await page.locator('button:has-text("Mog-offs")').first().click();
await page.waitForTimeout(1000);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Mog-offs"))?.scrollIntoView({ block: "start" }); });
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, "1-mog-rows.png") });
console.log("shot 1: compact mog rows (won/lost/pending)");

// expand the first completed mog
await page.evaluate(() => {
  const rows = [...document.querySelectorAll("button[aria-expanded]")].filter((b) => !b.textContent.match(/Achievements|Auras|Body|Top lifts|Mog-offs|Comments|Theme/));
  rows[0]?.click();
});
await page.waitForTimeout(600);
await page.screenshot({ path: join(OUT, "2-mog-expanded.png") });
console.log("shot 2: expanded mog");

// fresh-open reset: leave profile, come back — all sections must be closed
await page.getByText("Train", { exact: true }).last().click();
await page.waitForTimeout(600);
await page.getByText("Status", { exact: true }).last().click();
await page.waitForTimeout(800);
await page.locator('button[aria-label="Open your profile"], button:has-text("Profile · achievements")').first().click();
await page.waitForTimeout(1500);
const openCount = await page.evaluate(() => [...document.querySelectorAll("button[aria-expanded]")].filter((b) => b.getAttribute("aria-expanded") === "true").length);
const h = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`fresh open: ${openCount} expanded sections, height ${h}px`);
await page.screenshot({ path: join(OUT, "3-fresh-open.png") });

// cleanup
await page.evaluate(async () => {
  for (const k of ["mog:7qfake-won", "mog:7qfake-lost", "mog:7qfake-pend"]) await window.storage.delete(k, true).catch(() => {});
});
console.log("fakes deleted. OUT:", OUT);
await browser.close();
