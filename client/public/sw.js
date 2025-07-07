// Service Worker para Alfalyzer PWA
const CACHE_NAME = 'alfalyzer-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/locales/pt/translation.json',
  '/locales/en/translation.json',
];

// Instala o Service Worker e adiciona recursos ao cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache aberto');
      return cache.addAll(urlsToCache);
    })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Estratégias de cache para diferentes tipos de recursos
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Cache-first para assets estáticos
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image' ||
      url.pathname.includes('/assets/') ||
      url.pathname.includes('/locales/')) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // Não cacheia respostas com erro
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          
          return response;
        });
      })
    );
    return;
  }

  // Network-first para dados de API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Stale-while-revalidate para HTML
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((response) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
        
        return response || fetchPromise;
      })
    );
    return;
  }

  // Default: Network com fallback para cache
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// Sincronização em background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(syncWatchlist());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Alfalyzer',
    icon: '/icon-192x192.svg',
    badge: '/badge-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver detalhes',
      },
      {
        action: 'close',
        title: 'Fechar',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Alfalyzer', options)
  );
});

// Ação de clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    clients.openWindow('/');
  }
});

// Função auxiliar para sincronizar watchlist
async function syncWatchlist() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    // Filtra apenas requisições de watchlist pendentes
    const watchlistRequests = requests.filter(req => 
      req.url.includes('/api/watchlist') && req.method === 'POST'
    );
    
    // Reenvia requisições pendentes
    for (const request of watchlistRequests) {
      try {
        await fetch(request);
        await cache.delete(request);
      } catch (error) {
        console.error('Erro ao sincronizar:', error);
      }
    }
  } catch (error) {
    console.error('Erro na sincronização:', error);
  }
}