// Phase 7q Ranks probe: read-only checks on the decluttered Ranks main page
// and muscle-group page. Does NOT tap "Build me a plan" (paid API). Runs under
// ?fixture=big (noPersist) so nothing is written anyway.
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const OUT = join(REPO, "evidence", "ranks-7q", new Date().toISOString().replace(/[:.]/g, "-"));
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

const goRanks = async (page) => {
  await page.locator("nav button", { hasText: "Ranks" }).click();
  await page.waitForSelector('h1:text-is("Ranks")', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 400));
};

const pageInfo = (page) => page.evaluate(() => {
  const root = [...document.querySelectorAll("h1")].find((h) => h.textContent.trim() === "Ranks")?.closest(".space-y-4");
  const sc = document.getElementById("ascend-scroll");
  if (!root || !sc) return { err: "no root" };
  return {
    total: sc.scrollHeight,
    screens: Math.round((sc.scrollHeight / innerHeight) * 100) / 100,
    sections: [...root.children].map((c) => Math.round(c.getBoundingClientRect().height)),
    overflowX: document.documentElement.scrollWidth - innerWidth,
  };
});

const menuCount = (page) => page.locator('[role="menu"]').count();

// ---------- Run A: fixture, 390px
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctxA.newPage();
await signIn(page, "http://localhost:5173/?fixture=big");
await goRanks(page);
console.log("main-collapsed", JSON.stringify(await pageInfo(page)));
await shot(page, "ranks-main-390");

// info popovers: targets -> ladder (exclusivity), then takes-row icon (no toggle)
const iconByLabel = (l) => page.locator(`button[aria-label="${l}"]`);
await iconByLabel("How rank targets are built").click();
await new Promise((r) => setTimeout(r, 200));
console.log("popover targets open:", await menuCount(page));
await iconByLabel("About rank divisions").click();
await new Promise((r) => setTimeout(r, 200));
console.log("popover ladder open (exclusivity => should still be 1):", await menuCount(page));
await shot(page, "ranks-info-popover");

// takes-row icon: popover must open WITHOUT expanding the table
const takesRow = page.locator('div[role="button"]', { hasText: "What each rank takes" });
await iconByLabel("How the threshold numbers work").click();
await new Promise((r) => setTimeout(r, 200));
console.log("takes icon: popover", await menuCount(page), "aria-expanded still false:", (await takesRow.getAttribute("aria-expanded")) === "false");

// expand the row -> popover must close, table appears
await takesRow.click();
await new Promise((r) => setTimeout(r, 400));
console.log("takes expanded:", (await takesRow.getAttribute("aria-expanded")) === "true", "popover closed:", (await menuCount(page)) === 0);
console.log("main-expanded", JSON.stringify(await pageInfo(page)));
await shot(page, "ranks-table-expanded-390");

// ladder: row count, heights, mine-row border/glow, badge size
const ladder = await page.evaluate(() => {
  const h2 = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Rank ladder"));
  const rows = [...h2.nextElementSibling.children];
  return {
    count: rows.length,
    heights: rows.map((r) => Math.round(r.getBoundingClientRect().height)),
    badges: rows.map((r) => r.querySelector("svg")?.getAttribute("width")),
    mine: rows.map((r) => !!r.style.border && r.style.borderRadius).filter(Boolean),
    labels: [...h2.nextElementSibling.querySelectorAll("span")].map((s) => s.textContent).filter((t) => t.startsWith("You ·")),
    first: rows[0]?.textContent.slice(0, 30),
  };
});
console.log("ladder", JSON.stringify(ladder));

// group rows: whole-row nav, % text, bar
const groupRows = await page.evaluate(() => {
  const h2 = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("Muscle groups"));
  return [...h2.parentElement.querySelectorAll('div[role="button"]')].map((d) => ({
    name: d.querySelector("span")?.textContent,
    sub: [...d.querySelectorAll(".body")].map((b) => b.textContent).join("|"),
    bar: !!d.querySelector(".barfill"),
    h: Math.round(d.getBoundingClientRect().height),
  }));
});
console.log("groups", JSON.stringify(groupRows));

