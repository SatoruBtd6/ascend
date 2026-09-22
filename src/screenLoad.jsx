import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import * as D from "./diag.js";
import { C } from "./theme.js";

const loads = new Map();
let bannerOn = false;
const bannerListeners = new Set();

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function emitBanner() {
  bannerListeners.forEach((l) => l());
}
export function showBanner() {
  if (bannerOn) return;
  bannerOn = true;
  D.push({ k: "banner", st: "shown" });
  emitBanner();
}
export function dismissBanner() {
  if (!bannerOn) return;
  bannerOn = false;
  emitBanner();
}
function subscribeBanner(l) {
  bannerListeners.add(l);
  return () => bannerListeners.delete(l);
}
export function useBanner() {
  return useSyncExternalStore(subscribeBanner, () => bannerOn, () => false);
}

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    D.push({ k: "chunk", st: "fail" });
    showBanner();
  });
}

async function importScreen(importer) {
  const m = await importer();
  // Vite's preload helper swallows the failure when vite:preloadError is cancelled,
  // and the import then resolves to undefined instead of rejecting.
  if (!m) throw new Error("empty chunk");
  return m;
}
export function loadScreen(key, importer) {
  const hit = loads.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      return await importScreen(importer);
    } catch {
      D.push({ k: "chunk", st: "fail" });
      await delay(1000);
      D.push({ k: "chunk", st: "retry" });
      try {
        return await importScreen(importer);
      } catch {
        D.push({ k: "chunk", st: "fail" });
        showBanner();
        return { default: NeedsUpdate };
      }
    }
  })();
  loads.set(key, p);
  return p;
}

function lazyName(key, importer, name) {
  return lazy(() => loadScreen(key, importer).then(
    (m) => ({ default: (m && (m[name] || m.default)) || NeedsUpdate }),
    () => { showBanner(); return { default: NeedsUpdate }; }
  ));
}

const trainImp = () => import("./tabs/train/entry.js");
const runImp = () => import("./tabs/run/entry.js");
const fuelImp = () => import("./tabs/fuel/entry.js");
const boardImp = () => import("./tabs/board/entry.js");
const profileImp = () => import("./tabs/profile/entry.js");
const settingsImp = () => import("./tabs/settings/entry.js");

export const Train = lazyName("train", trainImp, "Train");
export const ExercisePage = lazyName("train", trainImp, "ExercisePage");
export const MusclePage = lazyName("train", trainImp, "MusclePage");
export const RestWatchPage = lazyName("train", trainImp, "RestWatchPage");
export const RunTracker = lazyName("run", runImp, "RunTracker");
export const RunHub = lazyName("run", runImp, "RunHub");
export const Fuel = lazyName("fuel", fuelImp, "Fuel");
export const Board = lazyName("board", boardImp, "Board");
export const ProfilePage = lazyName("profile", profileImp, "ProfilePage");
export const SettingsPage = lazyName("settings", settingsImp, "SettingsPage");
export const Assistant = lazyName("settings", settingsImp, "Assistant");
export const IntervalTimer = lazyName("settings", settingsImp, "IntervalTimer");
export const CardDeck = lazyName("settings", settingsImp, "CardDeck");
export const Confetti = lazyName("settings", settingsImp, "Confetti");
export const Onboarding = lazyName("settings", settingsImp, "Onboarding");
export const XpLedger = lazyName("settings", settingsImp, "XpLedger");

const PREFETCH = [
  ["train", trainImp],
  ["run", runImp],
  ["fuel", fuelImp],
  ["board", boardImp],
  ["profile", profileImp],
  ["settings", settingsImp],
];
let prefetchStarted = false;

function whenPrecacheDone() {
  if (!import.meta.env.PROD || typeof navigator === "undefined" || !navigator.serviceWorker) return Promise.resolve();
  const ready = navigator.serviceWorker.ready.then(() => new Promise((resolve) => {
    if (navigator.serviceWorker.controller) resolve();
    else navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
  }));
  return Promise.race([ready, delay(20000)]);
}
function onIdle(fn) {
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") ric(() => fn());
  else setTimeout(fn, 200);
}
function whenStatusVisible() {
  return new Promise((resolve) => {
    const seen = () => {
      const status = document.querySelector("nav") && [...document.querySelectorAll("nav button")].some((b) => (b.textContent || "").trim() === "Status");
      if (!status) { requestAnimationFrame(seen); return; }
      // Let the Status button settle for a click before any screen import starts.
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    };
    requestAnimationFrame(seen);
  });
}
export function useSwReady() {
  const prodSw = import.meta.env.PROD && typeof navigator !== "undefined" && !!navigator.serviceWorker;
  const [ready, setReady] = useState(!prodSw);
  useEffect(() => {
    if (!prodSw || ready) return;
    let stop = false;
    whenPrecacheDone().then(() => { if (!stop) setReady(true); });
    return () => { stop = true; };
  }, [prodSw, ready]);
  return ready;
}
export function prefetchScreens() {
  try { if (new URLSearchParams(window.location.search).get("noprefetch") === "1") return; } catch { /* stay in the app */ }
  if (prefetchStarted) return;
  prefetchStarted = true;
  let i = 0;
  const step = () => {
    if (i >= PREFETCH.length) return;
    onIdle(() => {
      const [key, importer] = PREFETCH[i++];
      loadScreen(key, importer).finally(step);
    });
  };
  // Status is on screen first. The idle callback is queued after that paint, so a warm
  // launch can accept the Status click before the first screen import starts.
  Promise.all([whenPrecacheDone(), whenStatusVisible()]).then(() => {
    setTimeout(() => onIdle(step), 800);
  });
}

export function ScreenFallback() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);
  return <div aria-hidden="true" style={{ background: C.bg, minHeight: "60dvh", opacity: show ? 1 : 0 }} />;
}
export function NeedsUpdate() {
  return (
    <div className="panel p-6 text-center" style={{ background: C.bg, minHeight: "40dvh" }}>
      <p className="text-sm font-semibold" style={{ color: C.text }}>This screen needs the latest version.</p>
    </div>
  );
}
export function LazyBoundary({ active = true, children }) {
  return <Suspense fallback={active ? <ScreenFallback /> : null}>{children}</Suspense>;
}
export function UpdateBanner({ onReload }) {
  const shown = useBanner();
  if (!shown) return null;
  return (
    <div role="status" className="fixed left-3 right-3 z-[70] flex items-center gap-2 px-3 py-2" style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)", background: C.sheet, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: `0 8px 24px rgba(0,0,0,.35)` }}>
      <button type="button" onClick={onReload} className="flex-1 text-left text-sm font-bold" style={{ color: C.cyan }}>Ascend updated — tap to reload.</button>
      <button type="button" aria-label="Dismiss update notice" onClick={dismissBanner} className="ghost px-2 py-1 text-sm" style={{ color: C.dim }}>Dismiss</button>
    </div>
  );
}
