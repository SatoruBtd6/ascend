import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const envPath = process.argv[2] || join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const EMAIL = env.TEST_EMAIL;
const PASS = env.TEST_PASSWORD;
const OUT = "C:\\Users\\rms76\\Downloads\\ascend-7a-shots";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[shots]", ...a);

async function login(page) {
  await page.waitForTimeout(800);
  if (await page.getByPlaceholder("Email").count()) {
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Password").fill(PASS);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("button", { name: "Train", exact: true }).waitFor({ timeout: 25000 });
  } else {
    await page.getByRole("button", { name: "Train", exact: true }).waitFor({ timeout: 25000 });
  }
}

async function dismiss(page) {
  const close = page.getByRole("button", { name: "Close" });
  if (await close.count()) await close.first().click().catch(() => {});
  const cancel = page.getByRole("button", { name: "Cancel" });
  if (await page.getByRole("dialog").count() && await cancel.count()) {
    await cancel.first().click().catch(() => {});
  }
  await sleep(150);
}

async function navClick(page, label) {
  await page.locator("nav").getByRole("button", { name: label, exact: true }).click();
  await sleep(400);
}

async function goTrain(page) {
  await dismiss(page);
  await navClick(page, "Train");
}

async function inWorkout(page) {
  return (await page.getByRole("button", { name: /Add exercise/ }).count()) > 0;
}

async function setTheme(page, which) {
  await dismiss(page);
  await navClick(page, "Status");
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 8000 });
  await sleep(250);
  if (which === "light" || which === "dark") {
    await page.getByRole("button", { name: which === "light" ? "Light" : "Dark", exact: true }).click();
  }
  const zesty = page.getByRole("switch", { name: "Zesty mode" });
  if (await zesty.count()) {
    const on = (await zesty.getAttribute("aria-checked")) === "true";
    if (which === "zesty" && !on) await zesty.click();
    if (which !== "zesty" && on) await zesty.click();
  }
  if (which === "custom") {
    const sw = page.getByRole("switch", { name: "Custom colors" });
    if (await sw.count() && (await sw.getAttribute("aria-checked")) !== "true") await sw.click();
  }
  await sleep(200);
  await navClick(page, "Train");
}

async function startBlank(page) {
  await dismiss(page);
  await goTrain(page);
  if (await inWorkout(page)) return;
  const start = page.getByRole("button", { name: "Start workout" });
  await start.waitFor({ timeout: 8000 });
  await start.click();
  await page.getByRole("button", { name: /Skip, no title/i }).click();
  await page.getByRole("button", { name: /Add exercise/ }).waitFor({ timeout: 8000 });
}

async function discard(page) {
  await dismiss(page);
  const d = page.getByRole("button", { name: /Discard workout|Cancel editing/ });
  if (await d.count()) {
    await d.first().click();
    await sleep(250);
    const yes = page.getByRole("dialog").getByRole("button", { name: "Discard" });
    if (await yes.count()) await yes.click();
  }
  await sleep(300);
}

async function addEx(page, name) {
  await page.getByRole("button", { name: /Add exercise/ }).click();
  await page.getByPlaceholder(/Search/).fill(name);
  await sleep(350);
  await page.getByText(name, { exact: true }).first().click();
  await sleep(450);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  log("wrote", name);
}

async function pair(page, tag, name, setup) {
  try {
    await discard(page);
    await startBlank(page);
    if (setup) await setup();
    if (!(await inWorkout(page))) throw new Error("not in workout after setup");
    await shot(page, `${tag}-${name}-dark`);
    await setTheme(page, "light");
    if (!(await inWorkout(page))) {
      await startBlank(page);
      if (setup) await setup();
    }
    await shot(page, `${tag}-${name}-light`);
    await setTheme(page, "dark");
  } catch (err) {
    log("FAIL", `${tag}-${name}`, err.message);
    await page.screenshot({ path: join(OUT, `${tag}-${name}-error.png`), fullPage: true }).catch(() => {});
  }
}

