// Service worker do ENGEFIT: funciona offline. Aumente a versão ao publicar mudanças.
const V = 'engefit-v3';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/vendor/supabase.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    // navegação: tenta a rede e cai para o cache se estiver offline
    if (r.mode === 'navigate') {
      e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('/', cp)); return res; }).catch(() => caches.match('/')));
      return;
    }
    e.respondWith(caches.match(r).then(h => h || fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); return res; })));
  } else if (u.hostname.endsWith('googleapis.com') || u.hostname.endsWith('gstatic.com')) {
    // fontes: usa o cache e atualiza em segundo plano
    e.respondWith(caches.open(V).then(c => c.match(r).then(h => { const n = fetch(r).then(res => { c.put(r, res.clone()); return res; }).catch(() => h); return h || n; })));
  }
});
