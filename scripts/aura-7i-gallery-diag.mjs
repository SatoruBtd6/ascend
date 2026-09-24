// 7i gallery-control diagnosis: opens ?auras=1, picks an aura, and tests every
// control with REAL mouse drags (down/move/up), not synthesized clicks.
// For each range input: does the thumb follow the drag, does the paired number
// box track live + after release, does the input element survive the drag
// (remount check), and does typing into the number box stick?
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}

const base = process.argv[2] || "http://127.0.0.1:5173";
const auraName = process.argv[3] || "Ossuary";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
page.on("console", (m) => { if (m.type() === "error") console.log("[page]", m.text()); });
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

// open the aura card
await page.getByRole("button", { name: new RegExp(auraName) }).first().click();
await page.waitForTimeout(800);

// inventory every labeled control row in the editor
const rows = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("label").forEach((lab, i) => {
    const range = lab.querySelector('input[type="range"]');
    const num = lab.querySelector('input[type="number"]');
    const text = lab.querySelector("span")?.textContent?.trim() || lab.textContent?.trim().slice(0, 40);
    if (range || num) out.push({ i, text, hasRange: !!range, hasNum: !!num });
  });
  return out;
});
console.log(`${rows.length} slider rows found:`);
rows.forEach((r) => console.log(`  [${r.i}] ${r.text} (range:${r.hasRange} num:${r.hasNum})`));

const results = [];
for (const r of rows.filter((r) => r.hasRange)) {
  const info = await page.evaluate((idx) => {
    const lab = document.querySelectorAll("label")[idx];
    const range = lab.querySelector('input[type="range"]');
    const num = lab.querySelector('input[type="number"]');
    range.__diagMark = true;
    const b = range.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, v0: range.value, n0: num?.value, min: +range.min, max: +range.max, step: range.step };
  }, r.i);
  if (!info.w) { results.push({ label: r.text, skipped: "not visible" }); continue; }
  // real drag: press near 40% of track, drag toward 70%, release
  const sx = info.x + info.w * 0.4, ex = info.x + info.w * 0.7, y = info.y + info.h / 2;
  await page.mouse.move(sx, y); await page.mouse.down();
  const midVals = [];
  for (let s = 1; s <= 6; s += 1) {
    await page.mouse.move(sx + (ex - sx) * (s / 6), y, { steps: 2 });
    await page.waitForTimeout(120); // past the 120ms commit window
    midVals.push(await page.evaluate((idx) => {
      const lab = document.querySelectorAll("label")[idx];
      const range = lab?.querySelector('input[type="range"]');
      const num = lab?.querySelector('input[type="number"]');
      return { rv: range?.value, nv: num?.value, same: !!range?.__diagMark, active: document.activeElement === range };
    }, r.i));
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const end = await page.evaluate((idx) => {
    const lab = document.querySelectorAll("label")[idx];
    const range = lab?.querySelector('input[type="range"]');
    const num = lab?.querySelector('input[type="number"]');
    return { rv: range?.value, nv: num?.value, same: !!range?.__diagMark };
  }, r.i);
  results.push({ label: r.text, v0: info.v0, n0: info.n0, mid: midVals, end });
}

console.log("\n=== drag results ===");
for (const r of results) {
  if (r.skipped) { console.log(`${r.label}: ${r.skipped}`); continue; }
  const followed = r.mid.some((m) => m.rv !== r.v0);
  const stayedMounted = r.mid.every((m) => m.same) && r.end.same;
  const numTracks = r.mid.every((m, i) => i === 0 || m.nv === r.mid[i - 1].nv || m.nv === m.rv);
  const numMatchesEnd = r.end.nv === r.end.rv;
  console.log(`${r.label}: start=${r.v0}/${r.n0} mid=${r.mid.map((m) => `${m.rv}/${m.nv}${m.same ? "" : "!REMOUNT"}`).join(" → ")} end=${r.end.rv}/${r.end.nv}`);
  console.log(`   thumb-follows-drag:${followed} element-survives:${stayedMounted} num-tracks-live:${numTracks} num-matches-end:${numMatchesEnd}`);
}

// number-box typing test on the first row with a number input
const numRow = rows.find((r) => r.hasNum);
if (numRow) {
  const before = await page.evaluate((idx) => document.querySelectorAll("label")[idx].querySelector('input[type="number"]').value, numRow.i);
  const box = await page.evaluate((idx) => { const n = document.querySelectorAll("label")[idx].querySelector('input[type="number"]'); const b = n.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, numRow.i);
  await page.mouse.click(box.x, box.y);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("0.5");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  const after = await page.evaluate((idx) => { const l = document.querySelectorAll("label")[idx]; return { n: l.querySelector('input[type="number"]').value, r: l.querySelector('input[type="range"]')?.value }; }, numRow.i);
  console.log(`\nnumber-box type test on "${numRow.text}": ${before} → typed 0.5 → ${after.n} (range=${after.r})`);
}
await browser.close();
