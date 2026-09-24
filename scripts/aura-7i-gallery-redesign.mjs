// 7i gallery redesign verification — real mouse drags at human-fast speed.
// Asserts: fixed bounds never change mid-drag, no snap-back on release,
// min/max pairs cannot invert, typed values clamp, per-control reset works,
// and the "preview simplified while dragging" hint shows.
// Usage: node scripts/aura-7i-gallery-redesign.mjs [--base http://127.0.0.1:5173] [--aura ossuary]
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://127.0.0.1:5173";
const AURA = args.includes("--aura") ? args[args.indexOf("--aura") + 1] : "ossuary";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(`text=${AURA}`, { timeout: 15000 }).catch(() => {});
// open the aura's editor by clicking its card
await page.evaluate((aura) => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.includes(aura === "ossuary" ? "Ossuary" : aura));
  btn?.click();
}, AURA);
await page.waitForSelector('input[type="range"]', { timeout: 10000 });
await page.waitForTimeout(400);

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); };

const boundsOf = (el) => el.evaluate((r) => ({ min: r.min, max: r.max, step: r.step }));

// ---------- fast human-speed drags on a sample of sliders ----------
const sliders = await page.$$('input[type="range"]');
let tested = 0, boundsStable = 0, snapBacks = 0, deadDrags = 0;
for (let i = 0; i < sliders.length && tested < 24; i++) {
  const el = sliders[i];
  try {
    const box = await el.boundingBox();
    if (!box || box.y + box.height > 780) { await el.scrollIntoViewIfNeeded(); }
    const b2 = await el.boundingBox();
    if (!b2 || b2.y + b2.height > 780 || b2.y < 60) continue;
    const meta = await el.evaluate((r) => ({ min: +r.min, max: +r.max, step: +r.step, value: +r.value }));
    const span = meta.max - meta.min;
    if (!(span > 0)) continue;
    tested++;
    // grab the actual thumb position
    const frac = (meta.value - meta.min) / span;
    const px = b2.x + Math.max(2, Math.min(b2.width - 2, frac * b2.width));
    const py = b2.y + b2.height / 2;
    const target = b2.x + b2.width * 0.78;
    const b0 = await boundsOf(el);
    await page.mouse.move(px, py);
    await page.mouse.down();
    // human-fast: ~6 moves over ~90ms, sampling bounds mid-drag
    let stable = true;
    for (let s = 1; s <= 6; s++) {
      await page.mouse.move(px + ((target - px) * s) / 6, py, { steps: 1 });
      const mid = await boundsOf(el);
      if (mid.min !== b0.min || mid.max !== b0.max || mid.step !== b0.step) stable = false;
      await page.waitForTimeout(15);
    }
    const vBeforeUp = await el.evaluate((r) => +r.value);
    await page.mouse.up();
    await page.waitForTimeout(450);
    const vAfter = await el.evaluate((r) => +r.value);
    const numAfter = await el.evaluate((r) => {
      const num = r.closest("label")?.querySelector('input[type="number"]');
      return num ? +num.value : null;
    });
    if (stable) boundsStable++;
    if (vBeforeUp === meta.value) deadDrags++;
    if (Math.abs(vAfter - vBeforeUp) > Math.max(meta.step, span * 0.001)) snapBacks++;
    if (numAfter != null && Math.abs(numAfter - vAfter) > meta.step * 1.01) snapBacks++;
  } catch (e) { /* detached nodes count as skips */ }
}
check("fast drags move sliders (0 dead)", deadDrags === 0, `${tested} dragged, ${deadDrags} dead`);
check("bounds fixed mid-drag (min/max/step constant)", boundsStable === tested, `${boundsStable}/${tested} stable`);
check("no snap-back on release", snapBacks === 0, `${snapBacks} mismatches`);

