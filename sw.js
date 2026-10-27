/* Offline support: precache the app shell; serve game files network-first (cache when offline or slow), fonts cache-first.
   Bump VERSION whenever any shell file changes. */
const VERSION = 'napmap-v24';
const SHELL = ['./', 'index.html', 'css/style.css', 'css/furniture.css', 'js/furniture.js', 'js/generator.js', 'js/generator-shaped.js', 'js/game.js',
  'css/archive.css', 'js/archive.js',
  'css/polish.css', 'js/polish.js', 'js/gen-worker.js',
  'css/leaderboard.css', 'css/cats.css', 'css/difficulty.css', 'css/claimed.css', 'css/xanim.css', 'css/room.css', 'js/difficulty.js', 'js/config.js', 'js/leaderboard.js', 'js/cats.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  // cache:'reload' skips the HTTP cache (GitHub Pages sends max-age=600), so a VERSION bump really refetches
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return; // leave API calls (e.g. leaderboard) to the network
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, {ignoreSearch: sameOrigin});
    if (isFont && hit) return hit; // fonts never change: cache first
    // Game files: network first so updates show on the next load; fall back to the cache when offline or slow.
    // no-cache: revalidate with GitHub Pages instead of trusting its 10-minute browser cache
    const net = fetch(req, sameOrigin ? {cache: 'no-cache'} : {}).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    });
    if (!hit) return net;
    const slow = new Promise(r => setTimeout(() => r(hit), 3000));
    return Promise.race([net.catch(() => hit), slow]);
  }));
});
