/* =========================================================================
   sw.js — Service Worker: cache dos arquivos da interface para uso
   offline/instalável. NÃO intercepta chamadas ao Supabase (outro domínio),
   só cuida dos arquivos estáticos do próprio site.
   ========================================================================= */

const CACHE_NAME = 'controle-servicos-v3';
const ARQUIVOS_ESSENCIAIS = [
  'index.html',
  'obras.html',
  'portal.html',
  'css/styles.css',
  'css/obras.css',
  'css/portal.css',
  'js/pin-gate.js',
  'js/config.js',
  'js/utils.js',
  'js/store.js',
  'js/store-obras.js',
  'js/app.js',
  'js/app-obras.js',
  'js/app-portal.js',
  'js/pwa-register.js',
  'js/supabase-config.js',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE_NAME).map((c) => caches.delete(c)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas para outros domínios (Supabase, fontes, etc.)
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  // Estratégia network-first: sempre tenta buscar a versão mais nova da
  // rede primeiro (garante que quem abrir o app vê a versão publicada mais
  // recente). Só usa o cache como reserva se estiver sem internet.
  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        if (resposta.ok) {
          const clone = resposta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resposta;
      })
      .catch(() => caches.match(event.request))
  );
});