async function openExMenu(page, name) {
  const more = page.getByRole("button", { name: new RegExp(`More actions for ${name}`) });
  await more.click();
  await page.locator("[role='menu']").waitFor({ timeout: 4000 });
}

async function linkSuperset(page, after) {
  if (after) {
    await openExMenu(page, "Bench Press");
    await page.getByRole("menuitem", { name: /Superset with next/ }).click();
    await sleep(200);
    return;
  }
  await page.getByRole("button", { name: "Superset with next" }).first().click();
}

async function addWarmDrop(page, after) {
  if (after) {
    await page.getByRole("button", { name: /Add warm-up or drop set/ }).click();
    await page.getByRole("menuitem", { name: "Add warm-up set" }).click();
    await sleep(150);
    await page.getByRole("button", { name: /Add warm-up or drop set/ }).click();
    await page.getByRole("menuitem", { name: "Add drop set" }).click();
  } else {
    await page.getByRole("button", { name: "Warm-up set", exact: true }).click();
    await page.getByRole("button", { name: "Drop set", exact: true }).click();
  }
  await sleep(200);
}

async function runHost(page, tag) {
  const after = tag.startsWith("after");
  await goTrain(page);

  await pair(page, tag, "history", async () => {
    await addEx(page, "Bench Press");
  });

  await pair(page, tag, "new", async () => {
    await addEx(page, "Face Pull");
  });

  await pair(page, tag, "superset", async () => {
    await addEx(page, "Bench Press");
    await addEx(page, "Face Pull");
    await linkSuperset(page, after);
  });

  await pair(page, tag, "assisted", async () => {
    await addEx(page, "Assisted Dip Machine");
    const w = page.locator("input[type='number']").first();
    if (await w.count()) await w.fill("80");
    const r = page.locator("input[type='number']").nth(1);
    if (await r.count()) await r.fill("8");
    await sleep(200);
  });

  await pair(page, tag, "perhand", async () => {
    await addEx(page, "Dumbbell Curl");
  });

  await pair(page, tag, "cardio", async () => {
    await addEx(page, "Running");
  });

  await pair(page, tag, "warmup-drop", async () => {
    await addEx(page, "Bench Press");
    await addWarmDrop(page, after);
  });

  try {
    await discard(page);
    await goTrain(page);
    const edit = page.getByRole("button", { name: "Edit workout" }).first();
    if (!(await edit.count())) throw new Error("no Edit workout in history");
    await edit.click();
    await sleep(400);
    await shot(page, `${tag}-edit-dark`);
    await setTheme(page, "light");
    if (!(await page.getByRole("button", { name: "Cancel editing" }).count())) {
      await goTrain(page);
      await page.getByRole("button", { name: "Edit workout" }).first().click();
      await sleep(400);
    }
    await shot(page, `${tag}-edit-light`);
    await setTheme(page, "dark");
    const cancel = page.getByRole("button", { name: "Cancel editing" });
    if (await cancel.count()) await cancel.click();
  } catch (err) {
    log("FAIL", `${tag}-edit`, err.message);
    await page.screenshot({ path: join(OUT, `${tag}-edit-error.png`), fullPage: true }).catch(() => {});
  }
}

const walk = [];
function rec(step, ok, note) {
  walk.push(note ? { step, ok, note } : { step, ok });
  log(ok ? "ok" : "FAIL", step, note || "");
}

