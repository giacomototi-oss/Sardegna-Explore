
const CACHE = "sardegna-explorer-v1";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./data.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => k===CACHE ? null : caches.delete(k)))));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(url.hostname.includes("open-meteo.com")) return; // network first for live weather
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res=>{
    const copy = res.clone();
    caches.open(CACHE).then(cache => cache.put(e.request, copy)).catch(()=>{});
    return res;
  }).catch(()=>cached)));
});
