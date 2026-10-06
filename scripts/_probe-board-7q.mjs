// Phase 7q Board/Feed verification probe. READ-ONLY: storage.set/delete are
// stubbed for shared keys after sign-in, so Feed's built-in housekeeping,
// Leave, trash and join-publish cannot write even if triggered. Leave's
// confirm dialog is opened and CANCELLED only.
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const OUT = join(REPO, "evidence", "board-7q", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(OUT, { recursive: true });

let chromium;
for (const dir of ["node_modules/playwright-core", "node_modules/playwright"]) {
  try { const m = await import(pathToFileURL(join(REPO, dir, "index.js")).href); if (m.chromium || m.default?.chromium) { chromium = m.chromium || m.default.chromium; break; } } catch {}
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const shot = async (page, name) => { await page.screenshot({ path: join(OUT, name + ".png") }); console.log("shot", name); };
const signIn = async (page, url) => {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', env.TEST_EMAIL);
  await page.fill('input[type="password"]', env.TEST_PASSWORD);
  await page.locator("form button").first().click();
  await page.waitForSelector("nav", { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const close = page.getByRole("button", { name: "Close" });
  if (await close.count()) await close.first().click().catch(() => {});
};
// Block every shared write; local reads and unshared writes pass through.
const noWrites = (page) => page.evaluate(() => {
  const st = window.storage;
  if (!st || st.__probeStub) return;
  const s0 = st.set?.bind(st), d0 = st.delete?.bind(st);
  st.set = async (k, v, shared, ...r) => shared ? { __stub: true } : s0?.(k, v, shared, ...r);
  st.delete = async (k, shared, ...r) => shared ? { __stub: true } : d0?.(k, shared, ...r);
  st.__probeStub = true;
});

const measure = () => page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const h1 = [...document.querySelectorAll("h1")].find((h) => h.textContent.trim() === "Leaderboard");
  const root = h1?.closest(".space-y-4");
  if (!root || !sc) return { err: "no root" };
  return {
    total: sc.scrollHeight,
    screens: Math.round((sc.scrollHeight / innerHeight) * 100) / 100,
    canvases: root.querySelectorAll("canvas").length,
    sections: [...root.children].map((c) => ({ h: Math.round(c.getBoundingClientRect().height), txt: c.textContent.slice(0, 30).replace(/\s+/g, " ") })),
    overflowX: document.documentElement.scrollWidth - innerWidth,
  };
});

const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await signIn(page, "http://localhost:5174/?fixture=big");
await noWrites(page);

await page.locator("nav button", { hasText: "Board" }).click();
await page.waitForSelector('h1:text-is("Leaderboard")', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 3000));

console.log("BOARD month", JSON.stringify(await measure()));
await shot(page, "board-month-390");

// segmented control height
console.log("seg", JSON.stringify(await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Feed");
  const inner = b?.querySelector("span");
  return { hit: Math.round(b.getBoundingClientRect().height), visual: Math.round(inner?.getBoundingClientRect().height || 0) };
})));

// ---------- metric selector ----------
await page.locator('button[aria-label="Board metric"]').click();
await new Promise((r) => setTimeout(r, 300));
await shot(page, "board-metric-menu");
const menuItems = await page.locator('[role="menu"] button').allTextContents();
console.log("metric menu items:", JSON.stringify(menuItems));
await page.locator('[role="menu"] button', { hasText: /^Points$/ }).click();
await new Promise((r) => setTimeout(r, 500));
console.log("BOARD points", JSON.stringify(await measure()));
await shot(page, "board-points-390");

