/* =========================================================================
   pin-gate.js — Trava de acesso simples por PIN
   Bloqueia a tela até o PIN correto ser digitado. Fica salvo na sessão
   do navegador (sessionStorage), então pede de novo só quando fechar a aba.

   PARA TROCAR O PIN:
   1. No terminal: echo -n "SEU_NOVO_PIN" | sha256sum
   2. Copie o hash gerado e substitua o valor de HASH_ESPERADO abaixo
   ========================================================================= */

(function () {
  const HASH_ESPERADO = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // PIN padrão: 1234
  const CHAVE_SESSAO = 'pinOk';

  // Esconde a página inteira até validar (evita flash de conteúdo)
  document.documentElement.style.visibility = 'hidden';

  if (sessionStorage.getItem(CHAVE_SESSAO) === '1') {
    document.documentElement.style.visibility = 'visible';
    return;
  }

  async function sha256(texto) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function iniciar() {
    const overlay = document.createElement('div');
    overlay.id = 'pin-gate-overlay';
    overlay.innerHTML = `
      <div class="pin-gate-box">
        <div class="pin-gate-icone">🔒</div>
        <h2>Acesso Restrito</h2>
        <p>Digite o PIN para continuar</p>
        <input type="password" id="pin-gate-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="• • • •" autocomplete="off">
        <button id="pin-gate-btn">Entrar</button>
        <p id="pin-gate-erro" class="pin-gate-erro-msg">PIN incorreto, tente novamente</p>
      </div>
    `;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = 'visible';

    const input = document.getElementById('pin-gate-input');
    const erro = document.getElementById('pin-gate-erro');
    input.focus();

    async function tentar() {
      const valor = input.value.trim();
      if (!valor) return;
      const hash = await sha256(valor);
      if (hash === HASH_ESPERADO) {
        sessionStorage.setItem(CHAVE_SESSAO, '1');
        overlay.remove();
      } else {
        erro.style.display = 'block';
        input.value = '';
        input.focus();
      }
    }

    document.getElementById('pin-gate-btn').addEventListener('click', tentar);
    input.addEventListener('keydown', (e) => {
      erro.style.display = 'none';
      if (e.key === 'Enter') tentar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
