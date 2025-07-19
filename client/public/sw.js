// Alfalyzer Service Worker - PWA Implementation
// Version: 1.0.0 - International Markets Focus (USA/EU)

const CACHE_NAME = 'alfalyzer-v1';
const STATIC_CACHE_NAME = 'alfalyzer-static-v1';
const DYNAMIC_CACHE_NAME = 'alfalyzer-dynamic-v1';

// Cache configuration for international financial data
const CACHE_CONFIG = {
  // US Markets priority
  staticAssets: [
    '/',
    '/manifest.json',
    '/locales/en/common.json',
    '/locales/en/markets.json',
    '/locales/en/currencies.json',
    '/locales/pt/common.json',
    '/locales/pt/markets.json',
    '/locales/pt/currencies.json',
  ],
  // Cache duration based on data type
  ttl: {
    static: 7 * 24 * 60 * 60 * 1000, // 7 days
    prices: 60 * 1000, // 1 minute (real-time data)
    fundamentals: 24 * 60 * 60 * 1000, // 24 hours
    news: 60 * 60 * 1000, // 1 hour
  }
};

// Install event - Cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Alfalyzer Service Worker v1.0.0');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets for US/EU markets');
        return cache.addAll(CACHE_CONFIG.staticAssets);
      })
      .then(() => {
        console.log('[SW] Skip waiting for activation');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Alfalyzer Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Taking control of all clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - Smart caching strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // CRITICAL FIX: Skip non-http(s) protocols (like chrome-extension://)
  if (!requestUrl.protocol.startsWith('http')) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (requestUrl.pathname.startsWith('/api/')) {
    // API requests - network first with fallback
    event.respondWith(handleApiRequest(event.request));
  } else if (requestUrl.pathname.startsWith('/locales/')) {
    // Translation files - cache first
    event.respondWith(handleStaticAssets(event.request));
  } else if (requestUrl.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
    // Static assets - cache first
    event.respondWith(handleStaticAssets(event.request));
  } else {
    // HTML pages - network first with cache fallback
    event.respondWith(handlePageRequest(event.request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const requestUrl = new URL(request.url);
  
  try {
    // Try network first for real-time data
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses based on data type
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      
      // Determine cache TTL based on endpoint
      let shouldCache = true;
      
      if (requestUrl.pathname.includes('/prices') || requestUrl.pathname.includes('/quotes')) {
        // Short-lived cache for price data
        shouldCache = true;
      } else if (requestUrl.pathname.includes('/fundamentals') || requestUrl.pathname.includes('/company')) {
        // Longer cache for fundamental data
        shouldCache = true;
      }
      
      if (shouldCache) {
        cache.put(request, networkResponse.clone());
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.warn('[SW] Network failed for API request, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add header to indicate cached response
      const modifiedResponse = new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: {
          ...cachedResponse.headers,
          'x-alfalyzer-cache': 'service-worker',
          'x-alfalyzer-offline': 'true'
        }
      });
      return modifiedResponse;
    }
    
    // Return minimal offline response for critical endpoints
    if (requestUrl.pathname.includes('/stocks') || requestUrl.pathname.includes('/dashboard')) {
      return new Response(JSON.stringify({
        offline: true,
        message: 'Dados offline - Markets US/EU',
        timestamp: Date.now()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first strategy
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.warn('[SW] Network failed for page request, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page fallback
    const offlinePage = await caches.match('/');
    if (offlinePage) {
      return offlinePage;
    }
    
    throw error;
  }
}

// Handle push notifications (preparation for future)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'Alfalyzer',
    body: 'Market update available',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'market-update',
    data: {
      url: '/dashboard'
    }
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('[SW] Failed to parse push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(syncWatchlistData());
  } else if (event.tag === 'sync-portfolio') {
    event.waitUntil(syncPortfolioData());
  }
});

// Sync functions (placeholders for future implementation)
async function syncWatchlistData() {
  console.log('[SW] Syncing watchlist data');
  // Implementation for syncing watchlist changes when back online
}

async function syncPortfolioData() {
  console.log('[SW] Syncing portfolio data');
  // Implementation for syncing portfolio changes when back online
}

// Message handling for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CLEAR_CACHE':
        clearAllCaches();
        break;
      case 'CACHE_MARKET_DATA':
        cacheMarketData(event.data.payload);
        break;
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

// Utility functions
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('[SW] All caches cleared');
}

async function cacheMarketData(data) {
  if (data && data.symbols) {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    // Pre-cache market data for specified symbols
    console.log('[SW] Pre-caching market data for:', data.symbols);
  }
}

console.log('[SW] Alfalyzer Service Worker loaded - International Markets Ready 🇺🇸🇪🇺');