async function walkthrough(page) {
  await goTrain(page);
  await discard(page);
  await startBlank(page);
  await addEx(page, "Bench Press");

  const wInput = page.locator("input[type='number']").first();
  await wInput.fill("100");
  const setChip = page.getByRole("button", { name: /Set 1, tap to mark warm-up/ });
  rec("cycle to W", (await setChip.count()) > 0);
  await setChip.click();
  rec("cycle to W visible", (await page.getByRole("button", { name: /Warm-up set, tap/ }).count()) > 0);
  await page.getByRole("button", { name: /Warm-up set, tap/ }).click();
  rec("cycle W to D", (await page.getByRole("button", { name: /Drop set, tap/ }).count()) > 0);
  const dropW = await wInput.inputValue();
  rec("drop prefill ~80%", dropW === "80", `w=${dropW}`);
  await page.getByRole("button", { name: /Drop set, tap/ }).click();
  rec("cycle D to normal", (await page.getByRole("button", { name: /Set 1, tap/ }).count()) > 0);

  await page.getByRole("button", { name: "Add set" }).click();
  rec("add working set", (await page.getByRole("button", { name: /Set 2, tap/ }).count()) > 0);
  await page.getByRole("button", { name: /Add warm-up or drop set/ }).click();
  await page.getByRole("menuitem", { name: "Add warm-up set" }).click();
  rec("add warm-up set", (await page.getByRole("button", { name: /Warm-up set, tap/ }).count()) > 0);
  await page.getByRole("button", { name: /Add warm-up or drop set/ }).click();
  await page.getByRole("menuitem", { name: "Add drop set" }).click();
  rec("add drop set", (await page.getByRole("button", { name: /Drop set, tap/ }).count()) > 0);

  const same = page.getByRole("button", { name: "Same as last" });
  if (await same.count()) {
    await same.click();
    rec("Same as last chip", true);
  } else rec("Same as last chip", false, "not shown");

  const tgt = page.getByRole("button", { name: /\d+×\d+/ });
  if (await tgt.count()) {
    await tgt.first().click();
    rec("target chip", true);
  } else rec("target chip", false, "no suggestion");

  const past = page.locator("button[aria-expanded]").first();
  if (await past.count()) {
    await past.click();
    rec("expand past sessions", (await past.getAttribute("aria-expanded")) === "true");
  } else rec("expand past sessions", false);

  await addEx(page, "Face Pull");
  try {
    await openExMenu(page, "Bench Press");
    await shot(page, "after-menu-open");
    for (const item of ["Plate calculator", "Superset with next", "Use per hand", "Film form check", "Remove exercise"]) {
      rec(`menu: ${item}`, (await page.getByRole("menuitem", { name: new RegExp(item, "i") }).count()) > 0);
    }
    await page.getByRole("menuitem", { name: "Plate calculator" }).click();
    rec("plate sheet opens", (await page.getByText("Plate calculator").count()) > 0);
    await page.getByRole("button", { name: "Close" }).click().catch(() => {});
    await sleep(200);
  } catch (e) { rec("overflow menu", false, e.message); await dismiss(page); }

  try {
    await openExMenu(page, "Bench Press");
    await page.getByRole("menuitem", { name: "Film form check" }).click();
    rec("form check start", (await page.getByText(/Form check/).count()) > 0);
    rec("form check helper copy", (await page.getByText(/Film one set from the side/).count()) > 0);
    const file = page.locator('input[type="file"]');
    if (await file.count()) {
      await file.setInputFiles({ name: "clip.mp4", mimeType: "video/mp4", buffer: Buffer.from("not-a-video") });
      await sleep(2500);
      rec("form check result text", (await page.getByText(/Couldn't read that video|form/i).count()) > 0);
    } else rec("form check result text", false, "no file input");
    await page.getByRole("button", { name: "Close" }).click().catch(() => {});
    await sleep(200);
    const resultIcon = page.getByRole("button", { name: /Form check result for Bench Press/ });
    if (await resultIcon.count()) {
      await resultIcon.click();
      rec("form check result via header icon", (await page.getByText(/Couldn't read that video|Form check/).count()) > 0);
      await page.getByRole("button", { name: "Close" }).click().catch(() => {});
    } else rec("form check result via header icon", false, "icon only after a result with text");
  } catch (e) { rec("form check", false, e.message); await dismiss(page); }

  try {
    await page.getByRole("button", { name: "Mark set done" }).first().click();
    await sleep(150);
    await openExMenu(page, "Bench Press");
    await page.getByRole("menuitem", { name: "Remove exercise" }).click();
    rec("remove-exercise confirmation", (await page.getByText(/Completed sets in this workout will be lost/).count()) > 0);
    await page.getByRole("button", { name: "Cancel" }).click().catch(() => {});
    await sleep(150);
  } catch (e) { rec("remove confirm", false, e.message); await dismiss(page); }

  try {
    await page.getByRole("button", { name: "Save as preset" }).click();
    rec("preset naming", (await page.getByPlaceholder(/Preset name/).count()) > 0);
    await page.getByRole("button", { name: "Cancel" }).click().catch(() => {});
    await sleep(150);
  } catch (e) { rec("preset save", false, e.message); }

  try {
    await page.getByRole("button", { name: "Discard workout" }).click();
    rec("discard confirmation wording", (await page.getByText(/Aidan lock in/).count()) > 0);
    await page.getByRole("button", { name: "Discard" }).click();
    await sleep(300);
  } catch (e) { rec("discard confirm", false, e.message); await dismiss(page); await discard(page); }

  await startBlank(page);
  await addEx(page, "Bench Press");
  let firstOk = 0;
  for (let i = 0; i < 20; i++) {
    const btn = page.getByRole("button", { name: "Mark set done" }).first();
    const before = await btn.evaluate((el) => el.style.background);
    await btn.click();
    await sleep(50);
    const afterBg = await btn.evaluate((el) => el.style.background);
    if (before !== afterBg) firstOk++;
    const restX = page.getByRole("button", { name: "Dismiss rest timer" });
    if (await restX.count()) await restX.click().catch(() => {});
    await btn.click();
    await sleep(50);
  }
  rec("checkmark first press 20/20", firstOk === 20, `${firstOk}/20`);
  await page.getByRole("button", { name: "Mark set done" }).first().click();
  await sleep(400);
  rec("rest timer", (await page.getByText(/Rest/).count()) > 0);
  await shot(page, "after-rest-timer");
  await discard(page);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 380, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
page.setDefaultTimeout(12000);

log("before 4173");
await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
await login(page);
await runHost(page, "before");

log("after 5173");
await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded" });
await login(page);
await runHost(page, "after");
try { await walkthrough(page); } catch (e) { log("walkthrough crash", e.message); rec("walkthrough", false, e.message); }

await goTrain(page);
await discard(page);
await startBlank(page);
await addEx(page, "Bench Press");
await setTheme(page, "zesty");
if (!(await inWorkout(page))) { await startBlank(page); await addEx(page, "Bench Press"); }
await shot(page, "after-history-zesty");
await setTheme(page, "custom");
if (!(await inWorkout(page))) { await startBlank(page); await addEx(page, "Bench Press"); }
await shot(page, "after-history-custom");
await setTheme(page, "dark");

await navClick(page, "Status");
await page.getByRole("button", { name: "Settings" }).first().click();
await page.getByText(/Ascend version/).waitFor({ timeout: 5000 }).catch(() => {});
await shot(page, "after-settings-version");
const ver = await page.getByText(/Ascend version/).innerText().catch(() => "");
rec("APP_VERSION 7a", /version 7a/i.test(ver), ver);
const ghost = page.getByRole("switch", { name: "Ghost / test account" });
if (await ghost.count()) {
  await ghost.scrollIntoViewIfNeeded();
  rec("chud test:true (ghost)", (await ghost.getAttribute("aria-checked")) === "true");
} else rec("chud test:true (ghost)", false, "toggle not visible");
await navClick(page, "Board");
rec("chud lb:false / no board join", (await page.getByText(/Ghost mode is on|Join the board|Ghost mode: hidden/i).count()) > 0);
await shot(page, "after-board-chud");

await page.goto("http://127.0.0.1:5173/?fixture=big", { waitUntil: "domcontentloaded" });
await sleep(2000);
await goTrain(page);
await discard(page);
await startBlank(page);
await addEx(page, "Bench Press").catch((e) => log("fixture add", e.message));
await shot(page, "after-fixture-history-dark");
await setTheme(page, "light");
if (!(await inWorkout(page))) { await startBlank(page); await addEx(page, "Bench Press").catch(() => {}); }
await shot(page, "after-fixture-history-light");

await browser.close();
writeFileSync(join(OUT, "walkthrough.json"), JSON.stringify(walk, null, 2));
console.log(JSON.stringify(walk, null, 2));
console.log("shots in", OUT);
