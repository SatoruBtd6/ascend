import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Auth from "./Auth.jsx";

createRoot(document.getElementById("root")).render(<React.StrictMode><Auth /></React.StrictMode>);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}
