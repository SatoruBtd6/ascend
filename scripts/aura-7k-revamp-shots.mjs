// 7k revamp evidence: for each aura — ring view on the real avatar (dark +
// light), board-32, body figure, two frames each (f90/f120), plus a reduced-
// motion ring shot, edge-clip scan, and loop p95 at board-32 / 4x CPU.
// Composite matches the app: aura main canvas BEHIND the avatar (photo r=38 on
// the 141px ring canvas, r=16 on the 59px board tile), `over` canvas in front.
// Body mode already contains the figure via anchors; avatar drawn for context.
// Writes evidence/7k/<aura>-<tag>.png (gitignored).
//   node scripts/aura-7k-revamp-shots.mjs ember,stormstep --tag before [--spec before.json] [--base ...] [--perf]
//   node scripts/aura-7k-revamp-shots.mjs shots [--only id,id]   (aura:shots)
//   node scripts/aura-7k-revamp-shots.mjs perf [--only id,id] [--runs N]   (aura:perf)
// --spec file: { "id": <spec> } — replaces AURA_FX[id] in-page before rendering
//   (use to render "before" shots without reverting source).
// Command modes (shots/perf) start their own vite server on the current tree
// (port 5180, D4) and write evidence/<cmd>/<date-time>/.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";

async function loadChromium() {
  const dir = join(process.cwd(), "node_modules", "playwright-core");
  if (existsSync(join(dir, "index.js"))) {
    try { const m = await import(pathToFileURL(join(dir, "index.js")).href); if (m.chromium || m.default?.chromium) return m.chromium || m.default.chromium; } catch {}
    try { const m = createRequire(join(dir, "package.json"))("playwright-core"); if (m.chromium) return m.chromium; } catch {}
  }
  return (await import("playwright-core")).chromium;
}
const args0 = process.argv.slice(2);
const MODE = ["shots", "perf"].includes(args0[0]) ? args0[0] : null;
const args = MODE ? args0.slice(1) : args0;
const argList = (f) => (args.includes(f) ? args[args.indexOf(f) + 1].split(",") : null);
const ONLY = argList("--only");
const RUNS = +(args.find((a) => a.startsWith("--runs="))?.slice(7) || 3);
const auras = ONLY || (args[0] && !args[0].startsWith("--") ? args[0].split(",") : (MODE ? null : ["ember"]));
const tag = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : "shot";
const specFile = args.includes("--spec") ? JSON.parse(readFileSync(args[args.indexOf("--spec") + 1], "utf8")) : null;
const PERF = args.includes("--perf") || MODE === "perf";
const MOMENT = args.includes("--moment") || MODE === "perf"; // --perf --moment: measure frames inside the forced moment
const FRAMES = [90, 120];

let base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";
let OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "evidence", "7k");
const header = [];
const hline = (s) => { header.push(s); console.log(s); };
if (MODE) {
  // aura:shots / aura:perf — self-serve the current tree on 5180 (D4). A
  // --base override skips the managed server for ad-hoc comparisons.
  if (!args.includes("--base")) {
    assertPortFree(CURR_PORT);
    startVite(REPO, CURR_PORT);
    await waitReady(CURR_URL);
    base = CURR_URL;
  }
  OUT = evidenceDir(MODE === "perf" ? "aura-perf" : "aura-shots");
  const cCommit = git(REPO, "rev-parse --short HEAD");
  const dirty = git(REPO, "status --porcelain");
  hline(`aura:${MODE}`);
  hline(`current:  ${REPO} (${cCommit}${dirty ? " + dirty" : ""})`);
  hline(`server:   ${base}`);
}
mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx0 = await browser.newContext();
const page = await ctx0.newPage();
if (PERF) { const cdp = await ctx0.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate((specFile) => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  if (specFile) for (const [id, spec] of Object.entries(specFile)) m.AURA_FX[id] = spec;
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
}), specFile);

// Command modes with no list cover every FX-bearing catalog aura.
const known = await page.evaluate(() => {
  const m = window.__mod, cat = window.__cat;
  const resolve = cat.resolveAuraId || ((id) => id);
  return cat.AURAS.map((a) => a.id).filter((id) => m.AURA_FX[resolve(id)]);
});
const list = (auras || known).filter((id) => known.includes(id));
if (MODE) hline(`auras:    ${list.length}${ONLY ? ` (--only ${ONLY.join(",")})` : ""}`);

