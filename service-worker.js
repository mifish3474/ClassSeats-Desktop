const CACHE_NAME = 'classseats-mobile-v1'
const CORE_ASSETS = ['/', '/index.html', '/ClassSeatsMobile']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(
          CORE_ASSETS.map((path) => {
            const cacheBusting = path.includes('?') ? path : `${path}${path.includes('?') ? '' : '?v=' + Date.now()}`
            return cacheBusting
          })
        )
      )
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/mobile-sync')) return

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache))
          return response
        })
        .catch(() => cached || caches.match('/ClassSeatsMobile') || caches.match('/index.html'))
      return cached || fetchPromise
    })
  )
})
