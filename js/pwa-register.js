/* =========================================================================
   pwa-register.js — Registra o Service Worker (permite instalar o app)
   ========================================================================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline não é crítico */ });
  });
}
