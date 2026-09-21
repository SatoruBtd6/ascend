import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Auth from "./Auth.jsx";

window.__ascendBooted = true;
window.__ascendSw = "precache";

createRoot(document.getElementById("root")).render(<React.StrictMode><Auth /></React.StrictMode>);

if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
  } else {
    // A leftover production SW on localhost intercepts Vite and, with skipWaiting, fights HMR into a reload loop.
    navigator.serviceWorker.getRegistrations?.().then((rs) => rs.forEach((r) => r.unregister()));
  }
}
