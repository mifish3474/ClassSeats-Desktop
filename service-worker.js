const SW_VERSION = 'v13'
const CACHE_NAME = 'classseats-mobile-' + SW_VERSION
const ORIGIN = self.location.origin
const BASE = `${ORIGIN}/ClassSeats-Mobile`
const CORE_ASSETS = [
  // App shell (cover both with/without trailing slash and explicit index)
  `${BASE}/ClassSeatsMobile`,
  `${BASE}/ClassSeatsMobile/`,
  `${BASE}/ClassSeatsMobile/index.html`,
  `${BASE}/`,
  `${BASE}/index.html`,
  // Manifest & icons
  `${BASE}/manifest.webmanifest`,
  `${BASE}/icons/icon-192.png`,
  `${BASE}/icons/icon-512.png`,
  `${BASE}/icons/apple-touch-icon.png`,
]

self.addEventListener('install', (event) => {
  console.log('[SW]', SW_VERSION, 'install')
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await Promise.allSettled(
        CORE_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-store' })
            if (res && res.ok) {
              await cache.put(url, res)
            }
          } catch (err) {
            // Ignore individual failures so one bad URL doesn’t break install
          }
        })
      )
      await self.skipWaiting()
    })()
  )
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
          (await caches.match(request, { ignoreSearch: true })) ||
          (await caches.match(`${BASE}/ClassSeatsMobile/index.html`, { ignoreSearch: true })) ||
          (await caches.match(`${BASE}/ClassSeatsMobile`, { ignoreSearch: true })) ||
          (await caches.match(`${BASE}/ClassSeatsMobile/`, { ignoreSearch: true })) ||
          (await caches.match(`${BASE}/index.html`, { ignoreSearch: true })) ||
          (await caches.match('/index.html', { ignoreSearch: true })) ||
          (await caches.match('index.html', { ignoreSearch: true }))
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
            (await caches.match(request, { ignoreSearch: true })) ||
            (await caches.match(`${BASE}/ClassSeatsMobile/index.html`, { ignoreSearch: true })) ||
            (await caches.match(`${BASE}/ClassSeatsMobile`, { ignoreSearch: true })) ||
            (await caches.match(`${BASE}/ClassSeatsMobile/`, { ignoreSearch: true })) ||
            (await caches.match(`${BASE}/index.html`, { ignoreSearch: true })) ||
            (await caches.match('/index.html', { ignoreSearch: true })) ||
            (await caches.match('index.html', { ignoreSearch: true }))
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
