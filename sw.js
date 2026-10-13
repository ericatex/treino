const CACHE = 'treino-tracker-v9';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Instala baixando SEMPRE da rede (cache:'reload'), nunca do cache HTTP do navegador
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(ASSETS.map(function(u) {
        return fetch(new Request(u, { cache: 'reload' })).then(function(res) {
          if (res && res.status === 200) return cache.put(u, res);
        });
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Nunca interceptar chamadas do Firebase / Google — deixa o SDK gerenciar
  if (url.hostname.indexOf('googleapis.com') !== -1 ||
      url.hostname.indexOf('gstatic.com') !== -1 ||
      url.hostname.indexOf('firebaseio.com') !== -1 ||
      url.hostname.indexOf('firebaseapp.com') !== -1) {
    return;
  }

  // Apenas mesma origem
  if (url.origin !== self.location.origin) return;

  // Rede primeiro (versao nova sempre que houver internet); cache como reserva offline
  e.respondWith(
    new Promise(function(resolve) {
      var done = false;
      var timer = setTimeout(function() {
        if (done) return;
        caches.match(e.request).then(function(c) { if (c && !done) { done = true; resolve(c); } });
      }, 3000);
      fetch(e.request, { cache: 'no-cache' }).then(function(res) {
        clearTimeout(timer);
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(function(cache) { cache.put(e.request, copy); });
        }
        if (!done) { done = true; resolve(res); }
      }).catch(function() {
        clearTimeout(timer);
        caches.match(e.request).then(function(c) {
          if (done) return;
          done = true;
          resolve(c || caches.match('./index.html'));
        });
      });
    })
  );
});
