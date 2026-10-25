/* Offline support: precache the app shell, serve cache-first, refresh in the background.
   Bump VERSION whenever any shell file changes. */
const VERSION = 'napmap-v10';
const SHELL = ['./', 'index.html', 'css/style.css', 'css/furniture.css', 'js/furniture.js', 'js/generator.js', 'js/game.js',
  'css/archive.css', 'js/archive.js',
  'css/polish.css', 'js/polish.js', 'js/gen-worker.js',
<<<<<<< HEAD
  'css/leaderboard.css', 'css/cats.css', 'css/difficulty.css', 'js/difficulty.js', 'js/config.js', 'js/leaderboard.js',
=======
  'css/leaderboard.css', 'css/cats.css', 'js/config.js', 'js/leaderboard.js', 'js/cats.js',
>>>>>>> cats
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
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
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
