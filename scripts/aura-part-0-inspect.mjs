// Inspect the DOM around every aura canvas on the current screen.
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
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

const base = process.argv[2] || "http://127.0.0.1:5180";
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" });
const context = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto(base, { waitUntil: "networkidle" });
const email = page.getByPlaceholder("Email");
await email.or(page.getByRole("button", { name: "Train", exact: true })).first().waitFor({ timeout: 40000 });
if (await email.count()) {
  await email.fill(env.TEST_EMAIL);
  await page.getByPlaceholder("Password").fill(env.TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}
await page.getByRole("button", { name: "Train", exact: true }).first().waitFor({ timeout: 40000 });
await sleep(1500);

const dump = await page.evaluate(() => {
  const describe = (el, depth = 0) => {
    if (!el || depth > 6) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === "string" ? el.className.slice(0, 60) : "",
      rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
      pos: cs.position, z: cs.zIndex, ov: cs.overflow, transform: cs.transform === "none" ? "" : cs.transform.slice(0, 60),
      w: el.style?.width || "", h: el.style?.height || "",
      kids: [...el.children].map((k) => describe(k, depth + 1)),
    };
  };
  return [...document.querySelectorAll("canvas")].map((c) => {
    let host = c;
    while (host.parentElement && !host.parentElement.className.includes("relative") && !host.style?.width) host = host.parentElement;
    return { canvas: [c.width, c.height], tree: describe(c.parentElement) };
  });
});
console.log(JSON.stringify(dump, null, 1).slice(0, 12000));
await browser.close();
