"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a nice-to-have, not load-bearing — ignore failures
        // (e.g. unsupported browser, blocked by an extension).
      });
    }
  }, []);

  return null;
}
