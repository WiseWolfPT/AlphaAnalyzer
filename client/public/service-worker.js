// Service Worker version
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `alfalyzer-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `alfalyzer-data-cache-${CACHE_VERSION}`;

// Assets to cache for offline access
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/locales/pt/translation.json',
  '/locales/en/translation.json'
];

// API routes that should use network-first strategy
const API_ROUTES = [
  '/api/stocks',
  '/api/market-data',
  '/api/watchlists',
  '/api/portfolios',
  '/api/transcripts'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP(S) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - Network first, fall back to cache
  if (API_ROUTES.some(route => url.pathname.includes(route))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - Cache first, fall back to network
  if (request.destination === 'image' || 
      request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - Network first with cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default - Stale while revalidate
  event.respondWith(staleWhileRevalidateStrategy(request));
});

// Cache-first strategy
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network-first strategy
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to get from cache if network fails
    const cache = await caches.open(DATA_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - Network request failed', { status: 503 });
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  return cachedResponse || fetchPromise;
}

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.urls || [];
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(urlsToCache);
    });
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watchlists') {
    event.waitUntil(syncWatchlists());
  }
  
  if (event.tag === 'sync-portfolio-updates') {
    event.waitUntil(syncPortfolioUpdates());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/badge-72x72.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.alertId || 1,
      url: data.url || '/',
      alertId: data.alertId,
      symbol: data.symbol,
      type: data.type
    },
    actions: [
      {
        action: 'view',
        title: 'View Stock',
        icon: '/icon-32.png'
      },
      {
        action: 'alerts',
        title: 'View Alerts',
        icon: '/icon-32.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    tag: data.alertId || 'general',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let urlToOpen;
  
  switch (event.action) {
    case 'view':
      // Navigate to stock detail page
      if (event.notification.data.symbol) {
        urlToOpen = new URL(`/stock/${event.notification.data.symbol}/charts`, self.location.origin);
      } else {
        urlToOpen = new URL(event.notification.data.url || '/', self.location.origin);
      }
      break;
    case 'alerts':
      // Navigate to alerts page
      urlToOpen = new URL('/alerts', self.location.origin);
      break;
    case 'dismiss':
      // Just close the notification
      return;
    default:
      // Default action - navigate to the URL in the notification data
      urlToOpen = new URL(event.notification.data.url || '/', self.location.origin);
      break;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let client of windowClients) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === urlToOpen.origin && 'focus' in client) {
            // Navigate to the target page and focus
            client.navigate(urlToOpen.href);
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen.href);
        }
      })
  );
});

// Helper functions for background sync
async function syncWatchlists() {
  // Implementation for syncing watchlists when back online
  console.log('[Service Worker] Syncing watchlists...');
}

async function syncPortfolioUpdates() {
  // Implementation for syncing portfolio updates when back online
  console.log('[Service Worker] Syncing portfolio updates...');
}