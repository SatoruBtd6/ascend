// End-to-end check of the view-scoped editor: picks ossuary, verifies the
// three-way "Changes apply to" toggle, drags a slider in each scope and
// asserts writes land in body:/circle:/shared, and that override markers
// + clear work. Then screenshots the editor in body scope.
// Usage: node scripts/aura-7i-scope-uicheck.mjs [--base http://localhost:5173]
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascended-7i");
mkdirSync(OUT, { recursive: true });
const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:5173";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 })).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Ossuary", { timeout: 15000 });
// The app may hold an HMR-timestamped module record (…?t=NNN) — a bare
// import() would create a second record with its own AURA_FX, so resolve the
// exact URL the app fetched from the resource log.
await page.evaluate(() => {
  window.__modUrl = (file) => {
    const hit = performance.getEntriesByType("resource").map((e) => e.name)
      .find((n) => n.includes(file) && n.includes("?"))
      || performance.getEntriesByType("resource").map((e) => e.name).find((n) => n.includes(file));
    return hit || `/src/auras/${file}`;
  };
});
await page.evaluate(() => import(window.__modUrl("AuraCanvas.jsx")).then((m) => { window.__mod = m; }));

// open ossuary's editor
await page.click("text=Ossuary");
await page.waitForSelector("text=Changes apply to:", { timeout: 8000 });

const results = await page.evaluate(async () => {
  const mod = window.__mod;
  const out = { checks: [] };
  const ck = (name, ok, detail) => out.checks.push({ name, ok, detail });
  const buttons = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
  ck("toggle shows three scopes", buttons.includes("Body figure only") && buttons.includes("Avatar ring only") && buttons.includes("Both views"), buttons.filter((b) => b.includes("view") || b.includes("figure")).join("|"));
  const scopeBtn = (label) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === label);
  const spec = () => mod.AURA_FX.ossuary;
  const findSlider = (name) => [...document.querySelectorAll("label")].find((l) => l.textContent.includes(name))?.querySelector("input[type=range]");
  const drag = (el, v) => {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("pointerup", { bubbles: true }));
    el.blur(); // flush() commits the pending drag value
  };

  // body scope: drag the crown gap slider — must write layers[0].body.hover
  scopeBtn("Body figure only").click();
  await new Promise((r) => setTimeout(r, 120));
  const gap = findSlider("Hover gap");
  ck("crown gap slider exists", !!gap, "");
  if (gap) { drag(gap, 0.4); await new Promise((r) => setTimeout(r, 120)); }
  const bOv = spec().layers[0].body;
  ck("body edit writes layers[0].body", !!(bOv && typeof bOv.hover === "number"), JSON.stringify(bOv));
  ck("body edit leaves shared base", spec().layers[0].hover === -0.62, String(spec().layers[0].hover));
  ck("body edit leaves circle override", spec().layers[0].circle.hover === 0.85, String(spec().layers[0].circle?.hover));
  const dots = [...document.querySelectorAll("span")].filter((s) => s.textContent === "●" || s.textContent === "○");
  ck("override markers render", dots.length > 0, `${dots.length} markers`);
  const clearBtns = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "×" && b.title.includes("Clear override"));
  ck("clear-override buttons present", clearBtns.length >= 1, `${clearBtns.length}`);

  // body-scope drag again, then clear via × — must drop layers[0].body.hover
  const gap1b = findSlider("Hover gap");
  if (gap1b) { drag(gap1b, 0.4); await new Promise((r) => setTimeout(r, 150)); }
  const hoverClear = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "×" && b.title.includes("Clear override") && b.parentElement?.textContent.includes("Hover gap"));
  ck("body override marker + clear on the field row", !!hoverClear, "");
  if (hoverClear) {
    hoverClear.click();
    await new Promise((r) => setTimeout(r, 120));
    ck("clear drops the body override", !spec().layers[0].body || spec().layers[0].body.hover === undefined, JSON.stringify(spec().layers[0].body));
  }

  // circle scope: drag the same slider — must write layers[0].circle.hover.
  // (Hover's bounds are [-0.5, 0.8] — pick an in-range value that differs from
  // the merged 0.85 or React's value tracker won't emit a change.)
  scopeBtn("Avatar ring only").click();
  await new Promise((r) => setTimeout(r, 120));
  const gap2 = findSlider("Hover gap");
  if (gap2) { drag(gap2, 0.5); await new Promise((r) => setTimeout(r, 120)); }
  ck("circle edit writes layers[0].circle.hover", spec().layers[0].circle.hover === 0.5, String(spec().layers[0].circle?.hover));
  ck("circle edit leaves shared base", spec().layers[0].hover === -0.62, String(spec().layers[0].hover));

  // both scope: drag — must write the shared value and drop the overrides
  scopeBtn("Both views").click();
  await new Promise((r) => setTimeout(r, 120));
  const gap3 = findSlider("Hover gap");
  if (gap3) { drag(gap3, 0.6); await new Promise((r) => setTimeout(r, 120)); }
  ck("both edit writes shared hover", spec().layers[0].hover === 0.6, String(spec().layers[0].hover));
  ck("both edit clears body override", spec().layers[0].body?.hover === undefined, JSON.stringify(spec().layers[0].body));
  ck("both edit clears circle override", spec().layers[0].circle?.hover === undefined, JSON.stringify(spec().layers[0].circle));

  // copy spec includes overrides (draft still in AURA_FX — serialize it)
  return out;
});
for (const c of results.checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}  ${c.detail || ""}`);
const failed = results.checks.filter((c) => !c.ok).length;

// editor screenshot in body scope with an active override
await page.evaluate(async () => {
  const mod = window.__mod;
  const fmt = await import(window.__modUrl("specFormat.js"));
  mod.AURA_FX.ossuary = fmt.applyScopedEdit(mod.AURA_FX.ossuary, ["layers", 0, "hover"], 0.3, "body");
  [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Body figure only")?.click();
});
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, "7i-scope-editor-body.png") });
await browser.close();
console.log(failed ? `FAIL: ${failed} checks` : "ALL CHECKS PASS");
process.exit(failed ? 1 : 0);
