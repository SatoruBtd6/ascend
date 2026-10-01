import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

function swPrecache() {
  let outDir = "dist";
  return {
    name: "ascend-sw-precache",
    apply: "build",
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
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
      const next = sw.replace(/const PRECACHE = \[[\s\S]*?\];/, `const PRECACHE = ${JSON.stringify(hashed)};`);
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
