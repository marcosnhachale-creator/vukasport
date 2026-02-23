/**
 * VukaSport - Service Worker
 * Gerencia cache e funcionamento offline
 */

const CACHE_NAME = 'vukasport-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './css/style.css',
  './js/app.js',
  './js/admin.js',
  './js/auth.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalação');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Fazendo cache de todos os ficheiros');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativação');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Interceção de pedidos (Fetch)
self.addEventListener('fetch', (event) => {
  // Estratégia: Network First, falling back to cache
  // Para dados dinâmicos (localStorage não é afetado pelo SW, mas os ficheiros sim)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a rede funcionar, atualizar o cache
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Se a rede falhar, tentar o cache
        return caches.match(event.request);
      })
  );
});
