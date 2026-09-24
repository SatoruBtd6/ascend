import { createRequire } from "node:module";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  const candidates = [
    join(process.cwd(), "node_modules", "playwright"),
    join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright"),
  ];
  for (const dir of candidates) {
    const entry = join(dir, "index.js");
    if (!existsSync(entry)) continue;
    try {
      const mod = await import(pathToFileURL(entry).href);
      if (mod.chromium) return mod.chromium;
    } catch { /* try require */ }
    try {
      const req = createRequire(join(dir, "package.json"));
      return req("playwright").chromium;
    } catch { /* next */ }
  }
  const mod = await import("playwright");
  return mod.chromium;
}
const chromium = await loadChromium();

const envPath = process.argv.slice(2).find((a) => !a.startsWith("--")) || join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const EMAIL = env.TEST_EMAIL;
const PASS = env.TEST_PASSWORD;
const BASE = process.env.ASCEND_BASE || "http://127.0.0.1:5173";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "tmp-diag");
const NO_DIAG = process.argv.includes("--no-diag");
const TAPS_ONLY = process.argv.includes("--taps-only");
const CHUD_ONLY = process.argv.includes("--chud-only");
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[harness]", ...a);
const failures = [];
const fail = (msg, extra) => { failures.push({ msg, extra }); log("FAIL", msg, extra || ""); };

async function login(page) {
  const email = page.getByPlaceholder("Email");
  const train = page.getByRole("button", { name: "Train", exact: true });
  await email.or(train).first().waitFor({ timeout: 40000 });
  if (await email.count()) {
    await email.fill(EMAIL);
    await page.getByPlaceholder("Password").fill(PASS);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await train.waitFor({ timeout: 40000 });
}

async function dismiss(page) {
  const rank = page.getByRole("dialog", { name: "Rank up" });
  if (await rank.count()) await rank.click({ force: true }).catch(() => {});
  const close = page.getByRole("button", { name: "Close" });
  if (await close.count()) await close.first().click().catch(() => {});
  const cancel = page.getByRole("button", { name: "Cancel" });
  if (await page.getByRole("dialog").count() && await cancel.count()) {
    await cancel.first().click().catch(() => {});
  }
  await sleep(120);
}

async function navClick(page, label) {
  await dismiss(page);
  const btn = page.locator("nav").getByRole("button", { name: label, exact: true });
  try {
    await btn.click({ force: true, timeout: 8000 });
  } catch {
    await page.evaluate((name) => {
      const b = [...document.querySelectorAll("nav button")].find((x) => (x.textContent || "").trim().startsWith(name));
      b?.click();
    }, label);
  }
  await sleep(350);
  await dismiss(page);
}

async function enableDiag(page) {
  await page.evaluate(() => {
    const id = window.ascendUserId || window.__ascendStorageUser || "anon";
    window.__ascendDiag?.enable(id);
  });
}

async function startPerf(page) {
  await page.evaluate(() => {
    window.__ascendRpsCount = { App: 0, Train: 0, Fuel: 0 };
    window.__ascendGaps = [];
    let prev = performance.now();
    const loop = (t) => {
      window.__ascendGaps.push(t - prev);
      prev = t;
      if (!window.__ascendPerfStop) requestAnimationFrame(loop);
    };
    window.__ascendPerfStop = false;
    requestAnimationFrame(loop);
  });
}

async function readPerf(page) {
  return page.evaluate(() => {
    window.__ascendPerfStop = true;
    const gaps = window.__ascendGaps || [];
    const stalls = gaps.filter((g) => g > 50);
    const rps = window.__ascendRpsCount || { App: 0, Train: 0, Fuel: 0 };
    const sec = Math.max(0.001, (gaps.length ? gaps.reduce((a, b) => a + b, 0) : 1) / 1000);
    return {
      frames: gaps.length,
      stallN: stalls.length,
      stallMax: Math.round(stalls.reduce((m, g) => Math.max(m, g), 0)),
      rps: {
        App: Math.round(rps.App / sec),
        Train: Math.round(rps.Train / sec),
        Fuel: Math.round(rps.Fuel / sec),
      },
      counts: rps,
    };
  });
}

async function dumpDiag(page) {
  return page.evaluate(() => window.__ascendDiag?.dump?.() || "");
}

async function throttle(page, rate) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true }).catch(() => {});
  return cdp;
}

