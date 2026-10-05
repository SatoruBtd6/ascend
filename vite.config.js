import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function swPrecache() {
  let outDir = "dist";
  let root = "";
  return {
    name: "ascend-sw-precache",
    apply: "build",
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); root = c.root; },
    closeBundle() {
      const assetsDir = join(outDir, "assets");
      // closeBundle runs even when the write already failed — a missing
      // assets dir means that happened, so warn and get out of the way of
      // the real error instead of masking it (which is how a bad import
      // shipped as an ENOENT on dist/assets).
      if (!existsSync(assetsDir)) {
        this.warn("sw precache: no dist/assets — bundle never wrote; skipping");
        return;
      }
      const hashed = readdirSync(assetsDir)
        .filter((n) => /\.(js|css)$/.test(n) && !n.endsWith(".map"))
        .sort()
        .map((n) => `/assets/${n}`);
      if (!hashed.length) throw new Error("sw precache: no hashed js/css in dist/assets");
      const swPath = join(outDir, "sw.js");
      if (!existsSync(swPath)) throw new Error("sw precache: dist/sw.js missing — public/sw.js was not copied");
      const sw = readFileSync(swPath, "utf8");
      if (!/const PRECACHE = \[/.test(sw)) throw new Error("sw.js missing PRECACHE");
      const appVersion = readFileSync(join(root, "src/appStay.js"), "utf8").match(/APP_VERSION = "([^"]+)"/)?.[1];
      if (!appVersion) throw new Error("sw precache: APP_VERSION not found in src/appStay.js");
      const next = sw
        .replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = ${JSON.stringify(hashed)};`)
        .replace(/const VERSION = "[^"]*";/, `const VERSION = "ascend-v${appVersion}";`);
      if (!next.includes(`const VERSION = "ascend-v${appVersion}";`)) throw new Error("sw precache: VERSION line was not rewritten");
      writeFileSync(swPath, next);
    },
  };
}

export default defineConfig({
  plugins: [react(), swPrecache()],
  server: {
    watch: { ignored: ["**/dist/**", "**/node_modules/**"] },
  },
});
