/* LSP Bot Academy service worker – offline support.
   Bump VERSION whenever any cached file changes. */
const VERSION = 'v3';
const SHELL = `lsp-shell-${VERSION}`;
const RUNTIME = `lsp-runtime-${VERSION}`;
const SHELL_FILES = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
  './fonts/baloo-thambi-2-latin-01b78b.woff2',
  './fonts/baloo-thambi-2-tamil-58106a.woff2',
  './fonts/fonts.css',
  './fonts/noto-sans-tamil-latin-1e9fb6.woff2',
  './fonts/noto-sans-tamil-tamil-c02305.woff2',
  './fonts/nunito-latin-798ec6.woff2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => ![SHELL, RUNTIME].includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Page navigations: network first (fresh content), fall back to cached shell offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (page images, PDF, icons): cache first, then fill the cache on first use.
  // The PDF is fetched whole (no Range), so a successful 200 can be cached safely.
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok && res.status === 200) {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
