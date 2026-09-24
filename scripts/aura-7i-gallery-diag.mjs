// 7i gallery-control diagnosis: opens ?auras=1, picks an aura, and tests every
// range slider with REAL mouse drags (down/move/up), not synthesized clicks.
// For each: does the thumb follow the drag, does the paired number box track
// live + after release, does the input element survive the drag (remount
// check), and does typing into the number box stick?
// Usage: node scripts/aura-7i-gallery-diag.mjs [base] [AuraName]
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
page.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 160)));
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);

await page.getByRole("button", { name: new RegExp(auraName) }).first().click();
await page.waitForTimeout(800);

const handles = await page.$$('label input[type="range"]');
console.log(`${handles.length} range sliders found`);
const meta = await Promise.all(handles.map((h) => h.evaluate((el) => {
  el.__diagMark = true;
  const lab = el.closest("label");
  const num = lab?.querySelector('input[type="number"]');
  return { text: lab?.querySelector("span")?.textContent?.trim() || "?", min: +el.min, max: +el.max, v0: el.value, n0: num?.value };
})));

const results = [];
for (let i = 0; i < handles.length; i += 1) {
  const h = handles[i], m = meta[i];
  try {
    await h.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await h.boundingBox();
    if (!bb || !bb.width) { results.push({ label: m.text, skipped: "detached/invisible" }); continue; }
    // grab the THUMB at its current position (the reported-broken gesture),
    // then drag it toward the right edge of the track
    const frac = Math.min(1, Math.max(0, (parseFloat(m.v0) - m.min) / (m.max - m.min || 1)));
    const sx = bb.x + 8 + (bb.width - 16) * frac;
    const ex = bb.x + bb.width * 0.85;
    const y = Math.max(bb.y, 96) + bb.height / 2;
    if (y > 880) { results.push({ label: m.text, skipped: "below viewport" }); continue; }
    await page.mouse.move(sx, y); await page.mouse.down();
    const mid = [];
    for (let s = 1; s <= 5; s += 1) {
      await page.mouse.move(sx + (ex - sx) * (s / 5), y, { steps: 2 });
      await page.waitForTimeout(140);
      mid.push(await h.evaluate((el) => {
        const num = el.closest("label")?.querySelector('input[type="number"]');
        return { rv: el.value, nv: num?.value, same: !!el.__diagMark, focused: document.activeElement === el };
      }).catch(() => ({ detached: true })));
      if (mid[mid.length - 1].detached) break;
    }
    await page.mouse.up();
    await page.waitForTimeout(350);
    const end = await h.evaluate((el) => {
      const num = el.closest("label")?.querySelector('input[type="number"]');
      return { rv: el.value, nv: num?.value, same: !!el.__diagMark };
    }).catch(() => ({ detached: true }));
    results.push({ label: m.text, v0: m.v0, n0: m.n0, mid, end });
  } catch (e) {
    try { await page.mouse.up(); } catch {}
    results.push({ label: m.text, skipped: String(e).slice(0, 80) });
  }
}

console.log("\n=== drag results ===");
const tally = { followed: 0, deadDrag: 0, remounted: 0, numStale: 0, skipped: 0 };
for (const r of results) {
  if (r.skipped) { tally.skipped += 1; continue; }
  const followed = r.mid.some((x) => !x.detached && x.rv !== r.v0) || (!r.end.detached && r.end.rv !== r.v0);
  const survived = r.mid.every((x) => !x.detached && x.same) && !r.end.detached && r.end.same;
  const numEndMatch = !r.end.detached && r.end.nv === r.end.rv;
  if (followed) tally.followed += 1; else tally.deadDrag += 1;
  if (!survived) tally.remounted += 1;
  if (!numEndMatch) tally.numStale += 1;
  console.log(`${r.label}: v0=${r.v0} num0=${r.n0} mid=${r.mid.map((x) => (x.detached ? "DETACHED" : `${x.rv}/${x.nv}${x.same ? "" : "!RM"}${x.focused ? "" : "!BLUR"}`)).join(" → ")} end=${r.end.detached ? "DETACHED" : `${r.end.rv}/${r.end.nv}`}`);
}
console.log(`\nTALLY: ${tally.followed} followed drag, ${tally.deadDrag} dead drag, ${tally.remounted} remounted mid-drag, ${tally.numStale} number stale at end, ${tally.skipped} skipped`);

// number-box typing test on the first surviving row with a number input
const numH = await page.$$('label input[type="number"]');
if (numH.length) {
  const h = numH[0];
  const label = await h.evaluate((el) => el.closest("label")?.querySelector("span")?.textContent?.trim());
  const before = await h.evaluate((el) => el.value);
  await h.scrollIntoViewIfNeeded().catch(() => {});
  const bb = await h.boundingBox();
  await page.mouse.click(bb.x + bb.width / 2, Math.max(bb.y, 96) + bb.height / 2);
  await page.waitForTimeout(150);
  const focused = await h.evaluate((el) => document.activeElement === el);
  console.log(`number-box focus check: ${focused}`);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("0.5");
  await page.waitForTimeout(200);
  const during = await h.evaluate((el) => el.value);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(350);
  const after = await h.evaluate((el) => ({ n: el.value, r: el.closest("label")?.querySelector('input[type="range"]')?.value }));
  console.log(`\nnumber-box type test on "${label}": "${before}" → typed "0.5" → during="${during}" after-blur="${after.n}" (range=${after.r})`);
}
await browser.close();