// ---------- pair inversion ----------
// find a pair frame; drag its min slider right past max
const pair = await page.$('[data-pair]');
if (pair) {
  const title = await pair.getAttribute("data-pair");
  const [minR, maxR] = await pair.$$('input[type="range"]');
  const nums = await pair.$$('input[type="number"]');
  if (minR && maxR && nums.length === 2) {
    const mb = await minR.boundingBox();
    await minR.scrollIntoViewIfNeeded();
    const mb2 = await minR.boundingBox();
    // drag min thumb all the way right — must clamp at current max
    await page.mouse.move(mb2.x + 4, mb2.y + mb2.height / 2);
    await page.mouse.down();
    await page.mouse.move(mb2.x + mb2.width - 2, mb2.y + mb2.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const lo = +(await nums[0].evaluate((n) => n.value));
    const hi = +(await nums[1].evaluate((n) => n.value));
    check(`pair "${title}" cannot invert (min<=max after drag)`, lo <= hi, `min=${lo} max=${hi}`);
    // drag max left past min — must clamp at current min
    const xb = await maxR.boundingBox();
    await page.mouse.move(xb.x + xb.width - 4, xb.y + xb.height / 2);
    await page.mouse.down();
    await page.mouse.move(xb.x + 2, xb.y + xb.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const lo2 = +(await nums[0].evaluate((n) => n.value));
    const hi2 = +(await nums[1].evaluate((n) => n.value));
    check(`pair "${title}" cannot invert (max>=min after reverse drag)`, hi2 >= lo2, `min=${lo2} max=${hi2}`);
  } else check("pair frame has two sliders", false, `ranges=${await pair.$$('input[type="range"]').then((r) => r.length)}`);
} else check("pair frame exists in editor", false, "no [data-pair] found");

// ---------- typed clamp ----------
{
  const num = (await page.$$('input[type="number"]'))[0];
  if (num) {
    const max = await num.getAttribute("max");
    await num.scrollIntoViewIfNeeded();
    await num.click({ clickCount: 3 });
    await num.type("999", { delay: 20 });
    await num.evaluate((n) => n.blur());
    await page.waitForTimeout(350);
    const v = +(await num.evaluate((n) => n.value));
    check("typed value clamps to fixed max", v <= +max + 1e-9, `typed 999 -> ${v} (max ${max})`);
  }
}

// ---------- per-control reset ----------
{
  const rows = await page.$$('input[type="range"]');
  const el = rows[0];
  const row = await el.evaluateHandle((r) => r.closest("label"));
  const reset = await row.$('button[title="Reset to default"]');
  if (reset) {
    // move the slider, then reset
    const b = await el.boundingBox();
    await el.scrollIntoViewIfNeeded();
    const b2 = await el.boundingBox();
    const before = +(await el.evaluate((r) => r.value));
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
    await page.mouse.down();
    await page.mouse.move(b2.x + b2.width * 0.9, b2.y + b2.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    const moved = +(await el.evaluate((r) => r.value));
    await reset.click();
    await page.waitForTimeout(400);
    const after = +(await el.evaluate((r) => r.value));
    // reset lands on the spec default — the button disables when clean
    const disabled = await reset.evaluate((b) => b.disabled);
    check("per-control reset restores default", moved !== before && disabled, `${before} -> ${moved} -> ${after} (reset ${disabled ? "disabled" : "enabled"})`);
  } else check("reset button present", false, "no ResetBtn in first row");
}

// ---------- hint during drag ----------
{
  const el = (await page.$$('input[type="range"]'))[0];
  const b = await el.boundingBox();
  await el.scrollIntoViewIfNeeded();
  const b2 = await el.boundingBox();
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2);
  await page.mouse.down();
  await page.mouse.move(b2.x + b2.width * 0.7, b2.y + b2.height / 2, { steps: 2 });
  const hint = await page.$('[data-testid="drag-preview-hint"]');
  const vis = hint ? await hint.isVisible() : false;
  check('"preview simplified while dragging" hint shows mid-drag', vis, "");
  await page.mouse.up();
}

// editor screenshot (after state)
const editor = await page.evaluate(() => {
  const el = [...document.querySelectorAll("div")].filter((d) => d.querySelector('input[type="range"]')).pop();
  return null;
});
await page.screenshot({ path: join(OUT, `7i-gallery-editor-${AURA}-after.png`), fullPage: false });

await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
