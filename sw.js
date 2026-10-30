// 離線用:有網路時抓最新版並存一份,沒網路時改用存好的那份
var CACHE = 'trip-sg-offline-v2';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(['./', './index.html']);
  }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf('trip-sg-offline-') === 0 && k !== CACHE;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // 圖片檔名不會重複,存過就直接用,不用再下載
  if (url.origin === self.location.origin && url.pathname.indexOf('/img/') >= 0) {
    e.respondWith(
      caches.match(url.pathname).then(function (m) {
        return m || fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(url.pathname, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // 自己網站的檔案:先用網路(拿最新版),失敗才用離線備份
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(url.pathname, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(url.pathname).then(function (m) {
          if (m) return m;
          return caches.match('./').then(function (m2) {
            return m2 || caches.match('./index.html');
          });
        });
      })
    );
    return;
  }

  // Google 字型:有存過就直接用,沒有才上網抓
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.match(req).then(function (m) {
        return m || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
          return res;
        });
      })
    );
  }
});
