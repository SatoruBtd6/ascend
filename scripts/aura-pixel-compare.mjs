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

async function capture(base) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
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
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve; })));
    window.__stepAuraFrames(120, 1000 / 60);
  });
  const tiles = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => button.querySelector("canvas") && button.textContent.includes("·")).map((button) => ({
    label: button.textContent.trim(),
    canvases: [...button.querySelectorAll("canvas")].map((canvas) => ({ width: canvas.width, height: canvas.height, pixels: Array.from(canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data) })),
  })));
  const clip = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("button")].filter((button) => button.querySelector("canvas") && button.textContent.includes("·")).map((button) => button.getBoundingClientRect());
    return {
      x: Math.floor(Math.min(...boxes.map((box) => box.left))),
      y: Math.floor(Math.min(...boxes.map((box) => box.top))),
      width: Math.ceil(Math.max(...boxes.map((box) => box.right))) - Math.floor(Math.min(...boxes.map((box) => box.left))),
      height: Math.ceil(Math.max(...boxes.map((box) => box.bottom))) - Math.floor(Math.min(...boxes.map((box) => box.top))),
    };
  });
  const grid = await page.screenshot({ clip });
  const randomCalls = await page.evaluate(() => window.__auraRandomCalls());
  await context.close();
  return { tiles, grid: grid.toString("base64"), randomCalls };
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
const gridDetails = await comparePage.evaluate(async ({ a, b }) => {
  const load = (src) => new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
  const [one, two] = await Promise.all([load(`data:image/png;base64,${a}`), load(`data:image/png;base64,${b}`)]);
  if (one.width !== two.width || one.height !== two.height) throw new Error(`grid sizes differ: ${one.width}x${one.height} vs ${two.width}x${two.height}`);
  const canvas = document.createElement("canvas"); canvas.width = one.width; canvas.height = one.height; const ctx = canvas.getContext("2d");
  ctx.drawImage(one, 0, 0); const x = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(two, 0, 0); const y = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let count = 0; const locations = [];
  for (let py = 0; py < canvas.height; py += 1) for (let px = 0; px < canvas.width; px += 1) {
    const i = (py * canvas.width + px) * 4;
    if (x[i] !== y[i] || x[i + 1] !== y[i + 1] || x[i + 2] !== y[i + 2] || x[i + 3] !== y[i + 3]) { count += 1; if (locations.length < 10) locations.push([px, py]); }
  }
  return { count, locations, width: canvas.width, height: canvas.height };
}, { a: before.grid, b: after.grid });
if (before.tiles.length !== after.tiles.length) throw new Error(`tile counts differ: ${before.tiles.length} vs ${after.tiles.length}`);
let canvasCount = 0, tileDifferingPixels = 0;
for (let i = 0; i < before.tiles.length; i += 1) {
  if (before.tiles[i].label !== after.tiles[i].label) throw new Error(`tile ${i} differs: ${before.tiles[i].label} vs ${after.tiles[i].label}`);
  if (before.tiles[i].canvases.length !== after.tiles[i].canvases.length) throw new Error(`canvas count differs for ${before.tiles[i].label}`);
  for (let j = 0; j < before.tiles[i].canvases.length; j += 1) {
    canvasCount += 1;
    tileDifferingPixels += differingPixels(before.tiles[i].canvases[j].pixels, after.tiles[i].canvases[j].pixels);
  }
}
const gridDifferingPixels = gridDetails.count;
await browser.close();
console.log(JSON.stringify({ seed: "0x7f2a11", frames: 120, stepMs: 1000 / 60, tiles: before.tiles.length, canvases: canvasCount, beforeRandomCalls: before.randomCalls, afterRandomCalls: after.randomCalls, tileDifferingPixels, gridDifferingPixels, gridSize: [gridDetails.width, gridDetails.height], firstGridDifferences: gridDetails.locations }, null, 2));
if (tileDifferingPixels || gridDifferingPixels || before.randomCalls !== after.randomCalls) process.exitCode = 1;
