/**
 * VukaSport - Service Worker
 * Gerencia cache, funcionamento offline e notificações de golos
 */

const CACHE_NAME = 'vukasport-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './css/style.css',
  './js/app.js',
  './js/admin.js',
  './js/auth.js',
  './js/firebase.js',
  './js/events.js',
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
  self.skipWaiting();
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
  self.clients.claim();
});

// Interceção de pedidos (Fetch)
self.addEventListener('fetch', (event) => {
  // Estratégia: Network First, falling back to cache
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

// Listener para mensagens de notificações
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_GOAL_NOTIFICATION') {
    const { teamName, playerName, minute } = event.data;
    
    // Mostrar notificação push
    self.registration.showNotification('⚽ GOLO!', {
      body: `${playerName} (${teamName}) marcou aos ${minute}'!`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'goal-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
      actions: [
        {
          action: 'open',
          title: 'Ver Jogo'
        }
      ]
    });

    // Som de notificação
    playGoalSound();
  } else if (event.data && event.data.type === 'SHOW_CARD_NOTIFICATION') {
    const { cardColor, teamName, playerName, minute } = event.data;
    const cardEmoji = cardColor === 'yellow' ? '🟨' : '🟥';
    const cardText = cardColor === 'yellow' ? 'Cartão Amarelo' : 'Cartão Vermelho';
    
    // Mostrar notificação push
    self.registration.showNotification(`${cardEmoji} ${cardText}`, {
      body: `${playerName} (${teamName}) recebeu ${cardText.toLowerCase()} aos ${minute}'!`,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: `card-notification-${Date.now()}`,
      requireInteraction: false,
      vibrate: [100, 50, 100, 50, 100],
      actions: [
        {
          action: 'open',
          title: 'Ver Jogo'
        }
      ]
    });

    // Som de notificação
    playCardSound(cardColor);
  }
});

// Listener para cliques em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Abrir o app quando clicar na notificação
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Função para reproduzir som de golo
function playGoalSound() {
  // Criar um som simples usando Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Melodia de golo
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Áudio não disponível no Service Worker');
  }
}

// Função para reproduzir som de cartão
function playCardSound(cardColor) {
  // Criar um som simples usando Web Audio API
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Som diferente para cartão amarelo e vermelho
    if (cardColor === 'yellow') {
      // Som agudo para cartão amarelo
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(700, audioContext.currentTime + 0.05);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    } else {
      // Som grave para cartão vermelho
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.05);
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
    }
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (error) {
    console.log('Áudio não disponível no Service Worker');
  }
}

// Background Sync para sincronizar dados quando voltar online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-games') {
    event.waitUntil(
      // Sincronizar dados com Firebase
      fetch('https://vukasport-b375e-default-rtdb.firebaseio.com/games.json')
        .then(response => response.json())
        .then(data => {
          console.log('[Service Worker] Dados sincronizados:', data);
          // Notificar clientes sobre a sincronização
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                data: data
              });
            });
          });
        })
        .catch(error => {
          console.error('[Service Worker] Erro na sincronização:', error);
        })
    );
  }
});
