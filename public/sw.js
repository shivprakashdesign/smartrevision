// SmartRevision service worker — push notifications ONLY.
// Deliberately no fetch/caching handlers: the iOS PWA must always load the
// latest deploy straight from the network, and a stale cache here would be
// invisible and painful to debug. Keep it that way.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

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
      return self.clients.openWindow(url)
    })
  )
})