async function startBlank(page) {
  await dismiss(page);
  await navClick(page, "Train");
  if (await page.getByRole("button", { name: /Add exercise/ }).count()) return;
  const start = page.getByRole("button", { name: "Start workout" });
  await start.waitFor({ timeout: 15000 });
  await start.click({ force: true });
  const skip = page.getByRole("button", { name: /Skip, no title/i });
  await skip.waitFor({ timeout: 15000 });
  await skip.click({ force: true });
  await page.getByRole("button", { name: /Add exercise/ }).waitFor({ timeout: 15000 });
}

async function discard(page) {
  await dismiss(page);
  await navClick(page, "Train");
  const d = page.getByRole("button", { name: /Discard workout|Cancel editing/ });
  if (await d.count()) {
    await d.first().click({ force: true });
    await sleep(250);
    const yes = page.getByRole("dialog").getByRole("button", { name: "Discard" });
    if (await yes.count()) await yes.click({ force: true });
  }
  await sleep(250);
}

async function addEx(page, name) {
  await page.getByRole("button", { name: /Add exercise/ }).click({ force: true });
  const search = page.getByPlaceholder(/Search/);
  await search.waitFor({ timeout: 10000 });
  await search.fill(name);
  await sleep(300);
  await page.getByText(name, { exact: true }).first().click({ force: true });
  await search.waitFor({ state: "hidden", timeout: 15000 });
  await page.getByRole("button", { name: /Add exercise/ }).waitFor({ timeout: 15000 });
}

function isDoneColor(bg) {
  return /79,\s*209,\s*139|57,\s*230,\s*143|18,\s*168,\s*96|#39e68f|#12a860/i.test(bg || "");
}

async function setupFourByFour(page) {
  await discard(page);
  if (await page.getByRole("button", { name: /Add exercise/ }).count() && !(await page.getByRole("button", { name: "Start workout" }).count())) {
    if (!(await page.getByRole("button", { name: /Discard workout/ }).count())) {
      await addEx(page, "Bench Press");
    }
    await discard(page);
  }
  await startBlank(page);
  const names = ["Face Pull", "Hip Thrust", "Leg Extension", "Calf Raise"];
  let prev = 0;
  for (const name of names) {
    await addEx(page, name);
    for (let guard = 0; guard < 80; guard++) {
      const have = await page.evaluate((prevN) => document.querySelectorAll("[data-diag-check]").length - prevN, prev);
      if (have === 4) break;
      const ok = await page.evaluate(({ prevN, wantMore }) => {
        const checks = document.querySelectorAll("[data-diag-check]").length;
        const haveNow = checks - prevN;
        if (haveNow === 4) return true;
        const btns = [...document.querySelectorAll("button")];
        const add = btns.filter((b) => (b.textContent || "").trim() === "Add set");
        const del = btns.filter((b) => (b.getAttribute("aria-label") || "") === "Delete set");
        const target = wantMore ? add[add.length - 1] : del[del.length - 1];
        if (!target) return false;
        target.scrollIntoView({ block: "center", inline: "nearest" });
        target.click();
        return true;
      }, { prevN: prev, wantMore: have < 4 });
      if (!ok) throw new Error(`setupFourByFour no ${have < 4 ? "Add set" : "Delete set"} for ${name}`);
      await page.waitForFunction(
        ({ prevN, want }) => document.querySelectorAll("[data-diag-check]").length - prevN === want,
        { prevN: prev, want: have < 4 ? have + 1 : have - 1 },
        { timeout: 8000 }
      ).catch(() => {});
      await sleep(40);
    }
    prev = await page.evaluate(() => document.querySelectorAll("[data-diag-check]").length);
  }
  const n = await page.evaluate(() => document.querySelectorAll("[data-diag-check]").length);
  if (n !== 16) throw new Error(`setupFourByFour got ${n} checkmarks`);
}

