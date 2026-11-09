"use client";

import { useEffect } from "react";

// The service worker serves /_next/static/* cache-first. That is safe in
// production, where those filenames are content-hashed, but `next dev`
// (Turbopack) reuses chunk names across edits — a registered worker would keep
// serving stale JS/CSS and cause hydration mismatches. So only register in
// production, and in development remove any worker and cache left behind.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js");
      return;
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((r) => r.unregister()));
    if ("caches" in window) {
      caches
        .keys()
        .then((keys) =>
          keys.filter((key) => key.startsWith("xplore-")).forEach((key) => caches.delete(key))
        );
    }
  }, []);

  return null;
}
