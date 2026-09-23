// Measure slider-drag cost in the dev aura gallery at 4x CPU throttle.
// Counts canvas remounts (MutationObserver), sync JS per input event,
// long tasks during a real mouse drag, and AuraLoop frame stats.
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

const AURA = process.env.AURA || "huntersmoon";
const DRAG_MS = 1500;
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
const cdp = await page.context().newCDPSession(page);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1500));

// Select the aura
await page.evaluate((id) => {
  const b = [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${id}`));
  b?.click();
}, AURA);
await new Promise((r) => setTimeout(r, 1200));

// Instrument: canvas/img churn + long tasks + rAF gaps
await page.evaluate(() => {
  window.__probe = { canvasAdded: 0, canvasRemoved: 0, imgAdded: 0, imgRemoved: 0, longTasks: 0, longTaskMs: 0, worstTask: 0, rafCount: 0, rafWorst: 0, events: 0, eventMs: 0, eventWorst: 0 };
  const count = (n, dir) => {
    if (!n || n.nodeType !== 1) return;
    if (n.nodeName === "CANVAS") window.__probe[dir === "add" ? "canvasAdded" : "canvasRemoved"]++;
    if (n.nodeName === "IMG") window.__probe[dir === "add" ? "imgAdded" : "imgRemoved"]++;
    if (n.querySelectorAll) {
      window.__probe[dir === "add" ? "canvasAdded" : "canvasRemoved"] += n.querySelectorAll("canvas").length;
      window.__probe[dir === "add" ? "imgAdded" : "imgRemoved"] += n.querySelectorAll("img").length;
    }
  };
  new MutationObserver((list) => {
    for (const m of list) {
      m.addedNodes.forEach((n) => count(n, "add"));
      m.removedNodes.forEach((n) => count(n, "del"));
    }
  }).observe(document.body, { childList: true, subtree: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) { window.__probe.longTasks++; window.__probe.longTaskMs += e.duration; window.__probe.worstTask = Math.max(window.__probe.worstTask, e.duration); }
  }).observe({ entryTypes: ["longtask"] });
  // rAF cadence probe: worst gap between frames during the drag
  let lastRaf = 0, rafOn = true;
  const raf = (t) => {
    if (lastRaf) window.__probe.rafWorst = Math.max(window.__probe.rafWorst, t - lastRaf);
    lastRaf = t; window.__probe.rafCount++;
    if (rafOn) requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
  window.__probeStop = () => { rafOn = false; };
});

// Real mouse drag on the "Speed" slider (first range input in the editor)
const slider = page.locator('[data-control-group="layer-0"] input[type="range"], .spec-editor input[type="range"]').first();
const editorSlider = page.locator('input[type="range"]').first();
await editorSlider.waitFor({ state: "visible" });
const box = await editorSlider.boundingBox();
const y = box.y + box.height / 2;
const x0 = box.x + box.width * 0.3;
const x1 = box.x + box.width * 0.8;

await page.mouse.move(x0, y);
await page.mouse.down();
const steps = 40;
for (let i = 1; i <= steps; i++) {
  await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y);
  await new Promise((r) => setTimeout(r, DRAG_MS / steps));
}
await page.mouse.up();
await new Promise((r) => setTimeout(r, 800));

const probe = await page.evaluate(() => { window.__probeStop?.(); return { ...window.__probe, hud: window.__auraGalleryHud }; });
console.log(`== ${AURA} drag (${DRAG_MS}ms, ${steps} mouse steps, 4x CPU) ==`);
console.log(`canvas added/removed: ${probe.canvasAdded}/${probe.canvasRemoved}`);
console.log(`img added/removed:    ${probe.imgAdded}/${probe.imgRemoved}`);
console.log(`long tasks >50ms:     ${probe.longTasks} totalling ${probe.longTaskMs.toFixed(0)}ms (worst ${probe.worstTask.toFixed(0)}ms)`);
console.log(`raf frames:           ${probe.rafCount} in ~${DRAG_MS + 800}ms wall (${(probe.rafCount / ((DRAG_MS + 800) / 1000)).toFixed(1)} fps, worst gap ${probe.rafWorst.toFixed(0)}ms)`);
console.log(`hud:                  ${JSON.stringify(probe.hud)}`);

await browser.close();
