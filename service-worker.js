const CACHE_NAME = 'classseats-mobile-v2'
const BASE = 'https://mifish3474.github.io/ClassSeats-Mobile'
const CORE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/ClassSeatsMobile`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/apple-touch-icon.png`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
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
  if (!url.href.startsWith(BASE)) return
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
        .catch(() => cached || caches.match(`${BASE}/ClassSeatsMobile`) || caches.match(`${BASE}/index.html`))
      return cached || fetchPromise
    })
  )
})
