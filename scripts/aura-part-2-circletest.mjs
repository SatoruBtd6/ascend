// Circle-mode editing + drag-perf verification.
// 1) Switch editor to "Avatar ring" mode, drag an inferno slider, confirm the
//    write lands under layers.N.circle (not the base value) and markers show.
// 2) Synthetic 1.5s drag on a heavy aura: count stage remounts (canvas
//    replacements) — before was ~12 at 120ms throttle, expect ~5 at 300ms.
// 3) makeAura cost: full spec vs clamped preview spec.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const base = "http://localhost:5173";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1200, height: 1100 } })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

const selectAura = async (a) => {
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate((id) => [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${id}`))?.click(), a);
  await new Promise((r) => setTimeout(r, 900));
};

// --- 1) circle-mode editing ---
await selectAura("inferno");
const circRes = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Avatar ring");
  if (!btn) return { error: "no Avatar ring toggle" };
  btn.click();
  await sleep(400);
  const banner = [...document.querySelectorAll("div")].some((d) => d.textContent.includes("avatar-ring overrides"));
  // find the flame layer's "Size — min" slider (generic field for circle view)
  const rows = [...document.querySelectorAll("label")];
  const szRow = rows.find((l) => l.querySelector("span")?.textContent.trim().startsWith("Size"));
  if (!szRow) return { error: "no Size row in circle mode", banner };
  const range = szRow.querySelector('input[type="range"]');
  const num = szRow.querySelector('input[type="number"]');
  const before = num.value;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(range, "70"); range.dispatchEvent(new Event("input", { bubbles: true }));
  await sleep(400);
  range.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  range.dispatchEvent(new Event("change", { bubbles: true }));
  await sleep(500);
  return { banner, before, after: num.value };
});
console.log("circle-mode:", JSON.stringify(circRes));

// --- 2) remount count during a synthetic drag ---
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Base (all modes)");
  btn?.click();
});
await new Promise((r) => setTimeout(r, 300));
await selectAura("blacksun");
const remounts = await page.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // observe canvas removals inside the stage column (left column div)
  let removed = 0;
  const mo = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.removedNodes) {
      if (n instanceof HTMLCanvasElement) removed++;
      else if (n instanceof Element && n.querySelector?.("canvas")) removed++;
    }
  });
  mo.observe(document.body, { subtree: true, childList: true });
  const row = [...document.querySelectorAll("label")].find((l) => l.querySelector("span")?.textContent.trim() === "Wobble");
  const range = row?.querySelector('input[type="range"]');
  if (!range) return { error: "no Wobble slider" };
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  range.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  const t0 = performance.now();
  let v = 0.05;
  while (performance.now() - t0 < 1500) {
    v = v >= 0.35 ? 0.05 : v + 0.03;
    setter.call(range, String(v));
    range.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(30);
  }
  range.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
  await sleep(600);
  mo.disconnect();
  return { remounts: removed };
});
console.log("drag remounts:", JSON.stringify(remounts));

// --- 3) makeAura cost: full vs clamped ---
const cost = await page.evaluate(async () => {
  const mod = await import("/src/auras/AuraCanvas.jsx");
  const spec = JSON.parse(JSON.stringify(mod.AURA_FX.blacksun));
  const clamp = JSON.parse(JSON.stringify(spec));
  for (const L of clamp.layers) if (typeof L.n === "number" && L.n > 24) L.n = 24;
  mod.AURA_FX.__full = spec; mod.AURA_FX.__clamp = clamp;
  const run = (id) => {
    const cv = document.createElement("canvas");
    const inst = mod.makeAura(cv, { aura: id, w: 160, h: 160, mode: "circle", ringR: 52 });
    const t0 = performance.now();
    for (let i = 0; i < 60; i++) inst.frame(1 / 30);
    return Math.round((performance.now() - t0) * 10) / 10;
  };
  // warmup + measure
  run("__full"); run("__clamp");
  return { full60f: run("__full"), clamp60f: run("__clamp") };
});
console.log("makeAura+60 frames:", JSON.stringify(cost));
await browser.close();
console.log("done");
