// Service worker do ENGEFIT: funciona offline. Aumente a versão ao publicar mudanças.
const V = 'engefit-v29';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png', '/vendor/supabase.js', '/demos.js', '/avatar.js', '/portrait.js', '/taco.js', '/dieta.js', '/exart.js', '/exercicios.js'];
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

// Lembretes (Web Push): o servidor manda {title, body, tag, url}
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ENGEFIT', {
    body: d.body || 'O Sistema tem um aviso para você.',
    tag: d.tag || 'engefit', renotify: true,
    icon: '/icons/icon-192.png', badge: '/icons/icon-192.png',
    data: { url: d.url || '/#inicio' }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/#inicio';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => new URL(c.url).origin === location.origin);
    if (w) { w.navigate ? w.navigate(url).catch(() => {}) : 0; return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