const res = MODE === "perf" ? { out: {}, stats: {} } : await page.evaluate(async ({ auras, FRAMES }) => {
  const mod = window.__mod;
  const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const avatar = await load("/avatars/E.webp");
  const render = (aura, mode, w, h, frames, reduce) => {
    window.__seed(0x9e3779b9);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = h;
    const hasOver = mod.auraNeedsOver(aura);
    const inst = mod.makeAura(cv, { aura, w, h, mode, ringR: Math.min(w, h) / 3.456, overCanvas: hasOver ? cv2 : null, figure: mode === "body" ? "/avatars/E.webp" : undefined, reduce });
    if (!inst) return null;
    for (let f = 0; f < frames; f++) inst.frame(1 / 60);
    return { main: cv, over: hasOver ? cv2 : null };
  };
  const edge = (cv) => {
    const w = cv.width, h = cv.height, d = cv.getContext("2d").getImageData(0, 0, w, h).data;
    let e = 0;
    for (let x = 0; x < w; x++) e += d[x * 4 + 3] + d[((h - 1) * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) e += d[(y * w) * 4 + 3] + d[(y * w + w - 1) * 4 + 3];
    return e;
  };
  // avatar occupies the central photo circle; aura main renders behind it.
  const ringComp = (r, bg, size, photoR) => {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = bg; g.fillRect(0, 0, size, size);
    g.drawImage(r.main, 0, 0);
    if (avatar) { g.save(); g.beginPath(); g.arc(size / 2, size / 2, photoR, 0, Math.PI * 2); g.clip(); g.drawImage(avatar, size / 2 - photoR, size / 2 - photoR, photoR * 2, photoR * 2); g.restore(); }
    if (r.over) g.drawImage(r.over, 0, 0);
    return c;
  };
  const out = {};
  const stats = {};
  for (const aura of auras) {
    // register + warm lazy images (ophanim wings, img layers) so captures
    // match what users see — frames run synchronously, so loading needs a
    // real wait between makeAura and the captures
    render(aura, "circle", 141, 141, 5, false);
    for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    const cells = {};
    for (const f of FRAMES) {
      const rd = render(aura, "circle", 141, 141, f, false);
      const rl = render(aura, "circle", 141, 141, f, false);
      cells[`ring-dark-f${f}`] = ringComp(rd, "#0b0e16", 141, 38).toDataURL();
      cells[`ring-light-f${f}`] = ringComp(rl, "#eef1f7", 141, 38).toDataURL();
      const b = render(aura, "circle", 59, 59, f, false);
      cells[`board-f${f}`] = ringComp(b, "#0b0e16", 59, 16).toDataURL();
      const fb = render(aura, "body", 128, 163, f, false);
      const fc = document.createElement("canvas"); fc.width = 128; fc.height = 163;
      const fg = fc.getContext("2d"); fg.fillStyle = "#0b0e16"; fg.fillRect(0, 0, 128, 163);
      fg.drawImage(fb.main, 0, 0);
      if (avatar) fg.drawImage(avatar, 0, 0, 128, 163);
      if (fb.over) fg.drawImage(fb.over, 0, 0);
      cells[`figure-f${f}`] = fc.toDataURL();
      if (f === FRAMES[0]) {
        stats[aura] = { edgeRing: edge(rd.main) + (rd.over ? edge(rd.over) : 0), edgeBoard: edge(b.main) + (b.over ? edge(b.over) : 0), edgeFig: edge(fb.main) + (fb.over ? edge(fb.over) : 0) };
      }
    }
    const rm = render(aura, "circle", 141, 141, 90, true);
    cells["ring-dark-reduced"] = ringComp(rm, "#0b0e16", 141, 38).toDataURL();
    out[aura] = cells;
  }
  return { out, stats };
}, { auras: list, FRAMES });

for (const [aura, cells] of Object.entries(res.out)) {
  const b64 = await page.evaluate(async ({ cells }) => {
    const names = Object.keys(cells);
    const ims = await Promise.all(names.map((n) => new Promise((r) => { const im = new Image(); im.onload = () => r({ n, im }); im.src = cells[n]; })));
    const cols = 5, cellW = 150, cellH = 180;
    const rows = Math.ceil(names.length / cols);
    const cv = document.createElement("canvas"); cv.width = cols * cellW; cv.height = rows * cellH;
    const g = cv.getContext("2d");
    g.fillStyle = "#141824"; g.fillRect(0, 0, cv.width, cv.height);
    g.font = "9px monospace"; g.textAlign = "center"; g.fillStyle = "#e8ecf4";
    ims.forEach(({ n, im }, i) => {
      const x = (i % cols) * cellW, y = Math.floor(i / cols) * cellH;
      const sc = Math.min((cellW - 10) / im.width, (cellH - 20) / im.height);
      g.drawImage(im, x + (cellW - im.width * sc) / 2, y + 16 + (cellH - 20 - im.height * sc) / 2, im.width * sc, im.height * sc);
      g.fillText(n, x + cellW / 2, y + 11);
    });
    return cv.toDataURL("image/png").split(",")[1];
  }, { cells });
  writeFileSync(join(OUT, `${aura}-${tag}.png`), Buffer.from(b64, "base64"));
  // Edge alpha is INFO, never PASS/FAIL (D2): a 3px spark can touch the edge.
  console.log(`${aura}-${tag}.png  INFO edges: ring=${res.stats[aura].edgeRing} board=${res.stats[aura].edgeBoard} fig=${res.stats[aura].edgeFig}`);
}

let fails = 0;
if (PERF) {
  if (MODE === "perf") {
    // Perf-only run: no shot cells rendered, so warm lazy images here the
    // same way the grid does — otherwise img layers never resolve and the
    // numbers wouldn't match a shots+perf session.
    await page.evaluate(async (list) => {
      const mod = window.__mod;
      for (const aura of list) {
        const cv = document.createElement("canvas"); cv.width = cv.height = 141;
        const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
        const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
        if (inst) for (let f = 0; f < 5; f++) inst.frame(1 / 60);
      }
      for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
    }, list);
    hline(`rounds:   ${RUNS} (median reported; budget avg <= 0.6 ms, p95 info only)`);
  }
  const rounds = MODE === "perf" ? RUNS : 1;
  const runs = Object.fromEntries(list.map((a) => [a, []]));
  for (let round = 1; round <= rounds; round++) {
    for (const aura of list) {
      const r = await page.evaluate(async ({ aura, MOMENT }) => {
        const mod = window.__mod;
        const cv = document.createElement("canvas"); cv.width = cv.height = 59;
        const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 59;
        const inst = mod.makeAura(cv, { aura, w: 59, h: 59, mode: "circle", ringR: 17.2, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
        for (let f = 0; f < 60; f++) inst.frame(1 / 60);
        if (MOMENT) inst.forceMoment?.();
        // Quiet per-frame timing: one tight loop, no awaits — the old batched
        // loop yielded via setTimeout(0) between samples and landed scheduling
        // debt in the p95 tail.
        const times = [];
        for (let f = 0; f < 400; f++) {
          if (MOMENT && inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment?.();
          const t0 = performance.now();
          inst.frame(1 / 60);
          times.push(performance.now() - t0);
        }
        times.sort((a, b) => a - b);
        return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3) };
      }, { aura, MOMENT });
      runs[aura].push(r);
      // budget: avg <= 0.6 ms (median of 3 runs); p95 is informational
      console.log(MODE === "perf"
        ? `  round ${round}: ${aura} avg=${r.avg} p95=${r.p95}`
        : `  perf ${aura}${MOMENT ? " (moment)" : ""}: avg=${r.avg} p95=${r.p95}${r.avg > 0.6 ? "  <-- OVER 0.6ms avg" : ""}`);
    }
  }
  if (MODE === "perf") {
    const med = (vals) => [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    console.log("");
    const lines = [];
    for (const aura of list) {
      const avg = med(runs[aura].map((r) => r.avg)), p95 = med(runs[aura].map((r) => r.p95));
      const ok = avg <= 0.6;
      if (!ok) fails++;
      const line = `${ok ? "PASS" : "FAIL"} ${aura.padEnd(14)} avg=${avg.toFixed(3)} ms (limit 0.6)  p95=${p95.toFixed(3)} (info)`;
      lines.push(line); console.log(line);
    }
    const summary = `${list.length} auras: ${list.length - fails} pass, ${fails} fail`;
    console.log(`\n${summary}`);
    writeFileSync(join(OUT, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
  }
}
if (MODE) console.log(`evidence: ${OUT}`);
await browser.close();
if (MODE) stopServers();
if (MODE === "perf") process.exit(fails ? 1 : 0);