// info icon on Points -> paragraph + tap-anyone
await page.locator('button[aria-label^="About the"]').click();
await new Promise((r) => setTimeout(r, 300));
console.log("info popover (points):", JSON.stringify(await page.locator('[role="menu"]').last().textContent()));
await shot(page, "board-info-points");
// open selector while info open: backdrop eats the first tap (closes info),
// second tap opens the selector — same exclusivity pattern as shipped tabs
await page.locator(".fixed.inset-0.z-\\[70\\]").click({ position: { x: 10, y: 10 } });
await new Promise((r) => setTimeout(r, 200));
console.log("menus open after backdrop (expect 0):", await page.locator('[role="menu"]').count());
await page.locator('button[aria-label="Board metric"]').click();
await new Promise((r) => setTimeout(r, 300));
console.log("menus open after selector tap (expect 1):", await page.locator('[role="menu"]').count());
await page.locator('[role="menu"] button', { hasText: /^Muscles$/ }).click();
await new Promise((r) => setTimeout(r, 500));
const musc = await page.evaluate(() => {
  const pills = [...document.querySelectorAll("button")].filter((b) => ["Legs", "Back", "Chest", "Shoulders", "Arms", "Core"].includes(b.textContent.trim()));
  return { count: pills.length, inView: pills.map((b) => { const r = b.getBoundingClientRect(); return r.right <= innerWidth && r.left >= 0; }), hits: pills.map((b) => Math.round(b.getBoundingClientRect().height)) };
});
console.log("BOARD muscles", JSON.stringify(await measure()), JSON.stringify(musc));
await shot(page, "board-muscles-390");

// muscles info popover has the group line
await page.locator('button[aria-label^="About the"]').click();
await new Promise((r) => setTimeout(r, 300));
console.log("info popover (muscle):", JSON.stringify(await page.locator('[role="menu"]').last().textContent()));
await page.locator(".fixed.inset-0.z-\\[70\\]").click({ position: { x: 10, y: 10 } });
await new Promise((r) => setTimeout(r, 200));

// ---------- month prize row ----------
await page.locator('button[aria-label="Board metric"]').click();
await new Promise((r) => setTimeout(r, 300));
await page.locator('[role="menu"] button', { hasText: /^Month$/ }).click();
await new Promise((r) => setTimeout(r, 500));
const prize = page.locator('button[aria-label*="prize"]');
const prizeInfo = await prize.evaluate((b) => {
  const cv = b.querySelector("canvas");
  const box = b.querySelector("div");
  return { expanded: b.getAttribute("aria-expanded"), canvasW: cv?.width, canvasH: cv?.height, canvasBox: cv ? Math.round(cv.getBoundingClientRect().width) : 0, rowH: Math.round(b.getBoundingClientRect().height) };
});
console.log("prize row collapsed:", JSON.stringify(prizeInfo));
await prize.click();
await new Promise((r) => setTimeout(r, 500));
console.log("prize expanded:", await prize.getAttribute("aria-expanded"), "| text:", await page.evaluate(() => [...document.querySelectorAll(".body")].map((d) => d.textContent).find((t) => t.includes("wears it"))));
await shot(page, "board-prize-expanded");
await prize.click();
await new Promise((r) => setTimeout(r, 400));

// ---------- join (fixture, noPersist + stubbed writes) then ⋯ menu ----------
const joinBtn = page.locator("button", { hasText: /^Join as / });
if (await joinBtn.count()) {
  await joinBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  console.log("joined; options btn:", await page.locator('button[aria-label="Board options"]').count());
  await page.locator('button[aria-label="Board options"]').click();
  await new Promise((r) => setTimeout(r, 300));
  await shot(page, "board-options-menu");
  console.log("menu items:", JSON.stringify(await page.locator('[role="menu"]').last().textContent()));
  // open Leave confirm -> Cancel only
  await page.locator('[role="menu"] button', { hasText: "Leave the board" }).click();
  await new Promise((r) => setTimeout(r, 300));
  await shot(page, "board-leave-confirm");
  console.log("dialog text:", JSON.stringify(await page.locator('[role="dialog"]').textContent()));
  await page.locator('[role="dialog"] button', { hasText: /^Cancel$/ }).click();
  await new Promise((r) => setTimeout(r, 300));
  console.log("after cancel, still joined (options btn present):", await page.locator('button[aria-label="Board options"]').count());
  await shot(page, "board-joined-month-390");
}