// lookup: focus -> grouped list; filter; pick; clear
const field = page.locator('input[aria-label="Look up any exercise"]');
await field.click();
await new Promise((r) => setTimeout(r, 300));
const listInfo = await page.evaluate(() => {
  const inp = document.querySelector('input[aria-label="Look up any exercise"]');
  const list = inp.parentElement.nextElementSibling;
  if (!list) return { err: "no list" };
  return {
    headers: [...list.querySelectorAll(".body")].map((d) => d.textContent).filter((t) => t.length < 15),
    rows: list.querySelectorAll("button").length,
    rowH: Math.round(list.querySelector("button")?.getBoundingClientRect().height || 0),
    maxH: list.style.maxHeight,
    listH: Math.round(list.getBoundingClientRect().height),
  };
});
console.log("lookup-open", JSON.stringify(listInfo));
await shot(page, "ranks-lookup-list-390");
await field.fill("press");
await new Promise((r) => setTimeout(r, 200));
const filtered = await page.evaluate(() => {
  const list = document.querySelector('input[aria-label="Look up any exercise"]').parentElement.nextElementSibling;
  return { headers: [...list.querySelectorAll(".body")].map((d) => d.textContent), rows: [...list.querySelectorAll("button")].map((b) => b.textContent) };
});
console.log("lookup-filtered", JSON.stringify(filtered));
await shot(page, "ranks-lookup-filtered-390");
await page.locator('button', { hasText: /^Incline Bench Press$/ }).first().click();
await new Promise((r) => setTimeout(r, 300));
console.log("after-pick value:", await field.inputValue(), "result row:", await page.evaluate(() => {
  const inp = document.querySelector('input[aria-label="Look up any exercise"]');
  const row = inp.closest("div.space-y-4 > div, div").parentElement.querySelector(":scope > div:last-child");
  return [...document.querySelectorAll("div")].filter((d) => d.textContent.includes("Incline Bench Press") && d.style.gridTemplateColumns).length;
}));
await shot(page, "ranks-lookup-result-390");
// clear
await page.locator('button[aria-label="Clear exercise search"]').click();
await new Promise((r) => setTimeout(r, 200));
console.log("after-clear value:", JSON.stringify(await field.inputValue()));

// ---------- Legs group page ----------
await page.locator('div[role="button"]', { hasText: /^Legs/ }).first().click();
await page.waitForSelector('h1:text-is("Legs")', { timeout: 15000 });
await new Promise((r) => setTimeout(r, 600));
const muscleInfo = () => page.evaluate(() => {
  const sc = document.getElementById("ascend-scroll");
  const h1 = [...document.querySelectorAll("h1")].pop();
  const root = h1?.closest(".space-y-4");
  return {
    title: h1?.textContent,
    total: sc.scrollHeight, screens: Math.round((sc.scrollHeight / innerHeight) * 100) / 100,
    sections: root ? [...root.children].map((c) => Math.round(c.getBoundingClientRect().height)) : [],
    photoH: Math.round(document.querySelector('img[alt*="rank"]')?.getBoundingClientRect().height || 0),
    liftRows: [...document.querySelectorAll('div[role="button"][aria-label^="Open "]')].length,
    overflowX: document.documentElement.scrollWidth - innerWidth,
  };
});
console.log("legs", JSON.stringify(await muscleInfo()));
await shot(page, "muscle-legs-390");

