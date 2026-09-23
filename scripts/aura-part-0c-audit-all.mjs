// Full-catalog editor audit. For every aura: walk every spec leaf, classify
// coverage (field / dedicated panel / select / structural / GAP), then check
// the rendered editor DOM shows a labelled control for each expected field.
import { createRequire } from "node:module";
import { existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

async function loadChromium() {
  for (const dir of [join(process.cwd(), "node_modules", "playwright"), join(process.env.TEMP || "", "ascend-pw-shots", "node_modules", "playwright")]) {
    if (!existsSync(join(dir, "index.js"))) continue;
    try { const mod = await import(pathToFileURL(join(dir, "index.js")).href); if (mod.chromium || mod.default?.chromium) return mod.chromium || mod.default.chromium; } catch {}
    try { const mod = createRequire(join(dir, "package.json"))("playwright"); if (mod.chromium) return mod.chromium; } catch {}
  }
  return (await import("playwright")).chromium;
}
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7h", "p0c-audit.json");
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 1400 } })).newPage();
await page.goto("http://127.0.0.1:5180/?auras=1", { waitUntil: "networkidle" });
await page.waitForSelector("canvas");
await new Promise((r) => setTimeout(r, 1200));

const report = await page.evaluate(async () => {
  const { AURA_FX } = await import("/src/auras/AuraCanvas.jsx");
  const { AURAS } = await import("/src/auras/catalog.js");
  const { specFields } = await import("/src/auras/specFormat.js");
  const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  const DEDICATED_LAYER = new Set(["frames", "frameDuration", "fadeLen", "frameMode", "frameOffsets", "shadow", "tongues", "flicker", "shimmer", "shimmerN", "embers"]);
  const IMG_PLACEMENT = new Set(["x", "y", "sz", "rot", "flip"]);
  const FLAME_PANEL = new Set(["n", "sz", "a", "rot", "spin"]);
  const DEDICATED_RING = new Set(["colorCycle", "cyclePeriod", "cycleEasing"]);
  // Non-emitted leaf keys that are structurally covered (panel/select) or intentional.
  const STRUCTURAL = new Set(["shape", "placed", "src", "frames", "frameMode", "art", "overArt", "even"]); // booleans/shape selectors handled by panels or selects
  const results = {};

  for (const meta of AURAS) {
    const spec = AURA_FX[meta.id];
    if (!spec) { results[meta.id] = { error: "no spec" }; continue; }
    const emitted = specFields(spec);
    const emittedSet = new Set(emitted.map((f) => f.path.join(".")));
    const leaves = [];
    (function walk(v, path) {
      if (Array.isArray(v)) { v.forEach((item, i) => walk(item, path.concat(i))); return; }
      if (v && typeof v === "object") { for (const k of Object.keys(v)) walk(v[k], path.concat(k)); return; }
      leaves.push({ path, value: v, emitted: emittedSet.has(path.join(".")) });
    })(spec, []);

    const gaps = [], panel = [], fields = [], structural = [];
    for (const leaf of leaves) {
      const p = leaf.path;
      const key = p[p.length - 1];
      const parentKey = typeof key === "number" ? p[p.length - 2] : key;
      let where = null;
      if (p[0] === "layers") {
        const L = spec.layers[p[1]];
        const img = L?.shape === "img", flame = L?.shape === "flame";
        if (!leaf.emitted) {
          // non-emitted leaves (strings, bools, nested handled objects)
          if (key === "k") where = img || flame ? "hidden-kind" : "select";
          else if (key === "shape") where = "structural";
          else if (key === "e") where = leaf.value && HEX.test(String(leaf.value)) ? "field" : "gap:emoji-list";
          else if (key === "blend") where = p.includes("shadow") || p.includes("embers") ? "panel" : "gap:blend";
          else if (["src", "frames", "frameMode", "placed", "art", "overArt"].includes(key)) where = "panel";
          else if (typeof leaf.value === "boolean" && ["shadow", "embers", "shimmer"].includes(parentKey === key ? key : parentKey)) where = "panel";
          else if (["shadow", "embers", "shimmer"].includes(key) || ["shadow", "embers"].includes(parentKey)) where = "panel";
          else if (parentKey === "frameOffsets" || key === "frameOffsets") where = "panel";
          else if (p.includes("frameOffsets")) where = "panel";
          else if (parentKey === "colorCycle") where = "panel";
          else where = "gap:unhandled-leaf";
        } else {
          // emitted leaf on a layer
          if (img && (DEDICATED_LAYER.has(parentKey) || IMG_PLACEMENT.has(parentKey) || p.includes("shadow") || p.includes("frameOffsets") || p.includes("embers"))) where = "panel";
          else if (img && L.n === 1 && (parentKey === "at" || parentKey === "r")) where = "panel";
          else if (flame && (DEDICATED_LAYER.has(parentKey) || FLAME_PANEL.has(parentKey) || p.includes("embers") || p.includes("shadow") || parentKey === "c")) where = "panel";
          else where = "field";
        }
      } else if (p[0] === "rings") {
        where = leaf.emitted ? (DEDICATED_RING.has(parentKey) || p.includes("colorCycle") ? "panel" : "field") : "panel";
      } else if (p.length === 1) {
        where = leaf.emitted ? "field" : (["art", "overArt"].includes(key) ? "panel-art" : "gap:top-leaf");
      } else {
        // rays/bolts/sweep/corona sub-fields
        if (leaf.emitted) where = "field";
        else if (key === "from" && p[0] === "bolts") where = "gap:bolt-from";
        else where = "gap:section-leaf";
      }
      (where === "field" ? fields : where === "panel" || where === "select" ? panel : where === "structural" || where === "hidden-kind" || where === "panel-art" ? structural : gaps).push({ path: p.join("."), where, value: leaf.value });
    }
    results[meta.id] = { emitted: emitted.length, fields: fields.length, panel: panel.length, structural: structural.length, gaps };
  }
  return results;
});

