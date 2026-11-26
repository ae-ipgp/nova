/*
 * NoVA service worker. Caches ONLY the site's own static files so the app shell opens quickly and
 * works offline-ish. It never caches gateway/Supabase responses: records, files and sign-in state
 * must always come live from the server (Blueprint §11).
 * Bump VERSION on every release so old caches are removed.
 */
const VERSION = 'nova-v1'
const SHELL = ['/', '/favicon.png', '/brand/icon-192.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return // never touch cross-origin (gateway, Supabase, Google)

  // Hashed build assets and brand files: cache-first.
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/mascot/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)) }
        return res
      })),
    )
    return
  }

  // Page navigations: network first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')))
  }
})
