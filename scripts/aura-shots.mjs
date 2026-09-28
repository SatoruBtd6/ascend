// 7k revamp evidence: for each aura — ring view on the real avatar (dark +
// light), board-32, body figure, two frames each (f90/f120), plus a reduced-
// motion ring shot, edge-clip scan, and loop p95 at board-32 / 4x CPU.
// Composite matches the app: aura main canvas BEHIND the avatar (photo r=38 on
// the 141px ring canvas, r=16 on the 59px board tile), `over` canvas in front.
// Body mode already contains the figure via anchors; avatar drawn for context.
// Writes evidence/7k/<aura>-<tag>.png (gitignored).
//   node scripts/aura-shots.mjs ember,stormstep --tag before [--spec before.json] [--base ...] [--perf]
//   node scripts/aura-shots.mjs shots [--only id,id] [--strip id,id]   (aura:shots)
//   node scripts/aura-shots.mjs perf [--only id,id] [--runs N] [--ab]   (aura:perf)
// perf --ab: A = baseline worktree (5181) vs B = current (5180), alternating
//   per aura in one session; FAIL only if B is >15% AND >0.05 ms above A.
// --spec file: { "id": <spec> } — replaces AURA_FX[id] in-page before rendering
//   (use to render "before" shots without reverting source).
// Command modes (shots/perf) start their own vite server on the current tree
// (port 5180, D4) and write evidence/<cmd>/<date-time>/.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { REPO, CURR_URL, CURR_PORT, BASE_URL, BASE_PORT, baselineDir, git, assertPortFree, startVite, waitReady, evidenceDir, stopServers } from "./aura-lib.mjs";
import { GRANDFATHERED, KNOWN_OVER, PERF_REF, RATIO_BUDGET, P7M_FAIL_EXEMPT } from "./aura-sets.mjs";

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
const STRIP = argList("--strip");
const AB = args.includes("--ab"); // perf --ab: baseline (A) vs current (B), alternating per aura
const RUNS = +(args.find((a) => a.startsWith("--runs="))?.slice(7) || (AB ? 5 : 3));
// --size ring (7m): measure the loud version at real profile geometry — after
// small: opt-ins land, board-32 measures the quiet recipe. Ring numbers are a
// separate series (labelled ring-141), never compared to board-32 medians.
const SIZE = args.includes("--size") ? args[args.indexOf("--size") + 1] : "board";
const SIZES = {
  board: { w: 59, h: 59, ringR: 17.2, label: "board-32 (59px)" },
  ring: { w: 141, h: 141, ringR: 141 / 3.456, label: "ring-141 (141px)" },
};
if (!SIZES[SIZE]) { console.error(`unknown --size "${SIZE}" — board|ring`); process.exit(1); }
const SZ = SIZES[SIZE];
// --ab regression guard (D15): FAIL only if current is more than AB_MAX_PCT%
// AND more than AB_MAX_MS slower than the same-session baseline median.
const AB_MAX_MS = 0.05, AB_MAX_PCT = 15;
const auras = STRIP || ONLY || (args[0] && !args[0].startsWith("--") && args[0] !== "--ab" ? args[0].split(",") : (MODE ? null : ["ember"]));
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
  if (MODE === "perf" && AB) {
    // A = the pinned baseline worktree (v7k), served side by side on 5181.
    const bdir = baselineDir();
    if (!existsSync(bdir)) { console.error(`baseline worktree ${bdir} does not exist — see aura:baseline`); process.exit(1); }
    const bTag = git(bdir, "tag --points-at HEAD");
    assertPortFree(BASE_PORT);
    startVite(bdir, BASE_PORT);
    await waitReady(BASE_URL);
    hline(`A server: ${BASE_URL} (baseline ${bdir} @ ${git(bdir, "rev-parse --short HEAD")}${bTag ? " " + bTag : ""}${git(bdir, "status --porcelain") ? " + dirty" : ""})`);
  }
}
mkdirSync(OUT, { recursive: true });

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx0 = await browser.newContext();
const page = await ctx0.newPage();
if (PERF) { const cdp = await ctx0.newCDPSession(page); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 }); }
let pageA = null;
if (MODE === "perf" && AB) {
  const ctxA = await browser.newContext();
  pageA = await ctxA.newPage();
  const cdp = await ctxA.newCDPSession(pageA); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
if (pageA) await pageA.goto(`${BASE_URL}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate((specFile) => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  if (specFile) for (const [id, spec] of Object.entries(specFile)) m.AURA_FX[id] = spec;
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
}), specFile);
if (pageA) await pageA.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
}));

// Command modes with no list cover every FX-bearing catalog aura.
const known = await page.evaluate(() => {
  const m = window.__mod, cat = window.__cat;
  const resolve = cat.resolveAuraId || ((id) => id);
  return cat.AURAS.map((a) => a.id).filter((id) => m.AURA_FX[resolve(id)]);
});
const list = (auras || known).filter((id) => known.includes(id));
if (MODE) hline(`auras:    ${list.length}${STRIP ? ` (--strip ${STRIP.join(",")})` : ONLY ? ` (--only ${ONLY.join(",")})` : ""}`);

if (MODE === "shots" && STRIP) {
  // --strip: one side-by-side ring-size strip on the real avatar — the
  // look-alike check. Warm each aura's lazy images before its capture.
  const cells = await page.evaluate(async ({ ids }) => {
    const mod = window.__mod;
    const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
    const avatar = await load("/avatars/E.webp");
    const render = (aura, frames) => {
      window.__seed(0x9e3779b9);
      const cv = document.createElement("canvas"); cv.width = cv.height = 141;
      const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
      const hasOver = mod.auraNeedsOver(aura);
      const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: hasOver ? cv2 : null });
      if (!inst) return null;
      for (let f = 0; f < frames; f++) inst.frame(1 / 60);
      return { main: cv, over: hasOver ? cv2 : null };
    };
    const ringComp = (r) => {
      const c = document.createElement("canvas"); c.width = c.height = 141;
      const g = c.getContext("2d");
      g.fillStyle = "#0b0e16"; g.fillRect(0, 0, 141, 141);
      g.drawImage(r.main, 0, 0);
      if (avatar) { g.save(); g.beginPath(); g.arc(70.5, 70.5, 38, 0, Math.PI * 2); g.clip(); g.drawImage(avatar, 32.5, 32.5, 76, 76); g.restore(); }
      if (r.over) g.drawImage(r.over, 0, 0);
      return c;
    };
    const out = [];
    for (const id of ids) {
      render(id, 5); // registers lazy image records
      for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((x) => x.ready || x.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
      const r = render(id, 90);
      out.push(r ? ringComp(r).toDataURL() : null);
    }
    return out;
  }, { ids: list });
  const stripB64 = await page.evaluate(async ({ cells, ids }) => {
    const ims = await Promise.all(cells.map((u) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u; })));
    const cellW = 150;
    const cv = document.createElement("canvas"); cv.width = ids.length * cellW; cv.height = 164;
    const g = cv.getContext("2d");
    g.fillStyle = "#141824"; g.fillRect(0, 0, cv.width, cv.height);
    g.font = "10px monospace"; g.textAlign = "center"; g.fillStyle = "#e8ecf4";
    ims.forEach((im, i) => { if (im) g.drawImage(im, i * cellW + (cellW - 141) / 2, 8); g.fillText(ids[i], i * cellW + cellW / 2, 158); });
    return cv.toDataURL("image/png").split(",")[1];
  }, { cells, ids: list });
  const name = `strip-${list.join("-")}.png`;
  writeFileSync(join(OUT, name), Buffer.from(stripB64, "base64"));
  console.log(`${name} — ${list.length} auras, ring view on /avatars/E.webp`);
  console.log(`evidence: ${OUT}`);
  await browser.close();
  stopServers();
  process.exit(0);
}

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
      const c52 = render(aura, "circle", 52, 52, f, false);
      cells[`crew52-f${f}`] = ringComp(c52, "#0b0e16", 52, 14).toDataURL();
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
    // opaque-square photo: the photo region drawn as an unclipped opaque
    // square, so the proof that the ring carries the read doesn't lean on a
    // circular crop hiding the aura's own centre
    const sq = render(aura, "circle", 141, 141, 90, false);
    const scv = document.createElement("canvas"); scv.width = scv.height = 141;
    const sg = scv.getContext("2d");
    sg.fillStyle = "#0b0e16"; sg.fillRect(0, 0, 141, 141);
    sg.drawImage(sq.main, 0, 0);
    if (avatar) sg.drawImage(avatar, 70.5 - 38, 70.5 - 38, 76, 76);
    if (sq.over) sg.drawImage(sq.over, 0, 0);
    cells["ring-square-f90"] = scv.toDataURL();
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

// Moment filmstrip (7m part 4): for every aura with a moment, an 8-frame
// strip spanning the whole moment at ring size, composited on the real
// avatar. Two passes per aura: one counts the moment's frame length, the
// second re-seeds, force-fires and captures eight evenly-spaced frames.
if (MODE === "shots") for (const aura of list) {
  const film = await page.evaluate(async ({ aura }) => {
    const mod = window.__mod;
    const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
    const avatar = await load("/avatars/E.webp");
    const hasOver = mod.auraNeedsOver(aura);
    const mk = () => {
      window.__seed(0x9e3779b9);
      const cv = document.createElement("canvas"); cv.width = cv.height = 141;
      const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
      const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: hasOver ? cv2 : null });
      return { inst, main: cv, over: hasOver ? cv2 : null };
    };
    const comp = (r) => {
      const c = document.createElement("canvas"); c.width = c.height = 141;
      const g = c.getContext("2d");
      g.fillStyle = "#0b0e16"; g.fillRect(0, 0, 141, 141);
      g.drawImage(r.main, 0, 0);
      if (avatar) { g.save(); g.beginPath(); g.arc(70.5, 70.5, 38, 0, Math.PI * 2); g.clip(); g.drawImage(avatar, 32.5, 32.5, 76, 76); g.restore(); }
      if (r.over) g.drawImage(r.over, 0, 0);
      return c;
    };
    const probe = mk();
    if (typeof probe.inst.forceMoment !== "function") return null;
    // forceMoment arms the moment on the NEXT frame() — count only frames
    // where inst.moment is live, from first activation until it clears.
    probe.inst.forceMoment();
    let F = 0, started = false;
    for (let guard = 0; guard < 60 * 12; guard++) {
      probe.inst.frame(1 / 60);
      if (probe.inst.moment != null) { started = true; F++; }
      else if (started) break;
    }
    if (!started || !F) return null;
    const shot = mk();
    shot.inst.forceMoment();
    const N = 8, picks = new Set();
    for (let k = 0; k < N; k++) picks.add(Math.round(1 + (k * (F - 1)) / (N - 1)));
    const cells = [];
    let mF = 0, seen2 = false;
    for (let guard = 0; guard < 60 * 15 && cells.length < N; guard++) {
      shot.inst.frame(1 / 60);
      if (shot.inst.moment == null) { if (seen2) break; continue; }
      seen2 = true; mF++;
      if (picks.has(mF)) cells.push({ f: mF, png: comp(shot).toDataURL() });
    }
    const ims = await Promise.all(cells.map((c) => new Promise((r) => { const im = new Image(); im.onload = () => r({ ...c, im }); im.src = c.png; })));
    const cellW = 150, cv = document.createElement("canvas");
    cv.width = ims.length * cellW; cv.height = 172;
    const g = cv.getContext("2d");
    g.fillStyle = "#141824"; g.fillRect(0, 0, cv.width, cv.height);
    g.font = "10px monospace"; g.textAlign = "center"; g.fillStyle = "#e8ecf4";
    ims.forEach(({ f, im }, i) => {
      g.drawImage(im, i * cellW + (cellW - 141) / 2, 14);
      g.fillText(`moment f${f}/${F}`, i * cellW + cellW / 2, 164);
    });
    return { png: cv.toDataURL("image/png").split(",")[1], frames: F, n: ims.length };
  }, { aura });
  if (film) {
    writeFileSync(join(OUT, `${aura}-moment-film.png`), Buffer.from(film.png, "base64"));
    console.log(`${aura}-moment-film.png  moment filmstrip: ${film.n} frames across a ${film.frames}-frame moment at ring 141`);
  }
}

// Warm lazy images the same way the grid does — otherwise img layers never
// resolve and the numbers wouldn't match a shots+perf session.
const warmImages = (pg, list) => pg.evaluate(async (list) => {
  const mod = window.__mod;
  for (const aura of list) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 141;
    const cv2 = document.createElement("canvas"); cv2.width = cv2.height = 141;
    const inst = mod.makeAura(cv, { aura, w: 141, h: 141, mode: "circle", ringR: 141 / 3.456, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
    if (inst) for (let f = 0; f < 5; f++) inst.frame(1 / 60);
  }
  for (let t = 0; t < 400; t++) { if ([...mod._auraImageCache.values()].every((r) => r.ready || r.failed)) break; await new Promise((r) => setTimeout(r, 25)); }
}, list);

// Quiet per-frame timing: one tight loop, no awaits — the old batched loop
// yielded via setTimeout(0) between samples and landed scheduling debt in the
// p95 tail.
const measureAura = (pg, aura, MOMENT) => pg.evaluate(async ({ aura, MOMENT, SZ }) => {
  const mod = window.__mod;
  const cv = document.createElement("canvas"); cv.width = SZ.w; cv.height = SZ.h;
  const cv2 = document.createElement("canvas"); cv2.width = SZ.w; cv2.height = SZ.h;
  const inst = mod.makeAura(cv, { aura, w: SZ.w, h: SZ.h, mode: "circle", ringR: SZ.ringR, overCanvas: mod.auraNeedsOver(aura) ? cv2 : null });
  for (let f = 0; f < 60; f++) inst.frame(1 / 60);
  if (MOMENT) inst.forceMoment?.();
  const times = [];
  for (let f = 0; f < 400; f++) {
    if (MOMENT && inst.moment == null && !(inst.momentParts > 0)) inst.forceMoment?.();
    const t0 = performance.now();
    inst.frame(1 / 60);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { avg: +(times.reduce((s, v) => s + v, 0) / times.length).toFixed(3), p95: +times[Math.floor(times.length * 0.95)].toFixed(3) };
}, { aura, MOMENT, SZ });

let fails = 0;
if (PERF) {
  // stormstep is the session reference (D15): measured on every run so each
  // aura's ratio to it is session-normalised.
  const measureList = MODE === "perf" && !list.includes(PERF_REF) ? [...list, PERF_REF] : list;
  if (MODE === "perf") {
    for (const pg of [page, pageA].filter(Boolean)) await warmImages(pg, measureList);
    hline(`size:     ${SZ.label}${SIZE === "ring" ? " — separate series; not comparable to board-32 medians (ceilings are board numbers)" : ""}`);
    hline(`rounds:   ${RUNS} (median reported; ${pageA ? `A=baseline vs B=current — FAIL if B-A > 0.05 ms AND > 15%, one auto re-run` : `ratio budget >${RATIO_BUDGET}x ${PERF_REF} = WARN`}, p95 info only)`);
  }
  const rounds = MODE === "perf" ? RUNS : 1;
  const runs = Object.fromEntries(measureList.map((a) => [a, []]));
  const runsA = pageA ? Object.fromEntries(measureList.map((a) => [a, []])) : null;
  for (let round = 1; round <= rounds; round++) {
    for (const aura of measureList) {
      if (pageA) {
        // alternating A then B per aura — shared session noise hits both
        const ra = await measureAura(pageA, aura, MOMENT);
        runsA[aura].push(ra);
        const r = await measureAura(page, aura, MOMENT);
        runs[aura].push(r);
        console.log(`  round ${round}: ${aura} A avg=${ra.avg} p95=${ra.p95} | B avg=${r.avg} p95=${r.p95}`);
      } else {
        const r = await measureAura(page, aura, MOMENT);
        runs[aura].push(r);
        // budget: avg <= 0.6 ms (median of 3 runs); p95 is informational
        console.log(MODE === "perf"
          ? `  round ${round}: ${aura} avg=${r.avg} p95=${r.p95}`
          : `  perf ${aura}${MOMENT ? " (moment)" : ""}: avg=${r.avg} p95=${r.p95}${SIZE === "board" && r.avg > 0.6 ? "  <-- OVER 0.6ms avg" : ""}`);
      }
    }
  }
  if (MODE === "perf") {
    const med = (vals) => [...vals].sort((a, b) => a - b)[Math.floor(vals.length / 2)];
    // Pinned budget ref (7m proposal 2): under --ab the ratio WARN
    // denominates on the BASELINE side's stormstep median, so a warm or cold
    // current-tree session can't inflate every aura's ratio. Without --ab it
    // stays the live same-session stormstep (an approximation, as before).
    const refMed = runsA ? med(runsA[PERF_REF].map((r) => r.avg)) : med(runs[PERF_REF].map((r) => r.avg));
    const stats = list.map((aura) => ({
      aura,
      avg: med(runs[aura].map((r) => r.avg)),
      p95: med(runs[aura].map((r) => r.p95)),
      aAvg: runsA ? med(runsA[aura].map((r) => r.avg)) : null,
    }));
    // --ab hardening (D15): a borderline fail is re-measured once at RUNS
    // each side; it may only FAIL if it fails both times.
    if (runsA) for (const s of stats) {
      const d = s.avg - s.aAvg, p = (s.avg / s.aAvg - 1) * 100;
      s.delta = d; s.pct = p;
      // 7m rework auras are FAIL-exempt this phase (aura-sets.mjs
      // P7M_FAIL_EXEMPT): they still measure and print, they just can't FAIL
      // — so they skip the noise re-run too. Same for the pinned reference:
      // stormstep runs identical code on both sides, so a delta there is
      // session drift, not regression — WARN, never FAIL.
      if (P7M_FAIL_EXEMPT.has(s.aura)) { s.exempt = d > AB_MAX_MS && p > AB_MAX_PCT; continue; }
      if (s.aura === PERF_REF) { s.refSelf = d > AB_MAX_MS && p > AB_MAX_PCT; continue; }
      if (!(d > AB_MAX_MS && p > AB_MAX_PCT)) continue;
      console.log(`\n  ${s.aura}: first pass Δ${d >= 0 ? "+" : ""}${d.toFixed(3)} (${p >= 0 ? "+" : ""}${p.toFixed(1)}%) — re-running ${RUNS} to rule out noise`);
      const rA2 = [], rB2 = [];
      for (let r = 0; r < RUNS; r++) {
        rA2.push(await measureAura(pageA, s.aura, MOMENT));
        rB2.push(await measureAura(page, s.aura, MOMENT));
      }
      const a2 = med(rA2.map((x) => x.avg)), b2 = med(rB2.map((x) => x.avg));
      s.delta = d; s.pct = p; s.a2 = a2; s.d2 = b2 - a2; s.p2 = (b2 / a2 - 1) * 100;
      s.hardFail = s.d2 > AB_MAX_MS && s.p2 > AB_MAX_PCT;
    }
    console.log("");
    hline(`ref:      ${PERF_REF} median ${refMed.toFixed(3)} ms — ratio >${RATIO_BUDGET}x = WARN${runsA ? "; A/B delta = the FAIL rule" : ""}`);
    const lines = [];
    let warns = 0;
    for (const s of stats) {
      const { aura, avg, p95, aAvg } = s;
      const ratio = refMed > 0 ? avg / refMed : 0;
      const overRatio = aura !== PERF_REF && ratio > RATIO_BUDGET;
      const knownOver = SIZE === "board" && KNOWN_OVER[aura] != null && avg > 0.6;
      let verdict, note;
      if (aAvg != null) {
        const f = (v) => `${v >= 0 ? "+" : ""}${v.toFixed(3)}`;
        const base = `A=${aAvg.toFixed(3)} B=${avg.toFixed(3)} Δ${f(s.delta)} (${s.pct >= 0 ? "+" : ""}${s.pct.toFixed(1)}%) ratio=${ratio.toFixed(2)}x`;
        if (s.exempt) { verdict = "WARN"; note = `${base} — over the FAIL delta; 7m rework aura, exempt until v7m`; }
        else if (s.refSelf) { verdict = "WARN"; note = `${base} — reference aura: identical code on both sides; drift is session noise, not a regression`; }
        else if (s.hardFail) { verdict = "FAIL"; note = `${base} — still over on re-run (Δ${f(s.d2)}, ${s.p2 >= 0 ? "+" : ""}${s.p2.toFixed(1)}%)`; }
        else if (s.d2 != null) { verdict = "PASS"; note = `${base} — noise, passed on re-run (Δ${f(s.d2)}, ${s.p2 >= 0 ? "+" : ""}${s.p2.toFixed(1)}%)`; }
        else if (overRatio || knownOver) { verdict = "WARN"; note = `${base}`; }
        else { verdict = "PASS"; note = `${base}`; }
      } else if (overRatio || knownOver) {
        verdict = "WARN";
        note = `ratio=${ratio.toFixed(2)}x ${PERF_REF}`;
      } else {
        verdict = "PASS";
        note = aura === PERF_REF ? "reference aura" : `ratio=${ratio.toFixed(2)}x ${PERF_REF}`;
      }
      if (GRANDFATHERED[aura] != null) note += ` — ceiling ${GRANDFATHERED[aura].toFixed(3)} info${SIZE === "ring" ? " (board series)" : ""}`;
      if (knownOver) note += ` — revamped in 7k, over 0.6 - trim in next aura phase (v7k median ${KNOWN_OVER[aura].toFixed(3)})`;
      else if (overRatio) note += " — over ratio budget (provisional)";
      if (verdict === "FAIL") fails++;
      if (verdict === "WARN") warns++;
      const line = `${verdict} ${aura.padEnd(14)} avg=${avg.toFixed(3)} ms ${note}  p95=${p95.toFixed(3)} (info)`;
      lines.push(line); console.log(line);
    }
    const summary = `${list.length} auras: ${list.length - fails - warns} pass, ${warns} warn, ${fails} fail`;
    console.log(`\n${summary}`);
    if (runsA) {
      // Whole-set aggregate (7m part 4 item K): mean + median of the per-aura
      // B-A deltas — a systematic couple of percent (e.g. shared-renderer
      // overhead) shows up here even when no single aura tops the list.
      const ds = stats.map((s) => s.delta), ps = stats.map((s) => s.pct);
      const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
      const agg = `delta across ${stats.length} auras: mean ${(mean(ds) >= 0 ? "+" : "")}${mean(ds).toFixed(3)} ms (${(mean(ps) >= 0 ? "+" : "")}${mean(ps).toFixed(1)}%), median ${(med(ds) >= 0 ? "+" : "")}${med(ds).toFixed(3)} ms (${(med(ps) >= 0 ? "+" : "")}${med(ps).toFixed(1)}%)`;
      console.log(agg);
      writeFileSync(join(OUT, "report.txt"), [...header, "", ...lines, "", summary, agg, ""].join("\n"));
    } else {
      writeFileSync(join(OUT, "report.txt"), [...header, "", ...lines, "", summary, ""].join("\n"));
    }
  }
}
if (MODE) console.log(`evidence: ${OUT}`);
await browser.close();
if (MODE) stopServers();
if (MODE === "perf") process.exit(fails ? 1 : 0);
