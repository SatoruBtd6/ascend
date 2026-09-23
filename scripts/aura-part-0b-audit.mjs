// Audit: no raw spec keys or dotted paths should appear as control labels.
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
const RAW_KEYS = new Set(["spd", "jit", "sz", "tw", "wobble", "filigree", "cyclePeriod", "cycleEasing", "frameDuration", "fadeLen", "frameMode", "shimmerN", "burstSpan", "flashPeak", "flashLife", "artLate"]);
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));
const suspects = {};
for (const aura of ["huntersmoon", "blacksun", "ascended", "bonewright", "eclipseheart", "chud", "thunder"]) {
  await page.evaluate((id) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${id}`));
    b?.click();
  }, aura);
  await new Promise((r) => setTimeout(r, 700));
  const labels = await page.evaluate(() => {
    const editor = document.querySelector("[data-control-group]")?.parentElement;
    if (!editor) return [];
    return [...editor.querySelectorAll("label > span, select option, [data-control-group] > div")].map((el) => el.textContent.trim()).filter(Boolean);
  });
  const bad = labels.filter((t) => /^[a-z]+\d*(\.\w+)+$/.test(t) || (RAW_KEYS.has(t) && !t.includes(" ")) || /^[a-z]+[A-Z]/.test(t));
  if (bad.length) suspects[aura] = bad;
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 300));
}
console.log(JSON.stringify(suspects, null, 1));
await browser.close();
