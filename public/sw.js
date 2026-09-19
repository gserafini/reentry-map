/* This worker caches only the public recovery shell. Account pages and API data
 * are never cached. Contact snapshots live in the visitor's localStorage. */
// Bump this version whenever OFFLINE_FILES change so existing installs refresh the shell.
const OFFLINE_CACHE = 'reentry-map-offline-v2'
const OFFLINE_FILES = ['/offline.html', '/offline-contacts.js']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.addAll(OFFLINE_FILES))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('reentry-map-offline-') && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return
  if (OFFLINE_FILES.includes(url.pathname)) {
    event.respondWith(caches.match(url.pathname).then((cached) => cached || fetch(request)))
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const offline = await caches.match('/offline.html')
        return (
          offline ||
          new Response('You are offline. Reconnect to open Reentry Map.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      })
    )
  }
})