async function runTaps(page, label) {
  const checks = page.locator("[data-diag-check]");
  const n = await checks.count();
  log(label, "checkmarks", n);
  if (n < 16) { fail(`${label} expected 16 checkmarks`, n); return { ok: 0, miss: 100, n, fallbackCount: 0, fallbacks: [] }; }
  const expected = Array.from({ length: 16 }, () => false);
  let ok = 0, miss = 0, frozen = 0;
  const fallbacks = [];
  const t0 = Date.now();
  for (let i = 0; i < 100; i++) {
    const idx = i % 16;
    expected[idx] = !expected[idx];
    const gap = 50 + ((i * 37) % 351);
    await sleep(gap);
    try {
      const want = expected[idx];
      const loc = checks.nth(idx);
      // Measured taps must use real pointer/touch + Playwright actionability (not DOM .click()).
      await loc.scrollIntoViewIfNeeded();
      try {
        await loc.tap({ timeout: 8000 });
      } catch (tapErr) {
        const error = String(tapErr?.message || tapErr).split("\n")[0];
        fallbacks.push({ i, error });
        log(label, "tap fallback", { i, error });
        await loc.click({ timeout: 8000 });
      }
      const bg = await page.evaluate(async ({ i, wantGreen }) => {
        const el = document.querySelectorAll("[data-diag-check]")[i];
        if (!el) return "";
        const isGreen = (c) => /79,\s*209,\s*139|57,\s*230,\s*143|18,\s*168,\s*96|#39e68f|#12a860/i.test(c || "");
        const tEnd = performance.now() + 1200;
        while (performance.now() < tEnd) {
          const c = getComputedStyle(el).backgroundColor;
          if (isGreen(c) === wantGreen) return c;
          await new Promise((r) => requestAnimationFrame(r));
        }
        return getComputedStyle(el).backgroundColor;
      }, { i: idx, wantGreen: want });
      const done = isDoneColor(bg);
      frozen = 0;
      if (done === expected[idx]) ok += 1;
      else {
        miss += 1;
        expected[idx] = done;
        if (miss <= 8) log(label, "mismatch", { i, idx, done });
      }
    } catch (e) {
      miss += 1;
      frozen += 1;
      expected[idx] = !expected[idx];
      fail(`${label} tap ${i}`, e.message.split("\n")[0]);
      if (frozen >= 3) {
        fail(`${label} main thread froze after ${i + 1} taps`, { ok, miss });
        break;
      }
    }
    if (i % 20 === 19) log(label, "progress", { i: i + 1, ok, miss });
  }
  log(label, "taps", { ok, miss, ms: Date.now() - t0, n, fallbackCount: fallbacks.length });
  if (miss) fail(`${label} lost/wrong taps`, { ok, miss });
  return { ok, miss, n, ms: Date.now() - t0, fallbackCount: fallbacks.length, fallbacks };
}

const TEXT60 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ12345678";