// ---------- Feed ----------
await page.locator("button", { hasText: /^Feed$/ }).first().click();
await page.waitForSelector(".feedrow", { timeout: 30000 });
await new Promise((r) => setTimeout(r, 500));
const feed = await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const rows = [...document.querySelectorAll(".feedrow")];
  const headers = [...document.querySelectorAll(".feedrow")].length ? [...document.querySelectorAll(".panel .uppercase")].map((d) => d.textContent.trim()) : [];
  const more = [...document.querySelectorAll("button")].find((b) => /Show more/.test(b.textContent));
  return {
    total: sc.scrollHeight, screens: Math.round((sc.scrollHeight / innerHeight) * 100) / 100,
    count: rows.length, headers, canvases: document.querySelectorAll("canvas").length,
    moreLabel: more?.textContent.trim(), allTappable: rows.every((r) => r.getAttribute("role") === "button"),
    trashHit: (() => { const t = document.querySelector('button[aria-label="Delete post"]'); return t ? Math.round(t.getBoundingClientRect().width) : null; })(),
  };
});
console.log("FEED", JSON.stringify(feed));
await shot(page, "feed-390");

// scroll down, tap a row -> profile; back -> feed + scroll restored
await page.evaluate(() => { document.getElementById("ascend-scroll").scrollTop = 700; });
await new Promise((r) => setTimeout(r, 300));
const yBefore = await page.evaluate(() => document.getElementById("ascend-scroll").scrollTop);
const row = page.locator(".feedrow").nth(8);
const rowText = await row.locator(".font-bold").first().textContent();
await row.click();
await new Promise((r) => setTimeout(r, 1500));
const onProfile = await page.evaluate(() => [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()).pop());
console.log("row tap ->", JSON.stringify({ rowText, onProfile, yBefore }));
await shot(page, "feed-profile");
await page.locator('button[aria-label="Back"]').click();
await page.waitForSelector(".feedrow", { timeout: 30000 });
await new Promise((r) => setTimeout(r, 800));
const back = await page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const feedVisible = !!document.querySelector(".feedrow");
  return { feedVisible, scrollY: Math.round(sc.scrollTop) };
});
console.log("back to feed:", JSON.stringify(back), "(expected ~", yBefore, ")");
await shot(page, "feed-back-390");

// Show more -> 40 rows
await page.locator('button', { hasText: /Show more/ }).click();
await new Promise((r) => setTimeout(r, 500));
console.log("after show more:", await page.locator(".feedrow").count());
await shot(page, "feed-showmore-390");

// Crew sanity: segmented control looks identical, crew content mounts
await page.locator("button", { hasText: /^Crew$/ }).first().click();
await new Promise((r) => setTimeout(r, 1500));
await shot(page, "crew-390");
console.log("crew rendered:", await page.evaluate(() => document.querySelector("#ascend-scroll")?.textContent.slice(0, 80)));

await ctx.close();

// ---------- 320px ----------
const ctxB = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pb = await ctxB.newPage();
await signIn(pb, "http://localhost:5174/?fixture=big");
await noWrites(pb);
await pb.locator("nav button", { hasText: "Board" }).click();
await pb.waitForSelector('h1:text-is("Leaderboard")', { timeout: 20000 });
await new Promise((r) => setTimeout(r, 2500));
await pb.locator('button[aria-label="Board metric"]').click();
await new Promise((r) => setTimeout(r, 300));
await pb.locator('[role="menu"] button', { hasText: /^Muscles$/ }).click();
await new Promise((r) => setTimeout(r, 500));
const m320 = await pb.evaluate(() => {
  const pills = [...document.querySelectorAll("button")].filter((b) => ["Legs", "Back", "Chest", "Shoulders", "Arms", "Core"].includes(b.textContent.trim()));
  return { count: pills.length, allInView: pills.every((b) => { const r = b.getBoundingClientRect(); return r.right <= innerWidth; }), overflowX: document.documentElement.scrollWidth - innerWidth };
});
console.log("320 muscles:", JSON.stringify(m320));
await shot(pb, "board-muscles-320");
await pb.locator('button[aria-label="Board metric"]').click();
await new Promise((r) => setTimeout(r, 300));
await pb.locator('[role="menu"] button', { hasText: /^Month$/ }).click();
await new Promise((r) => setTimeout(r, 400));
await shot(pb, "board-month-320");
await ctxB.close();

await browser.close();
console.log("screens ->", OUT);
