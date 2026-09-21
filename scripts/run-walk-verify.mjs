import { createRequire } from "node:module";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
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
  return (await import("playwright")).chromium;
}
const chromium = await loadChromium();

const envPath = process.argv[2] || join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const EMAIL = env.TEST_EMAIL;
const PASS = env.TEST_PASSWORD;
const BASE = process.env.ASCEND_BASE || "http://127.0.0.1:5173";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "tmp-diag", "7c-run");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[7c]", ...a);

async function login(page) {
  await page.waitForTimeout(800);
  if (await page.getByPlaceholder("Email").count()) {
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Password").fill(PASS);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("button", { name: "Train", exact: true }).waitFor({ timeout: 40000 });
  } else {
    await page.getByRole("button", { name: "Train", exact: true }).waitFor({ timeout: 40000 });
  }
}

async function dismiss(page) {
  const close = page.getByRole("button", { name: "Close" });
  if (await close.count()) await close.first().click().catch(() => {});
  const cancel = page.getByRole("button", { name: "Cancel" });
  if (await page.getByRole("dialog").count() && await cancel.count()) await cancel.first().click().catch(() => {});
  await sleep(120);
}

async function nav(page, label) {
  await dismiss(page);
  await page.locator("nav").getByRole("button", { name: label, exact: true }).click({ force: true });
  await sleep(350);
}

async function setTheme(page, which) {
  await nav(page, "Status");
  await page.getByRole("button", { name: "Settings" }).first().click();
  await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 8000 });
  await sleep(200);
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
  } else {
    const sw = page.getByRole("switch", { name: "Custom colors" });
    if (await sw.count() && (await sw.getAttribute("aria-checked")) === "true" && which !== "zesty") await sw.click();
  }
  await sleep(200);
}

async function goRunHub(page) {
  await nav(page, "Status");
  const open = page.getByRole("button", { name: "Open run and steps" });
  if (await open.count()) {
    await open.click();
  } else {
    await nav(page, "Train");
    await page.getByRole("button", { name: "Run" }).first().click();
  }
  await page.getByRole("heading", { name: "Run & steps" }).waitFor({ timeout: 8000 });
  await sleep(250);
}

async function shot(page, name) {
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  log("shot", name);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 380, height: 844 }, isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.goto(`${BASE}/?simrun=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await login(page);
await dismiss(page);

await nav(page, "Status");
await page.getByRole("button", { name: "Settings" }).first().click();
await page.getByRole("heading", { name: "Settings" }).waitFor({ timeout: 8000 });
const kbLine = await page.locator("text=/State \\d+ KB/").first().innerText();
log("settings kb", kbLine);
if (/State 0 KB/.test(kbLine) && !/State [1-9]/.test(kbLine)) {
  console.error("FAIL settings still 0 KB");
  process.exitCode = 1;
}
await shot(page, "settings-kb");

for (const theme of ["dark", "light", "zesty", "custom"]) {
  if (process.env.SKIP_THEMES) break;
  await setTheme(page, theme);
  await goRunHub(page);
  await shot(page, `hub-${theme}`);
  await page.getByRole("button", { name: "Walk", exact: true }).first().click();
  await page.getByRole("button", { name: /Start walk/i }).click();
  await page.getByRole("tab", { name: "Walking" }).waitFor({ timeout: 8000 });
  await shot(page, `live-${theme}`);
  await page.getByRole("button", { name: "Finish" }).click();
  await page.getByRole("button", { name: "Discard" }).click();
  const confirm = page.getByRole("button", { name: "Discard", exact: true });
  if (await confirm.count() > 1) await confirm.last().click().catch(() => {});
  else if (await page.getByRole("button", { name: "Discard" }).count()) await page.getByRole("button", { name: "Discard" }).last().click().catch(() => {});
  await sleep(400);
}

await setTheme(page, "dark");
await goRunHub(page);
await page.getByRole("button", { name: "Walk", exact: true }).first().click();
await page.getByRole("button", { name: /Start walk/i }).click();
await page.getByRole("tab", { name: "Walking" }).waitFor({ timeout: 8000 });
await page.getByText("DEV GPS sim").waitFor({ timeout: 8000 });
await sleep(500);
const jog = page.getByRole("button", { name: "Jog 3 m/s" });
if (await jog.count()) await jog.click({ force: true });
await sleep(6000);
await page.getByRole("button", { name: "Screen-off gap" }).click({ force: true });
await sleep(400);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('[role="tab"]')].find((b) => (b.textContent || "").includes("Running"));
  btn?.click();
});
await sleep(300);
log("mode tab", await page.locator('[role="tab"][aria-selected="true"]').innerText().catch(() => "?"));
if (await page.getByRole("button", { name: "Jog 3 m/s" }).count()) {
  await page.getByRole("button", { name: "Jog 3 m/s" }).click({ force: true });
}
await sleep(6000);
await page.getByRole("button", { name: "Screen-off gap" }).click({ force: true });
await sleep(300);
await page.getByRole("button", { name: "Screen-off gap" }).click({ force: true });
await sleep(400);
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('[role="tab"]')].find((b) => (b.textContent || "").includes("Walking"));
  btn?.click();
});
await sleep(6000);
await page.getByRole("button", { name: "Screen-off gap" }).click({ force: true });
await sleep(400);
await page.getByRole("button", { name: "Finish" }).click({ force: true });
await sleep(500);
await shot(page, "summary-mixed");
await page.getByRole("button", { name: /Save/i }).click({ force: true });
const tooShort = page.getByText("under 0.05 miles");
if (await tooShort.count()) {
  log("WARN still under 0.05, cancel and keep going");
  await page.getByRole("button", { name: "Cancel" }).click({ force: true });
  await page.getByRole("button", { name: "Keep going" }).click({ force: true });
  await sleep(1500);
  await page.getByRole("button", { name: "Screen-off gap" }).click({ force: true });
  await sleep(300);
  await page.getByRole("button", { name: "Finish" }).click({ force: true });
  await sleep(400);
  await shot(page, "summary-mixed");
  await page.getByRole("button", { name: /Save/i }).click({ force: true });
}
await page.getByRole("button", { name: /Save/i }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
await sleep(800);
await shot(page, "hub-after-save");
const mixed = page.getByText("Run/Walk");
if (await mixed.count()) {
  await mixed.first().click({ force: true });
  await sleep(800);
  await shot(page, "detail-mixed");
  log("opened Run/Walk detail");
  const body = await page.locator("body").innerText();
  if (!/Run .+ mi/.test(body) || !/Walk .+ mi/.test(body)) log("WARN detail missing breakdown");
} else {
  log("WARN no Run/Walk in history yet");
}

const workouts = await page.evaluate(() => {
  const s = window.__ascendState || null;
  return s;
});
log("window state probe", workouts ? "present" : "absent");

await browser.close();
log("done", OUT);
