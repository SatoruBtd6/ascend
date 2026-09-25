// 7k Part 1: contact sheet + per-aura audit. Renders every FX-bearing aura at a
// mid-animation frame (f90) on a REAL avatar image: ring view (76px avatar,
// dark and light), board-32, and body figure. Groups by rarity tier, labels
// with display names. Also emits a JSON audit row per aura: spec shape/layer
// summary and ring-view visibility numbers.
//   node scripts/aura-7k-audit.mjs [--base http://localhost:5174]
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
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
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "baselines", "ascend-7k");
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "http://localhost:5174";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${base}/?auras=1`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => Promise.all([import("/src/auras/AuraCanvas.jsx"), import("/src/auras/catalog.js")]).then(([m, cat]) => {
  if (m.AuraLoop.raf) cancelAnimationFrame(m.AuraLoop.raf);
  m.AuraLoop.raf = null; m.AuraLoop.set.clear();
  window.__mod = m; window.__cat = cat;
  let rs = 0;
  window.__seed = (v) => { rs = v; Math.random = () => (rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0) / 4294967296; };
}));

const data = await page.evaluate(async () => {
  const mod = window.__mod, cat = window.__cat;
  // real avatar + figure images
  const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  const avatar = await load("/avatars/E.webp");
  const figure = await load("/avatars/E.webp");

  const render = (aura, mode, w, h, frames = 90) => {
    window.__seed(0x9e3779b9);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = h;
    const hasOver = mod.auraNeedsOver(aura);
    const inst = mod.makeAura(cv, { aura, w, h, mode, ringR: Math.min(w, h) / 3.456, overCanvas: hasOver ? cv2 : null, figure: mode === "body" ? "/avatars/E.webp" : undefined });
    if (!inst) return null;
    for (let f = 0; f < frames; f++) inst.frame(1 / 60);
    return { main: cv, over: hasOver ? cv2 : null };
  };

  const rows = [];
  const ringImgs = {};
  for (const a of cat.AURAS) {
    if (a.id === "none") continue;
    const fx = mod.AURA_FX[cat.resolveAuraId ? cat.resolveAuraId(a.id) : a.id];
    if (!fx) continue;
    const spec = (typeof fx === "function" ? null : fx) || {};
    const layers = (spec.layers || []).map((L) => `${L.k}:${L.shape || "dot"}x${L.n}`).join(", ");
    const n = (spec.layers || []).reduce((s, L) => s + (L.n || 0), 0);
    const shapes = [...new Set((spec.layers || []).map((L) => L.shape || "dot"))].join(",");
    const art = !!(spec.art || spec.overArt || (spec.layers || []).some((L) => L.shape === "img" || L.img));
    const moment = !!(spec.moment || (spec.layers || []).some((L) => L.moment));
    // ring render on real avatar — 141 device px = 76 CSS px @ ~1.85 dpr
    const r = render(a.id, "circle", 141, 141);
    if (!r) continue;
    // visibility: inside the aura disc (r <= w/2) — share of pixels with
    // luminance >= 25 ("visibly lit"), and mean luminance of the disc.
    const d = r.main.getContext("2d").getImageData(0, 0, 141, 141).data;
    let lit = 0, sum = 0, npx = 0;
    const cx = 70.5, cy = 70.5, R = 70.5;
    for (let y = 0; y < 141; y++) for (let x = 0; x < 141; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > R * R) continue;
      const i = (y * 141 + x) * 4, al = d[i + 3] / 255;
      const lum = al * (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
      npx++; sum += lum;
      if (lum >= 25) lit++;
    }
    // composite ring view onto avatar image (circular clip) — this is the
    // honest "what it looks like on the profile" view
    const comp = (bg) => {
      const c = document.createElement("canvas"); c.width = c.height = 141;
      const g = c.getContext("2d");
      g.fillStyle = bg; g.fillRect(0, 0, 141, 141);
      if (avatar) {
        g.save(); g.beginPath(); g.arc(70.5, 70.5, 62, 0, Math.PI * 2); g.clip();
        g.drawImage(avatar, 8.5, 8.5, 124, 124); g.restore();
      }
      g.drawImage(r.main, 0, 0);
      if (r.over) g.drawImage(r.over, 0, 0);
      return c;
    };
    ringImgs[a.id] = { dark: comp("#0b0e16").toDataURL(), light: comp("#eef1f7").toDataURL() };
    const b = render(a.id, "circle", 59, 59);
    const fb = render(a.id, "body", 128, 163);
    const figComp = (() => {
      const c = document.createElement("canvas"); c.width = 128; c.height = 163;
      const g = c.getContext("2d");
      g.fillStyle = "#0b0e16"; g.fillRect(0, 0, 128, 163);
      if (figure) g.drawImage(figure, 0, 0, 128, 163);
      if (b) { /* noop */ }
      if (fb) { g.drawImage(fb.main, 0, 0); if (fb.over) g.drawImage(fb.over, 0, 0); }
      return c;
    })();
    const boardComp = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 59;
      const g = c.getContext("2d");
      g.fillStyle = "#0b0e16"; g.fillRect(0, 0, 59, 59);
      if (avatar) { g.save(); g.beginPath(); g.arc(29.5, 29.5, 24, 0, Math.PI * 2); g.clip(); g.drawImage(avatar, 5.5, 5.5, 48, 48); g.restore(); }
      if (b) { g.drawImage(b.main, 0, 0); if (b.over) g.drawImage(b.over, 0, 0); }
      return c;
    })();
    rows.push({
      id: a.id, name: a.name, tier: a.tier || null, group: a.group, rarity: a.rarity || (a.tier ? `rank${a.tier}` : a.group),
      how: a.how, layers, shapes, n, art, moment,
      litFrac: +(lit / npx).toFixed(4), meanLum: +(sum / npx).toFixed(1),
      board: boardComp.toDataURL(), fig: figComp.toDataURL(),
    });
  }
  return { rows, ringImgs };
});

writeFileSync(join(OUT, "audit.json"), JSON.stringify(data.rows.map(({ board, fig, ...r }) => r), null, 1));

// contact sheet: per aura row = [ring-dark | ring-light | board32 | figure], grouped by tier
const sheet = await page.evaluate(async ({ rows, ringImgs }) => {
  const im = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
  const TIER_ORDER = { rank1: 1, rank2: 2, rank3: 3, rank4: 4, rank5: 5, rank6: 6, feat: 7, boss: 8, special: 9, uncommon: 10, epic: 11, legendary: 12, mythic: 13, gilded: 14, secret: 15, soon: 16 };
  const TIER_LABEL = { rank1: "Rank D (tier 1)", rank2: "Rank C", rank3: "Rank B", rank4: "Rank A", rank5: "Rank S", rank6: "Rank SS", feat: "Feat", boss: "Boss drops", special: "Special", uncommon: "Crate uncommon", epic: "Crate epic", legendary: "Crate legendary", mythic: "Crate mythic", gilded: "Crate gilded", secret: "Crate secret", soon: "Soon" };
  const groups = new Map();
  for (const r of rows) { const g = r.rarity; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(r); }
  const ordered = [...groups.entries()].sort((a, b) => (TIER_ORDER[a[0]] || 99) - (TIER_ORDER[b[0]] || 99));
  const rowH = 118, headH = 26, nameW = 120, ring = 100, board = 52, fig = 72;
  const W = nameW + ring * 2 + board + fig + 60;
  const H = ordered.reduce((s, [, rs]) => s + headH + rs.length * rowH, 40);
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#141824"; g.fillRect(0, 0, W, H);
  g.font = "bold 13px sans-serif"; g.fillStyle = "#e8ecf4"; g.textAlign = "left";
  g.fillText("7k contact sheet — [ring-dark | ring-light | board32 | figure] @ f90", 12, 24);
  let y = 40;
  for (const [tier, rs] of ordered) {
    g.fillStyle = "#8fa3c8"; g.font = "bold 12px sans-serif";
    g.fillText(TIER_LABEL[tier] || tier, 12, y + 15); y += headH;
    for (const r of rs) {
      let x = nameW;
      g.fillStyle = "#e8ecf4"; g.font = "11px sans-serif";
      g.fillText(r.name, 12, y + rowH / 2 - 8, nameW - 16);
      g.fillStyle = "#8fa3c8"; g.font = "9px monospace";
      g.fillText(r.id, 12, y + rowH / 2 + 8, nameW - 16);
      const rd = await im(ringImgs[r.id].dark), rl = await im(ringImgs[r.id].light), bd = await im(r.board), fg = await im(r.fig);
      g.drawImage(rd, x, y + (rowH - ring) / 2, ring, ring); x += ring + 6;
      g.drawImage(rl, x, y + (rowH - ring) / 2, ring, ring); x += ring + 6;
      g.drawImage(bd, x, y + (rowH - board) / 2, board, board); x += board + 6;
      g.drawImage(fg, x, y + (rowH - fig * 1.27) / 2, fig, fig * 1.27); x += fig;
      y += rowH;
    }
  }
  return cv.toDataURL("image/png").split(",")[1];
}, { rows: data.rows, ringImgs: data.ringImgs });

writeFileSync(join(OUT, "contact-sheet.png"), Buffer.from(sheet, "base64"));
console.log(`rows: ${data.rows.length}`);
console.log(`sheet -> ${join(OUT, "contact-sheet.png")}`);
console.log(`audit -> ${join(OUT, "audit.json")}`);
for (const r of data.rows) console.log(`${r.id.padEnd(15)} ${r.rarity.padEnd(10)} n=${String(r.n).padEnd(3)} lit=${(r.litFrac * 100).toFixed(1)}% lum=${r.meanLum}`);
await browser.close();
