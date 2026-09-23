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

const [beforeBase = "http://127.0.0.1:5181", afterBase = "http://127.0.0.1:5180"] = process.argv.slice(2);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });

// Gallery size presets (devGallery SIZES). 32/76 are the avatar surfaces that
// the original single-size pass missed; 160 matches the crate reveal.
const SIZES = ["32 board", "76 profile", "88 studio", "160 crate"];
// "reduce" = real prefers-reduced-motion (damps the canvas via matchMedia AND
// strips CSS animation, exercising DOM overlays like OphanimWings).
// "full"   = no-preference, but CSS animations are frozen by an injected rule so
//            overlay screenshots stay deterministic; the canvas still runs at
//            full speed on the virtual rAF clock.
const MOTIONS = ["full", "reduce"];

async function capture(base) {
  const passes = {};
  for (const motion of MOTIONS) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1, reducedMotion: motion === "reduce" ? "reduce" : "no-preference" });
    await context.addInitScript(() => {
      let state = 0x7f2a11, calls = 0, now = 0;
      Math.random = () => { calls += 1; state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
      performance.now = () => now;
      const queue = new Map(); let next = 1;
      requestAnimationFrame = (fn) => { const id = next++; queue.set(id, fn); return id; };
      cancelAnimationFrame = (id) => queue.delete(id);
      window.__stepAuraFrames = (count, ms) => {
        for (let frame = 0; frame < count; frame += 1) {
          now += ms;
          const callbacks = [...queue.values()]; queue.clear();
          callbacks.forEach((fn) => fn(now));
        }
      };
      window.__auraRandomCalls = () => calls;
    });
    const page = await context.newPage();
    await page.goto(`${base}/?auras=1`, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas");
    if (motion === "full") {
      await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
    }
    passes[motion] = {};
    for (const sizeLabel of SIZES) {
      await page.getByRole("button", { name: sizeLabel, exact: true }).click();
      await page.evaluate(async () => {
        await Promise.all([...document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve; })));
        window.__stepAuraFrames(120, 1000 / 60);
      });
      await page.waitForTimeout(500); // let lazy aura images (e.g. ophanim dataURL) settle
      const tiles = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => button.querySelector("canvas") && button.textContent.includes("·")).map((button) => {
        const rect = button.getBoundingClientRect();
        return {
          label: button.textContent.trim(),
          hasOverlay: !!button.querySelector("img"),
          rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
          canvases: [...button.querySelectorAll("canvas")].map((canvas) => ({ width: canvas.width, height: canvas.height, pixels: Array.from(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data) })),
        };
      }));
      const clip = await page.evaluate(() => {
        const boxes = [...document.querySelectorAll("button")].filter((button) => button.querySelector("canvas") && button.textContent.includes("·")).map((button) => button.getBoundingClientRect());
        return {
          x: Math.floor(Math.min(...boxes.map((box) => box.left))),
          y: Math.floor(Math.min(...boxes.map((box) => box.top))),
          width: Math.ceil(Math.max(...boxes.map((box) => box.right))) - Math.floor(Math.min(...boxes.map((box) => box.left))),
          height: Math.ceil(Math.max(...boxes.map((box) => box.bottom))) - Math.floor(Math.min(...boxes.map((box) => box.top))),
        };
      });
      // Grid screenshot captures DOM overlays (ophanim imgs) the canvas dump misses.
      const grid = await page.screenshot({ clip });
      // Per-tile screenshots for tiles with DOM overlays.
      const tileButtons = await page.locator("button").all();
      const overlayShots = {};
      for (const btn of tileButtons) {
        const meta = await btn.evaluate((b) => (b.querySelector("canvas") && b.textContent.includes("·") && b.querySelector("img")) ? b.textContent.trim() : null);
        if (meta) overlayShots[meta] = (await btn.screenshot()).toString("base64");
      }
      const randomCalls = await page.evaluate(() => window.__auraRandomCalls());
      passes[motion][sizeLabel] = { tiles, grid: grid.toString("base64"), clip, overlayShots, randomCalls };
    }
    await context.close();
  }
  return passes;
}