// preview: the badge strip is the flex row of 7 rank-badge buttons
const badges = page.locator("div.flex.justify-between.px-1 > button");
console.log("strip badges:", await badges.count());
const capBefore = await page.locator("div.relative .body").first().textContent();
const imgSrcBefore = await page.locator('img[alt*="rank"]').getAttribute("src");
await badges.nth(3).click(); // B rank
await new Promise((r) => setTimeout(r, 300));
const capPrev = await page.locator("div.relative .body").first().textContent();
const capColor = await page.locator("div.relative .body").first().evaluate((d) => d.style.color);
const imgSrcPrev = await page.locator('img[alt*="rank"]').getAttribute("src");
await badges.nth(3).click();
await new Promise((r) => setTimeout(r, 300));
const capBack = await page.locator("div.relative .body").first().textContent();
console.log("preview", JSON.stringify({ capBefore, capPrev, capColor, capBack, imgChanged: imgSrcBefore !== imgSrcPrev, imgReturned: (await page.locator('img[alt*="rank"]').getAttribute("src")) === imgSrcBefore }));

// photo info icon: opens popover, does NOT trigger preview
await page.locator('button[aria-label="How group rank works"]').click();
await new Promise((r) => setTimeout(r, 200));
const capAfterIcon = await page.locator("div.relative .body").first().textContent();
console.log("photo popover:", await menuCount(page), "caption unchanged:", capAfterIcon === capBack);
// dismiss the open popover via its backdrop (one tap closes, then rows are tappable)
await page.locator(".fixed.inset-0.z-\\[70\\]").click({ position: { x: 10, y: 10 } });
await new Promise((r) => setTimeout(r, 200));

// stats More
await page.locator('button:has-text("More")').first().click();
await new Promise((r) => setTimeout(r, 400));
console.log("stats-more expanded; popover closed:", (await menuCount(page)) === 0);
await shot(page, "muscle-stats-more-390");

// Show all
const showAll = page.locator('button', { hasText: /^Show all \d+$/ });
console.log("showAll present:", await showAll.count());
if (await showAll.count()) { await showAll.click(); await new Promise((r) => setTimeout(r, 400)); await shot(page, "muscle-showall-390"); }

// rank up
await page.locator('div[role="button"]', { hasText: "How to rank up" }).click();
await new Promise((r) => setTimeout(r, 400));
await shot(page, "muscle-rankup-390");
console.log("sterling idle row:", await page.locator('button[aria-label="Build me a plan"]').count(), "(NOT tapping it)");

// ---------- all six groups spot-check ----------
for (const g of ["Back", "Chest", "Shoulders", "Arms", "Core"]) {
  await page.locator('button[aria-label="Back"]').click();
  await page.waitForSelector('h1:text-is("Ranks")', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 300));
  await page.locator('div[role="button"]', { hasText: new RegExp(`^${g}`) }).first().click();
  await page.waitForSelector(`h1:text-is("${g}")`, { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 400));
  console.log(`group ${g}`, JSON.stringify(await muscleInfo()));
}
await page.locator('button[aria-label="Back"]').click();
await ctxA.close();

// ---------- Run B: 320px
const ctxB = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pb = await ctxB.newPage();
await signIn(pb, "http://localhost:5173/?fixture=big");
await goRanks(pb);
console.log("320 main", JSON.stringify(await pageInfo(pb)));
await shot(pb, "ranks-main-320");
await pb.locator('div[role="button"]', { hasText: /^Legs/ }).first().click();
await pb.waitForSelector('h1:text-is("Legs")', { timeout: 15000 });
await new Promise((r) => setTimeout(r, 500));
const btnRect = await pb.locator('button[aria-label="Build me a plan"]').boundingBox();
const titleRect = await pb.locator('span', { hasText: "Sterling's plan" }).boundingBox();
console.log("320 legs", JSON.stringify(await muscleInfo()));
console.log("320 sterling wrap:", btnRect && titleRect ? `btnTop=${Math.round(btnRect.top)} titleTop=${Math.round(titleRect.top)} btnW=${Math.round(btnRect.width)} dropped=${btnRect.top > titleRect.top + 20}` : "n/a");
await shot(pb, "muscle-legs-320");
await ctxB.close();

await browser.close();
console.log("screens ->", OUT);
