/* =========================================================================
   pwa-register.js — Registra o Service Worker (permite instalar o app) e
   recarrega a página sozinho quando detecta uma versão nova publicada,
   sem precisar que a pessoa limpe o cache manualmente.
   ========================================================================= */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((registro) => {
      // Verifica se já existe uma versão nova esperando pra assumir
      registro.addEventListener('updatefound', () => {
        const novoWorker = registro.installing;
        if (!novoWorker) return;
        novoWorker.addEventListener('statechange', () => {
          if (novoWorker.state === 'activated') {
            // Nova versão já assumiu — a troca de controller vai disparar
            // o reload abaixo automaticamente
          }
        });
      });
    }).catch(() => { /* offline não é crítico */ });
  });

  // Quando o Service Worker novo assume o controle da página (após
  // publicarmos uma atualização), recarrega a página uma única vez para
  // trazer a versão mais recente — sem precisar limpar cache na mão
  let jaRecarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (jaRecarregou) return;
    jaRecarregou = true;
    window.location.reload();
  });
}
