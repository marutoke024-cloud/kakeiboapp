/* かけい簿 ─ オフラインでも動くようにするための仕組み

   アプリ本体（index.html / app.js / styles.css / manifest）は「まずネット」。
   こうしないと、直したものが端末に届かないため。
   絵やアイコンは変わらないので「まずキャッシュ」。 */
const VERSION = 'v6';
const CACHE = 'kakeibo-' + VERSION;

const CODE = /(?:^|\/)(?:index\.html|app\.js|styles\.css|manifest\.webmanifest)$/;

const FILES = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/chars.png',
  './assets/chars-tall.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(
        FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // Gemini など外への通信はそのまま

  const isNav = req.mode === 'navigate';

  // ---- アプリ本体：まずネットを見て、だめならキャッシュ ----
  if (isNav || CODE.test(url.pathname)) {
    const key = isNav ? './index.html' : req;
    const netReq = isNav
      ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' })
      : new Request(req, { cache: 'no-cache' });
    ev.respondWith(
      fetch(netReq)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(key, { ignoreSearch: true })
          .then(r => r || caches.match('./index.html'))
          .then(r => r || new Response('', { status: 503 })))
    );
    return;
  }

  // ---- 絵やアイコン：まずキャッシュ ----
  ev.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => hit || new Response('', { status: 503 })))
  );
});
