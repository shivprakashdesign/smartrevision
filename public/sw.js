// SmartRevision service worker — push notifications + offline app shell.
//
// CACHING RULES (the iOS freshness guarantee is sacred):
//   Navigations are NETWORK-FIRST. Online, the PWA always loads the latest
//   deploy straight from the network, exactly as before; the cached shell is
//   used only when the network genuinely fails (offline). A stale app must
//   never be served while online.
//   Hashed build assets (/assets/*.js|css, immutable by name) are cache-first
//   and cached as they're fetched — this includes the lazy curriculum chunks,
//   so subjects a student has opened stay available offline.
//   Everything else (Supabase, APIs, cross-origin) passes straight through.

const SHELL_CACHE = 'sr-shell-v1'
const ASSET_CACHE = 'sr-assets-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
)

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // SPA navigations: network-first, offline falls back to the cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html', { cacheName: SHELL_CACHE }))
    )
    return
  }

  // Hashed immutable build assets (+ icons/manifest): cache-first.
  const cacheable = url.pathname.startsWith('/assets/') || /\.(png|webmanifest|json|lottie)$/.test(url.pathname) || url.pathname === '/manifest.json'
  if (cacheable) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) =>
        cache.match(req).then((hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) cache.put(req, res.clone())
            return res
          })
        )
      )
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { /* plain-text push */ }

  const title = data.title || 'SmartRevision'
  const options = {
    body: data.body || 'Time for a quick revision.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    // tag collapses repeats of the same reminder instead of stacking them
    tag: data.tag || 'smartrevision',
    data: { url: data.url || '/home' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/home'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      // Reuse an open app window if there is one. Safari has no
      // WindowClient.navigate(), so the app routes itself: it listens for
      // this message (PushNavigator in App.jsx) and runs the client-side
      // router — calling navigate() here would silently do nothing on iOS.
      const existing = tabs.find((t) => 'focus' in t)
      if (existing) {
        existing.postMessage({ type: 'open-url', url })
        return existing.focus()
      }
      // Cold start. iOS often opens the PWA at its start URL and ignores the
      // path passed to openWindow, so post the URL to the new window too —
      // the browser buffers the message until the app boots and starts
      // listening, then PushNavigator routes to it.
      return self.clients.openWindow(url).then((client) => {
        if (client) client.postMessage({ type: 'open-url', url })
      })
    })
  )
})
