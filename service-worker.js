const CACHE_NAME = 'classseats-mobile-v5'
const ORIGIN = self.location.origin
const BASE = `${ORIGIN}/ClassSeats-Mobile`
const CORE_ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/ClassSeatsMobile`,
  `${BASE}/ClassSeatsMobile/`,
  `${BASE}/ClassSeatsMobile/index.html`,
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

  // Cache only our domain
  if (!url.href.startsWith(BASE)) return

  // Navigation requests -> prefer network, fall back to shell/cache, never return null
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request)
          if (network && network.ok) return network
        } catch {
          /* ignore */
        }
        const cached =
          (await caches.match(`${BASE}/ClassSeatsMobile`)) ||
          (await caches.match(`${BASE}/ClassSeatsMobile/`)) ||
          (await caches.match(`${BASE}/index.html`))
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' })
      })()
    )
    return
  }

  // Skip sync API calls
  if (url.pathname.startsWith('/mobile-sync')) return

  // Cache-first, then network, with safe fallback
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const response = await fetch(request)
        if (response && response.status === 200) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      } catch {
        const fallback =
          (await caches.match(`${BASE}/ClassSeatsMobile`)) ||
          (await caches.match(`${BASE}/index.html`))
        return fallback || new Response('Offline', { status: 503, statusText: 'Offline' })
      }
    })()
  )
})