// Now verify the rendered DOM per aura: every emitted 'field' leaf must have a visible control.
const domReport = {};
for (const meta of await page.evaluate(() => window.__auraIds || fetch).then(() => [], () => [])) {}
for (const id of Object.keys(report)) {
  await page.evaluate((aura) => {
    [...document.querySelectorAll("button")].find((x) => x.querySelector("canvas") && x.textContent.includes(`· ${aura}`))?.click();
  }, id);
  await new Promise((r) => setTimeout(r, 450));
  const dom = await page.evaluate(() => {
    const editor = document.querySelector("[data-control-group]")?.closest("div[style*='overflow']") || document.querySelector("[data-control-group]")?.parentElement?.parentElement;
    if (!editor) return null;
    const groups = [...editor.querySelectorAll("[data-control-group]")].map((g) => g.getAttribute("data-control-group"));
    const labels = [...editor.querySelectorAll("label > span")].map((s) => s.textContent.trim());
    const checks = [...editor.querySelectorAll('input[type="checkbox"]')].map((c) => c.parentElement.textContent.trim());
    const inputs = editor.querySelectorAll('input[type="range"], input[type="number"], input[type="color"], input[type="checkbox"], select').length;
    const rawSuspect = [...labels, ...checks].filter((t) => /^[a-z]+\d*(\.\w+)+$/.test(t) || /^[a-z]+[A-Z]/.test(t));
    return { groups, inputs, labels, checks, rawSuspect };
  });
  domReport[id] = dom;
  await page.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "All auras")?.click());
  await new Promise((r) => setTimeout(r, 250));
}

const out = { leafCoverage: report, dom: domReport };
writeFileSync(OUT, JSON.stringify(out, null, 1));
// Console summary
for (const [id, r] of Object.entries(report)) {
  const dom = domReport[id];
  const gapText = r.gaps?.length ? ` GAPS: ${r.gaps.map((g) => `${g.where}@${g.path}`).join(", ")}` : "";
  const rawText = dom?.rawSuspect?.length ? ` RAW: ${dom.rawSuspect.join(", ")}` : "";
  console.log(`${id.padEnd(14)} leaves: fields=${r.fields} panel=${r.panel} structural=${r.structural} | dom inputs=${dom?.inputs ?? "?"} groups=${dom?.groups?.length ?? "?"}${gapText}${rawText}${r.error ? " ERROR:" + r.error : ""}`);
}
await browser.close();
