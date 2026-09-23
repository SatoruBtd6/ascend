// Round-trip check: edit blend via the editor UI, then copy the spec and
// parse it back — must deep-equal the edited draft.
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
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
await page.goto("http://localhost:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));
await page.evaluate(() => {
  [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes("· smolder"))?.click();
});
await new Promise((r) => setTimeout(r, 700));

// Drive the Blend mode select on layer 1 to "lighter"
await page.evaluate(() => {
  const group = document.querySelector('[data-control-group="layer-0"]');
  const select = [...group.querySelectorAll("select")].find((s) => s.closest("label")?.textContent.includes("Blend mode"));
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
  setter.call(select, "lighter");
  select.dispatchEvent(new Event("change", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));

const result = await page.evaluate(async () => {
  const { formatAuraEntry, parseAuraEntry } = await import("/src/auras/specFormat.js");
  const { AURA_FX } = await import("/src/auras/AuraCanvas.jsx");
  const spec = AURA_FX.smolder; // drafts assign into the registry
  const text = formatAuraEntry("smolder", spec);
  const parsed = parseAuraEntry(text);
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return { edited: spec.layers[0].blend, roundTrip: eq(parsed.spec, spec), text: text.slice(0, 160) };
});
console.log(`blend after edit: ${result.edited}`);
console.log(`round-trip equal: ${result.roundTrip}`);
console.log(`copy output head: ${result.text}...`);
await browser.close();
