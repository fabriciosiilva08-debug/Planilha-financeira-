// Guarda o app no celular para abrir rápido e funcionar mesmo com internet fraca.
// Os dados ficam no Firebase (que também guarda uma cópia offline).
const VERSAO = 'patio-v1';
const ARQUIVOS = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === location.origin;
  const biblioteca = url.hostname === 'www.gstatic.com' || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!proprio && !biblioteca) return; // banco de dados e login vão direto para a internet
  // tenta a internet primeiro (pega atualizações) e usa a cópia guardada se estiver sem sinal
  e.respondWith(fetch(req).then(res => { if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); } return res; })
    .catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
