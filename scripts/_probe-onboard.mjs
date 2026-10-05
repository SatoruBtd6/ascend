// Onboarding redesign probe: drives Settings → "Replay tutorial", screenshots
// every step, checks the slide transition, pinned footer, aria-hidden mocks,
// and 320px overflow. The real-account run finishes via "Skip for now" so the
// onboarded flag is restored; the Join path is exercised under ?fixture=big
// (noPersist) so nothing is written.
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(REPO, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const OUT = join(REPO, "evidence", "onboard-7q", new Date().toISOString().replace(/[:.]/g, "-"));
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
  await page.waitForSelector('button[aria-label="Settings"]', { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1500));
  const close = page.getByRole("button", { name: "Close" });
  if (await close.count()) await close.first().click().catch(() => {});
};
const openTutorial = async (page) => {
  await page.locator('button[aria-label="Settings"]').first().click();
  await page.getByRole("button", { name: "Replay tutorial" }).click();
  await page.getByRole("button", { name: "Replay" }).last().click();
  await page.waitForSelector(".ob-scroll", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 400));
};
const layersNow = (page) => page.evaluate(() => ({
  layers: document.querySelectorAll(".ob-scroll").length,
  xs: [...document.querySelectorAll(".ob-scroll")].map((el) => el.parentElement.style.transform),
  dots: [...document.querySelectorAll(".ob-scroll")].length && [...document.querySelectorAll(".ob-scroll")].length ? undefined : undefined,
  activeDot: [...document.querySelectorAll(".ob-scroll")].length ? undefined : undefined,
}));
const stepInfo = (page) => page.evaluate(() => ({
  layers: document.querySelectorAll(".ob-scroll").length,
  xs: [...document.querySelectorAll(".ob-scroll")].map((el) => el.parentElement.style.transform),
  hidden: [...document.querySelectorAll(".ob-scroll")].map((el) => el.parentElement.getAttribute("aria-hidden")),
  headline: ([...document.querySelectorAll(".ob-scroll div")].find((d) => d.style.fontSize === "28px")?.textContent || "").trim(),
  activeDotW: [...document.querySelectorAll("div[style*='padding-top'] span")].filter((s) => s.style.borderRadius === "999px").map((s) => s.style.width),
  footerBottom: (() => { const b = [...document.querySelectorAll(".ob-scroll")].pop()?.parentElement?.querySelector(".btn"); const r = b?.getBoundingClientRect(); return r ? Math.round(r.bottom) + "/" + innerHeight : null; })(),
  overflowX: document.documentElement.scrollWidth - innerWidth,
}));
const clickPrimary = async (page) => {
  const btn = page.locator(".ob-scroll").last().locator("xpath=..").locator(".btn").first();
  const mid = await stepInfo(page); // during transition
  await btn.click();
  await new Promise((r) => setTimeout(r, 90));
  const during = await stepInfo(page);
  await new Promise((r) => setTimeout(r, 350));
  return { mid, during };
};

// ---------- Run A: real account, full walk, Skip at the end (restores flag)
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctxA.newPage();
await signIn(page, "http://localhost:5173/");
await openTutorial(page);
console.log("step0", JSON.stringify(await stepInfo(page)));
const niA = page.locator(".ob-scroll input");
if (await niA.count() && !(await niA.inputValue())) { await niA.fill("Chud"); console.log("note: name was empty — filled 'Chud' (real write on test acct)"); }
await shot(page, "step0-welcome-390");
let tr = await clickPrimary(page);
console.log("t0->1 during", JSON.stringify(tr.during));
console.log("step1", JSON.stringify(await stepInfo(page)));
await shot(page, "step1-bodytype-390");
// tile select: click the already-selected tile (no state change), then continue
const tiles = page.locator(".ob-scroll").last().locator("button").filter({ hasText: /^(Male|Female)$/ });
console.log("tiles", await tiles.count(), "first-bg", await tiles.first().evaluate((b) => b.style.background));
await tiles.first().click();
tr = await clickPrimary(page);
console.log("t1->2 during", JSON.stringify(tr.during));
console.log("step2", JSON.stringify(await stepInfo(page)));
await shot(page, "step2-stats-390");
tr = await clickPrimary(page); // Save stats
console.log("t2->3 during", JSON.stringify(tr.during));
console.log("step3", JSON.stringify(await stepInfo(page)));
await shot(page, "step3-log-390");
tr = await clickPrimary(page);
console.log("t3->4 during", JSON.stringify(tr.during));
console.log("step4", JSON.stringify(await stepInfo(page)));
await shot(page, "step4-board-390");
await page.getByRole("button", { name: "Skip for now" }).click();
await new Promise((r) => setTimeout(r, 800));
console.log("after-skip tutorialGone:", (await page.locator(".ob-scroll").count()) === 0, "settingsBtn:", await page.locator('button[aria-label="Settings"]').count());
await page.reload({ waitUntil: "domcontentloaded" });
await new Promise((r) => setTimeout(r, 2500));
console.log("after-reload tutorialGone:", (await page.locator(".ob-scroll").count()) === 0);
await ctxA.close();

// ---------- Run B: fixture, Join path + name typing
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pb = await ctxB.newPage();
await signIn(pb, "http://localhost:5173/?fixture=big");
await openTutorial(pb);
const nameInput = pb.locator(".ob-scroll input");
if (await nameInput.count()) { await nameInput.fill("Testy"); }
await clickPrimary(pb);
await clickPrimary(pb);
await clickPrimary(pb);
await clickPrimary(pb);
await pb.getByRole("button", { name: "Join the leaderboard" }).click();
await new Promise((r) => setTimeout(r, 800));
console.log("join-path tutorialGone:", (await pb.locator(".ob-scroll").count()) === 0);
await ctxB.close();

// ---------- Run C: 320px — stats + log steps, overflow + footer checks
const ctxC = await browser.newContext({ viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pc = await ctxC.newPage();
await signIn(pc, "http://localhost:5173/?fixture=big");
await openTutorial(pc);
const ni = pc.locator(".ob-scroll input");
if (await ni.count()) await ni.fill("Testy");
await clickPrimary(pc);
await clickPrimary(pc);
console.log("320 step2", JSON.stringify(await stepInfo(pc)));
await shot(pc, "step2-stats-320");
await clickPrimary(pc);
console.log("320 step3", JSON.stringify(await stepInfo(pc)));
await shot(pc, "step3-log-320");
await ctxC.close();

// ---------- Run D: 1280px desktop, one shot (log step — widest mock)
const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const pd = await ctxD.newPage();
await signIn(pd, "http://localhost:5173/?fixture=big");
await openTutorial(pd);
const nd = pd.locator(".ob-scroll input");
if (await nd.count()) await nd.fill("Testy");
await clickPrimary(pd); await clickPrimary(pd); await clickPrimary(pd);
console.log("1280 step3", JSON.stringify(await stepInfo(pd)));
await shot(pd, "step3-log-1280");
await ctxD.close();

await browser.close();
console.log("screens ->", OUT);
