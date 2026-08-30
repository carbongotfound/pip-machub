import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { PwaGate } from "./components/PwaGate";
import { applySkin, readSkin } from "./lib/skins";
import { installPwaFetchProtection } from "./lib/pwa-fetch";
import "./styles.css";

// Before the first paint, not inside a component: stamping the skin during
// render would show one frame of the default palette first.
applySkin(readSkin());
installPwaFetchProtection();

if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PwaGate><App /></PwaGate>
  </StrictMode>,
);
