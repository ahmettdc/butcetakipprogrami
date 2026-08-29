/* Aile Bütçesi — PWA service worker.
   Aynı origin: network-first (taze içerik), çevrimdışında önbellekten.
   Farklı origin (React/pdf.js/fontlar CDN): cache-first, çevrimdışı için saklanır. */
var CACHE = "aile-butce-v5";
var CORE = [
  "./",
  "./index.html",
  "./claude-local.js",
  "./support.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);

  if (url.origin === self.location.origin) {
    // aynı origin: önce ağ, sonra önbellek
    e.respondWith(
      fetch(e.request).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  // farklı origin (CDN kütüphaneleri, fontlar): önce önbellek, sonra ağ
  // NOT: canlı fiyat API'lerini önbelleğe alma (taze kalsın)
  if (/finans\.truncgil\.com|genelpara\.com/.test(url.host)) return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request).then(function (res) {
        if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return res;
      }).catch(function () { return cached; });
    })
  );
});
