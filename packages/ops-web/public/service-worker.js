const CACHE_NAME = 'washed-ops-worker-v1';
const SHELL_ASSETS = ['/', '/index.html', '/app.js', '/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
        ),
      self.clients.claim(),
      notifyClientsToSyncPhotos(),
    ]),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'washed.syncPhotos') {
    event.waitUntil(notifyClientsToSyncPhotos());
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);

    if (cached !== undefined) {
      return cached;
    }

    return new Response(
      JSON.stringify({ message: 'Offline and no cached response is available.' }),
      {
        headers: { 'content-type': 'application/json' },
        status: 503,
      },
    );
  }
}

async function notifyClientsToSyncPhotos() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });

  for (const client of clients) {
    client.postMessage({ type: 'washed.syncPhotos' });
  }
}
