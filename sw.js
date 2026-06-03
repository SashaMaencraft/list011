// sw.js - Service Worker для Именинного реестра
// Версия кэша - меняйте при обновлении приложения
const CACHE_NAME = 'birthday-registry-v2';

// Файлы, которые нужно кэшировать для офлайн-работы
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  // Дополнительные ресурсы (если есть)
  // '/manifest.json',
  // '/icon-192.png',
  // '/icon-512.png'
];

// Установка Service Worker — кэшируем файлы
self.addEventListener('install', (event) => {
  console.log('[SW] Установка...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Кэширование файлов');
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Активация — удаляем старые кэши
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[SW] Удаление старого кэша:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Перехват запросов — стратегия "сначала кэш, потом сеть"
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Если есть в кэше — отдаём из кэша
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Иначе идём в сеть
        return fetch(event.request)
          .then((networkResponse) => {
            // Не кэшируем непонятные запросы
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }
            
            // Клонируем ответ (он может быть использован только раз)
            const responseToCache = networkResponse.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
              
            return networkResponse;
          })
          .catch(() => {
            // Если нет сети и нет кэша — показываем офлайн-страницу
            // (опционально — можно вернуть fallback HTML)
            console.log('[SW] Нет сети и нет кэша для:', event.request.url);
          });
      })
  );
});

// Обработка push-уведомлений (опционально)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Напоминание о дне рождения!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification('🎂 Именинный реестр', options)
  );
});
