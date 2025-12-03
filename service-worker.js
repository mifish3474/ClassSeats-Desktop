const SW_VERSION = 'v10'
const CACHE_NAME = 'classseats-mobile-' + SW_VERSION
const ORIGIN = self.location.origin
const BASE = `${ORIGIN}/ClassSeats-Mobile`
const CORE_ASSETS = [
  `${BASE}/ClassSeatsMobile`,
  `${BASE}/ClassSeatsMobile/`,
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/apple-touch-icon.png`,
]

self.addEventListener('install', (event) => {
  console.log('[SW]', SW_VERSION, 'install')
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW]', SW_VERSION, 'activate')
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('classseats-mobile-') && key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Navigation: network-first, then cached shell, then inline offline notice
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request, { cache: 'no-store' })
          if (network && network.ok) return network
        } catch {
          /* ignore */
        }
        const cached =
          (await caches.match(`${BASE}/ClassSeatsMobile`)) ||
          (await caches.match(`${BASE}/ClassSeatsMobile/`)) ||
          (await caches.match(`${BASE}/index.html`)) ||
          (await caches.match('/index.html'))
        if (cached) return cached
        return new Response('<h1>Offline</h1><p>Cannot reach the app right now.</p>', {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        })
      })()
    )
    return
  }

  // Skip sync API calls
  if (url.pathname.startsWith('/mobile-sync')) return

  // For same-origin GETs: cache-first then network, with shell fallback
  if (url.origin === ORIGIN) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        try {
          const response = await fetch(request, { cache: 'no-store' })
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        } catch {
          const fallback =
            (await caches.match(`${BASE}/ClassSeatsMobile`)) ||
            (await caches.match(`${BASE}/index.html`)) ||
            (await caches.match('/index.html'))
          return fallback || new Response('<h1>Offline</h1><p>Cannot reach the app right now.</p>', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          })
        }
      })()
    )
  }
})

// Respond to version ping
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PING_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', version: SW_VERSION })
  }
})