function differingPixels(a, b) {
  if (a.length !== b.length) throw new Error(`pixel byte lengths differ: ${a.length} vs ${b.length}`);
  let count = 0;
  for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) count += 1;
  return count;
}

const before = await capture(beforeBase);
const after = await capture(afterBase);
const comparePage = await browser.newPage({ viewport: { width: 10, height: 10 } });
const diffImage = async (a, b) => comparePage.evaluate(async ({ a, b }) => {
  const load = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
  const [one, two] = await Promise.all([load(`data:image/png;base64,${a}`), load(`data:image/png;base64,${b}`)]);
  if (one.width !== two.width || one.height !== two.height) return { sizeMismatch: [one.width, one.height, two.width, two.height], count: -1, locations: [] };
  const canvas = document.createElement("canvas"); canvas.width = one.width; canvas.height = one.height; const ctx = canvas.getContext("2d");
  ctx.drawImage(one, 0, 0); const x = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(two, 0, 0); const y = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0; const locations = [];
  for (let py = 0; py < canvas.height; py += 1) for (let px = 0; px < canvas.width; px += 1) {
    const i = (py * canvas.width + px) * 4;
    if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] || x[i + 3] !== y[i + 3]) { count += 1; if (locations.length < 10) locations.push([px, py]); }
  }
  return { count, locations, width: canvas.width, height: canvas.height };
}, { a, b });

const report = { seed: "0x7f2a11", frames: 120, stepMs: 1000 / 60, passes: {} };
let anyDiff = false;
for (const motion of MOTIONS) {
  for (const sizeLabel of SIZES) {
    const b = before[motion][sizeLabel], a = after[motion][sizeLabel];
    if (b.tiles.length !== a.tiles.length) throw new Error(`tile counts differ at ${motion}/${sizeLabel}: ${b.tiles.length} vs ${a.tiles.length}`);
    let canvasCount = 0, tileDifferingPixels = 0;
    const differingTiles = [];
    for (let i = 0; i < b.tiles.length; i += 1) {
      if (b.tiles[i].label !== a.tiles[i].label) throw new Error(`tile ${i} differs at ${motion}/${sizeLabel}: ${b.tiles[i].label} vs ${a.tiles[i].label}`);
      if (b.tiles[i].canvases.length !== a.tiles[i].canvases.length) throw new Error(`canvas count differs for ${b.tiles[i].label} at ${motion}/${sizeLabel}`);
      let tileDiff = 0;
      for (let j = 0; j < b.tiles[i].canvases.length; j += 1) { canvasCount += 1; tileDiff += differingPixels(b.tiles[i].canvases[j].pixels, a.tiles[i].canvases[j].pixels); }
      tileDifferingPixels += tileDiff;
      if (tileDiff) differingTiles.push(b.tiles[i].label);
    }
    const gridDetails = await diffImage(b.grid, a.grid);
    const overlayResults = {};
    for (const label of Object.keys(b.overlayShots)) {
      if (!a.overlayShots[label]) { overlayResults[label] = { missing: true }; anyDiff = true; continue; }
      const d = await diffImage(b.overlayShots[label], a.overlayShots[label]);
      if (d.count !== 0) overlayResults[label] = d;
    }
    const pass = {
      tiles: b.tiles.length,
      canvases: canvasCount,
      beforeRandomCalls: b.randomCalls,
      afterRandomCalls: a.randomCalls,
      tileDifferingPixels,
      differingTiles,
      gridDifferingPixels: gridDetails.count,
      gridSize: gridDetails.sizeMismatch || [gridDetails.width, gridDetails.height],
      firstGridDifferences: gridDetails.locations,
      overlayDifferingTiles: overlayResults,
    };
    report.passes[`${motion}/${sizeLabel}`] = pass;
    if (tileDifferingPixels || gridDetails.count !== 0 || Object.keys(overlayResults).length || b.randomCalls !== a.randomCalls) anyDiff = true;
  }
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
if (anyDiff) process.exitCode = 1;
