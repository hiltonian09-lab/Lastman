// Minimal service worker — exists mainly to satisfy Chrome/Android's PWA
// installability requirement (an active SW with a fetch handler). Deliberately
// does no offline caching: this app is data-driven (picks, live scores,
// server actions) and serving stale cached responses would be actively
// misleading, so every request just passes straight through to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: let the browser handle every request normally.
});
