const CACHE_NAME = "lets-fishing-v2.1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js"
];

self.addEventListener("install", e=>{
 e.waitUntil(
  caches.open(CACHE_NAME)
   .then(cache=>cache.addAll(ASSETS))
 );
});

self.addEventListener("fetch", e=>{
 e.respondWith(
  caches.match(e.request)
   .then(res=> res || fetch(e.request))
 );
});
