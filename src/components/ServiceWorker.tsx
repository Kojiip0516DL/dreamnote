"use client";
// Registers the service worker in production so users get the PWA install
// banner and offline shell. No-ops in dev (server worker not registered there).
import { useEffect } from "react";

export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        // Optional: reg.update() to force a fetch; we let the browser handle
        // SW update checks since skipWaiting/clientsClaim are on in the config.
      })
      .catch(() => {
        // Silent — SW is optional; the app works without it.
      });
  }, []);

  return null;
}