async function typeAndDelete(page, locator, label, { numeric = false } = {}) {
  const loc = locator.first();
  if (!(await loc.count())) { fail(`${label} missing`); return { label, missing: true }; }
  await loc.tap({ force: true }).catch(() => loc.click());
  await loc.fill("");
  const typed = numeric ? "1234567890".repeat(6) : TEXT60;
  const t0 = Date.now();
  let worst = 0, last = t0;
  const onRaf = [];
  await page.evaluate(() => {
    window.__ascendGaps = [];
    let prev = performance.now();
    const loop = (t) => {
      window.__ascendGaps.push(t - prev);
      prev = t;
      if (window.__ascendGaps.length < 400) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  if (typeof loc.pressSequentially === "function") await loc.pressSequentially(typed, { delay: 8 });
  else await loc.type(typed, { delay: 8 });
  const afterType = await loc.inputValue();
  for (let i = 0; i < typed.length; i++) {
    await page.keyboard.press("Backspace");
    const now = Date.now();
    worst = Math.max(worst, now - last);
    last = now;
    if (i % 3 === 2) await sleep(33);
  }
  const afterDel = await loc.inputValue();
  const gaps = await page.evaluate(() => window.__ascendGaps || []);
  const frameGap = gaps.reduce((m, x) => Math.max(m, x), 0);
  const result = {
    label,
    typedLen: typed.length,
    afterTypeLen: afterType.length,
    afterType,
    afterDel,
    typeOk: afterType === typed,
    delOk: afterDel === "",
    worstKeyGap: worst,
    worstFrameGap: Math.round(frameGap),
    ms: Date.now() - t0,
  };
  log("input", result);
  if (!result.typeOk) fail(`${label} type mismatch`, { expected: typed.length, got: afterType.length, value: afterType.slice(0, 80) });
  if (!result.delOk) fail(`${label} delete leftover`, afterDel);
  return result;
}

async function runFuel(page, label) {
  const results = [];
  await dismiss(page);
  await navClick(page, "Fuel");
  await sleep(400);
  await page.getByRole("button", { name: /Add food/ }).click();
  await page.getByPlaceholder(/Search/).waitFor({ timeout: 8000 });
  results.push(await typeAndDelete(page, page.getByPlaceholder(/Search/), `${label} food-search`));
  const first = page.locator("button").filter({ hasText: /cal ·/ }).first();
  if (await first.count()) {
    await first.click();
    await sleep(500);
  } else {
    await page.getByRole("button", { name: /Back to Fuel/ }).click().catch(() => {});
  }
  const servings = page.getByLabel("Servings");
  if (await servings.count()) {
    results.push(await typeAndDelete(page, servings, `${label} servings`, { numeric: true }));
  } else {
    fail(`${label} servings missing`);
  }
  await page.getByRole("button", { name: /Add food/ }).click();
  await page.getByRole("button", { name: /Recipe/ }).click();
  await page.getByPlaceholder(/Meal name/).waitFor({ timeout: 8000 });
  results.push(await typeAndDelete(page, page.getByPlaceholder(/Meal name/), `${label} meal-name`));
  results.push(await typeAndDelete(page, page.getByPlaceholder(/2 scoops whey/), `${label} meal-desc`));
  results.push(await typeAndDelete(page, page.getByPlaceholder(/Search ingredients/), `${label} ing-search`));
  await page.getByPlaceholder(/Search ingredients/).fill("oat");
  await sleep(400);
  const ing = page.getByRole("button").filter({ hasText: /cal/ }).first();
  if (await ing.count()) {
    await ing.click();
    await sleep(300);
    const qty = page.getByLabel("Quantity");
    if (await qty.count()) results.push(await typeAndDelete(page, qty, `${label} ing-qty`, { numeric: true }));
  }
  await page.getByRole("button", { name: "Back" }).click().catch(() => {});
  await page.getByRole("button", { name: /Back to Fuel/ }).click().catch(() => {});
  const tplBtn = page.getByRole("button", { name: /Day templates/ });
  if (await tplBtn.count()) {
    await tplBtn.click();
    const saveTpl = page.getByRole("button", { name: /Save this day as a template/ });
    if (await saveTpl.count()) {
      await saveTpl.click();
      results.push(await typeAndDelete(page, page.getByPlaceholder(/Template name/), `${label} tpl-name`));
    }
  }
  return results;
}

async function runAccount(browser, url, label, rate) {
  log("run", label, "cpu", rate, url);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await login(page);
    await sleep(rate >= 6 ? 4000 : 1200);
    await dismiss(page);
    if (!NO_DIAG) await enableDiag(page);
    await throttle(page, rate);

    await setupFourByFour(page);
    await startPerf(page);
    const taps = await runTaps(page, `${label} cpu${rate} taps`);
    const perf = await readPerf(page);
    log("perf", label, "cpu" + rate, perf);
    let fuel = null;
    if (!TAPS_ONLY) fuel = await runFuel(page, `${label} cpu${rate}`);
    const dump = NO_DIAG ? "" : await dumpDiag(page);
    if (dump) writeFileSync(join(OUT, `${label}-cpu${rate}.json`), dump);
    const header = (() => { try { return dump ? JSON.parse(dump).header : { diag: false }; } catch { return null; } })();
    log("diag header", header);
    return { taps, fuel, header, perf };
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const out = { at: new Date().toISOString(), base: BASE, version: "7c", noDiag: NO_DIAG, tapsOnly: TAPS_ONLY, chudOnly: CHUD_ONLY, runs: [] };
  const accounts = (TAPS_ONLY || CHUD_ONLY) ? [["chud", BASE]] : [["chud", BASE], ["fixture", `${BASE}/?fixture=big`]];
  for (const rate of [6, 4]) {
    for (const [account, url] of accounts) {
      // Fixture + CPU throttle makes each tap multi-second; 4×/6× both need a long wall budget.
      const budget = account === "fixture" ? 900000 : 300000;
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`run timeout ${budget / 1000}s`)), budget);
      });
      const run = runAccount(browser, url, account, rate);
      try {
        out.runs.push({ account, rate, ...(await Promise.race([run, timeout])) });
        clearTimeout(timer);
      } catch (e) {
        clearTimeout(timer);
        // Let the orphaned run finish closing its context before the next account starts.
        await run.catch(() => {});
        fail(`${account} cpu${rate} crashed`, e.message.split("\n")[0]);
        out.runs.push({ account, rate, crashed: e.message.split("\n")[0] });
      }
    }
  }
  out.failures = failures;
  writeFileSync(join(OUT, "harness-summary.json"), JSON.stringify(out, null, 2));
  await browser.close();
  log("done", failures.length ? `${failures.length} failures` : "no harness failures");
  if (failures.length) {
    for (const f of failures) log(" -", f.msg, f.extra || "");
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
