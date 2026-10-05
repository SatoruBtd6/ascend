// Log 7q probe — measures the decluttered Log tab. Read-only: day selection,
// expand/collapse, view toggles, sheet open/close, localStorage reads. The
// fixture mode (?fixture=big) is noPersist, so nothing writes.
import { readFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const OUT = join(REPO, "evidence", "log-7q", new Date().toISOString().replace(/[:.]/g, "-"));
mkdirSync(OUT, { recursive: true });

let chromium;
for (const dir of ["node_modules/playwright-core", "node_modules/playwright"]) {
  try { const m = await import(pathToFileURL(join(REPO, dir, "index.js")).href); if (m.chromium || m.default?.chromium) { chromium = m.chromium || m.default.chromium; break; } } catch {}
}
if (!chromium) chromium = (await import("playwright-core")).chromium;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const BASE = "http://localhost:5173";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(width = 390, extra = "") {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto(`${BASE}/${extra}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="password"]', { timeout: 20000 });
  await page.fill('input[type="email"]', env.TEST_EMAIL);
  await page.fill('input[type="password"]', env.TEST_PASSWORD);
  await page.locator("form button").first().click();
  await page.waitForSelector("nav button", { timeout: 60000 });
  await sleep(1800);
  const close = page.getByRole("button", { name: "Close" });
  if (await close.count()) await close.first().click().catch(() => {});
  await page.locator("nav").getByRole("button", { name: "Log", exact: true }).click({ force: true });
  await sleep(700);
  return { ctx, page };
}

const sectionHs = () => {
  const sc = document.querySelector("#ascend-scroll");
  const text = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  const calPanel = [...document.querySelectorAll(".panel")].find((p) => p.querySelector(".grid-cols-7"));
  const legend = [...document.querySelectorAll("div")].find((d) => (d.textContent || "").startsWith("Workout") && d.className.includes("flex-wrap"));
  const h2s = [...document.querySelectorAll("h2")];
  const monthH2 = h2s.find((x) => /This month|^[A-Z][a-z]+( \d{4})?$/.test(text(x)));
  const weightH2 = h2s.find((x) => text(x).startsWith("Weight"));
  const dayWrap = calPanel?.parentElement?.children[2]; // element after the calendar panel
  return {
    total: Math.round(sc.scrollHeight), screens: +(sc.scrollHeight / innerHeight).toFixed(2),
    cal: Math.round(calPanel?.getBoundingClientRect().height || 0),
    legend: legend ? Math.round(legend.getBoundingClientRect().height) : null,
    day: dayWrap ? Math.round(dayWrap.getBoundingClientRect().height) : null,
    month: monthH2 ? Math.round((monthH2.nextElementSibling?.getBoundingClientRect().height || 0) + monthH2.getBoundingClientRect().height) : null,
    monthH2: text(monthH2),
    weight: weightH2 ? Math.round((weightH2.nextElementSibling?.getBoundingClientRect().height || 0) + weightH2.getBoundingClientRect().height) : null,
    calTitle: text([...document.querySelectorAll(".panel .font-bold")][0]),
  };
};

async function measure(page, tag) {
  const m = await page.evaluate(sectionHs);
  console.log(tag, JSON.stringify(m));
  return m;
}

const tapRow = async (page, label) => {
  const b = page.locator("button").filter({ hasText: new RegExp(`^${label}`) }).first();
  if (!(await b.count())) return false;
  await b.click({ force: true });
  await sleep(420);
  return true;
};

// ---------- Real account ----------
{
  const { ctx, page } = await newPage(390);
  await measure(page, "real month");
  await page.screenshot({ path: join(OUT, "log-month.png"), fullPage: true });

  // Week view: toggle, arrow back twice, verify sel stays inside the strip.
  await tapRow(page, "Week");
  await measure(page, "real week");
  const selVisible = async () => page.evaluate(() => {
    const strip = [...document.querySelectorAll(".grid-cols-7 button")];
    return !!strip.find((b) => (b.getAttribute("style") || "").includes("47, 140, 255"));
  });
  const weekCheck = [];
  const prevBtn = page.locator('button[aria-label="Previous month"]').first();
  const nextBtn = page.locator('button[aria-label="Next month"]').first();
  for (const dir of [prevBtn, prevBtn, nextBtn]) {
    await dir.click({ force: true });
    await sleep(350);
    weekCheck.push(await selVisible());
  }
  console.log("week sel-in-strip after arrows:", JSON.stringify(weekCheck));
  // Toggle week->month->week: sel must remain inside strip.
  await tapRow(page, "Month");
  await prevBtn.click({ force: true });
  await sleep(250);
  await prevBtn.click({ force: true });
  await sleep(250);
  await tapRow(page, "Week");
  const backIn = await selVisible();
  console.log("sel visible after month-nav + week toggle:", backIn);
  await page.screenshot({ path: join(OUT, "log-week.png"), fullPage: true });

  // localStorage persisted?
  const persisted = await page.evaluate(() => localStorage.getItem("ascend-logview"));
  console.log("persisted view:", persisted);

  // Day card More: toggling it must not open a sheet; workout row must not toggle it.
  await tapRow(page, "Month"); // back to month for consistency
  const moreProbe = await page.evaluate(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const mores = [...document.querySelectorAll("button[aria-expanded]")];
    const moreBtn = mores[0];
    if (!moreBtn) return { err: "no More row" };
    moreBtn.click(); await sleep(300);
    const sheetAfterMore = !!document.querySelector(".fixed.inset-0 h3");
    const expanded = moreBtn.getAttribute("aria-expanded");
    // workout row tap must not collapse More
    const woRow = [...document.querySelectorAll("button")].find((b) => (b.textContent || "").includes("Details ›"));
    let sheetAfterWo = false, expandedAfterWo = expanded;
    if (woRow) { woRow.click(); await sleep(300); sheetAfterWo = !!document.querySelector(".fixed.inset-0 h3"); expandedAfterWo = moreBtn.getAttribute("aria-expanded"); }
    // close sheet via X
    const x = document.querySelector('.fixed.inset-0 button[aria-label="Close"]');
    if (x) { x.click(); await sleep(300); }
    return { expanded, sheetAfterMore, sheetAfterWo, expandedAfterWo, sheetClosedAfterX: !document.querySelector(".fixed.inset-0 h3") };
  });
  console.log("moreProbe", JSON.stringify(moreProbe));
  await measure(page, "real day-more-open");
  await tapRow(page, "More");

  // Details sheet on the first workout row of the selected day
  const woBtn = page.locator("button").filter({ hasText: "Details ›" }).first();
  if (await woBtn.count()) {
    await woBtn.click({ force: true });
    await sleep(400);
    const sheet = await page.evaluate(() => {
      const sh = [...document.querySelectorAll(".fixed.inset-0")].find((x) => x.querySelector("h3"));
      if (!sh) return null;
      const scroll = sh.querySelector(".overflow-y-auto.flex-1");
      const inner = scroll || sh.querySelector("div.overflow-y-auto");
      return {
        title: sh.querySelector("h3")?.textContent,
        subtitle: sh.querySelector("h3")?.nextElementSibling?.textContent,
        scrollH: inner ? Math.round(inner.scrollHeight) : null,
        rows: sh.querySelectorAll("[style*='border-top']").length,
        pinnedFooter: !!scroll && !!scroll.nextElementSibling,
        footerBtn: sh.textContent.includes("Save as my preset") || sh.textContent.includes("Saved to presets"),
      };
    });
    console.log("real sheet", JSON.stringify(sheet));
    await page.screenshot({ path: join(OUT, "log-sheet.png") });
    await page.evaluate(() => document.querySelector('.fixed.inset-0 button[aria-label="Close"]')?.click());
    await sleep(300);
  }
  await ctx.close();
}

// ---------- Big fixture ----------
{
  const { ctx, page } = await newPage(390, "?fixture=big");
  await measure(page, "big month today");
  // a workout day exists every day in the fixture — today already has one
  await page.screenshot({ path: join(OUT, "log-big-month.png"), fullPage: true });
  const woBtn = page.locator("button").filter({ hasText: "Details ›" }).first();
  if (await woBtn.count()) {
    await woBtn.click({ force: true });
    await sleep(400);
    const sheet = await page.evaluate(() => {
      const sh = [...document.querySelectorAll(".fixed.inset-0")].find((x) => x.querySelector("h3"));
      const scroll = sh?.querySelector(".overflow-y-auto.flex-1");
      return sh ? { title: sh.querySelector("h3")?.textContent, scrollH: scroll ? Math.round(scroll.scrollHeight) : null, pinned: !!scroll, footerVisible: (() => { const b = [...sh.querySelectorAll("button")].find((x) => /preset/i.test(x.textContent || "")); if (!b) return null; const r = b.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; })() } : null;
    });
    console.log("big sheet (6-exercise)", JSON.stringify(sheet));
    await page.screenshot({ path: join(OUT, "log-big-sheet.png") });
    await page.evaluate(() => document.querySelector('.fixed.inset-0 button[aria-label="Close"]')?.click());
    await sleep(300);
  }
  await tapRow(page, "More"); // day card More
  await measure(page, "big day-more-open");
  await page.screenshot({ path: join(OUT, "log-big-more.png"), fullPage: true });
  await ctx.close();
}

// ---------- Legend at both widths + fresh-storage view default ----------
for (const w of [390, 320]) {
  const { ctx, page } = await newPage(w);
  const leg = await page.evaluate(() => {
    const legend = [...document.querySelectorAll("div")].find((d) => (d.textContent || "").startsWith("Workout") && d.className.includes("flex-wrap"));
    return legend ? { h: Math.round(legend.getBoundingClientRect().height), lines: Math.round(legend.getBoundingClientRect().height / 16), text: legend.textContent.trim() } : null;
  });
  const defView = await page.evaluate(() => localStorage.getItem("ascend-logview") || "(unset→month)");
  console.log(`legend@${w}`, JSON.stringify(leg), "storedView:", defView);
  if (w === 320) await page.screenshot({ path: join(OUT, "log-320.png"), fullPage: true });
  await ctx.close();
}

// ---------- Quests identical-render check (Tap/CHIP moved to primitives) ----------
{
  const { ctx, page } = await newPage(390);
  await page.locator("nav").getByRole("button", { name: "Quests", exact: true }).click({ force: true });
  await sleep(700);
  const q = await page.evaluate(() => {
    const sc = document.querySelector("#ascend-scroll");
    const rows = [...document.querySelectorAll('[role="button"][aria-expanded]')].map((r) => Math.round(r.getBoundingClientRect().height));
    return { total: Math.round(sc.scrollHeight), rows };
  });
  console.log("quests render check", JSON.stringify(q));
  await ctx.close();
}

// ---------- Tutorial step (fixture = noPersist, so the replay flag never saves) ----------
{
  const { ctx, page } = await newPage(390, "?fixture=big");
  await page.locator("nav").getByRole("button", { name: "Status", exact: true }).click({ force: true });
  await sleep(500);
  // Open Settings via the gear, find Replay tutorial, click it (writes onboarded:false on test acct then reload to check? — replay only sets a flag; we click Cancel if a confirm appears... it asks. Do it and confirm.)
  const gear = page.locator('button[aria-label="Settings"]');
  if (await gear.count()) {
    await gear.click({ force: true });
    await sleep(600);
    const rep = page.getByRole("button", { name: /Replay tutorial/ });
    if (await rep.count()) {
      await rep.click({ force: true });
      await sleep(300);
      const dlg = page.getByRole("dialog").getByRole("button", { name: "Replay" });
      if (await dlg.count()) await dlg.click({ force: true });
      await sleep(800);
      // Step through onboarding to step 3 (the new Log step)
      for (let i = 0; i < 3; i++) {
        const cont = page.getByRole("button", { name: /Continue|Save stats/ });
        if (await cont.count()) await cont.first().click({ force: true });
        await sleep(400);
      }
      const stepText = await page.evaluate(() => document.body.textContent.includes("Flip the calendar between Month and Week"));
      console.log("tutorial Log step shown:", stepText, "| replay-write-note: this replay set onboarded=false on the test acct — finishing flow to restore");
      if (stepText) await page.screenshot({ path: join(OUT, "tutorial-log-step.png") });
      // Finish the remaining steps so onboarded goes back to true.
      for (let i = 0; i < 2; i++) {
        const b = page.getByRole("button", { name: /Continue|Join the leaderboard|Skip for now/ });
        if (await b.count()) await b.first().click({ force: true });
        await sleep(400);
      }
    }
  }
  await ctx.close();
}

await browser.close();
console.log("screens ->", OUT);
