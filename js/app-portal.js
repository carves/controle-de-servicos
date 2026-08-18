/* =========================================================================
   app-portal.js — Portal do Cliente (somente leitura)
   Mostra o progresso de UMA obra, acessada por um token único na URL
   (?token=...). Não tem PIN, não permite editar nada.
   ========================================================================= */

(function () {

  function getCorStatus(status) {
    const cores = {
      'Planejamento': 'blue',
      'Em Andamento': 'orange',
      'Concluída': 'green',
      'Pausada': 'gray'
    };
    return cores[status] || 'gray';
  }

  function abrirLightbox(url) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${Utils.escapeHtml(url)}" alt="Foto ampliada">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function renderizar(obra, diario, etapas) {
    const container = document.getElementById('portal-conteudo');

    const capaHtml = obra.foto
      ? `<div class="portal-capa" style="background-image:url('${Utils.escapeHtml(obra.foto)}')"></div>`
      : '';

    const etapasHtml = etapas.length > 0 ? etapas.map(e => `
      <div class="portal-etapa-item">
        <div class="portal-etapa-topo">
          <strong>${Utils.escapeHtml(e.etapa)}</strong>
          <span class="status-badge cor-${getCorStatus(e.status)}">${e.status}</span>
        </div>
        <div class="progresso-bar">
          <div class="progresso-fill" style="width:${e.progresso}%"></div>
          <span class="progresso-texto">${e.progresso}%</span>
        </div>
      </div>
    `).join('') : '<p class="sem-foto-texto">Nenhuma etapa cadastrada ainda.</p>';

    const diarioOrdenado = [...diario].sort((a, b) => new Date(b.data) - new Date(a.data));
    const diarioHtml = diarioOrdenado.length > 0 ? diarioOrdenado.map(reg => `
      <div class="diario-item">
        <div class="diario-header">
          <strong>${Utils.dateBR(reg.data)}</strong>
          <span class="diario-autor">${Utils.escapeHtml(reg.autor || 'Equipe')}</span>
        </div>
        <div class="diario-body">
          <p>${Utils.escapeHtml(reg.descricao)}</p>
          ${reg.clima ? `<p class="diario-campo">🌤️ ${Utils.escapeHtml(reg.clima)}</p>` : ''}
          ${reg.fotos && reg.fotos.length > 0 ? `
            <div class="diario-fotos">
              ${reg.fotos.map(url => `<img src="${Utils.escapeHtml(url)}" alt="Foto" class="diario-foto-thumb" data-url="${Utils.escapeHtml(url)}">`).join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `).join('') : '<p class="sem-foto-texto">Ainda não há registros no diário.</p>';

    container.innerHTML = `
      ${capaHtml}
      <div class="portal-header">
        <h1>${Utils.escapeHtml(obra.nome)}</h1>
        <p>${Utils.escapeHtml(obra.endereco || '')}</p>
        <span class="status-badge cor-${getCorStatus(obra.status)}">${obra.status}</span>
      </div>

      <section class="portal-secao">
        <h2>📅 Etapas</h2>
        <div class="portal-etapas-lista">${etapasHtml}</div>
      </section>

      <section class="portal-secao">
        <h2>📖 Diário de Bordo</h2>
        <div class="diario-lista">${diarioHtml}</div>
      </section>

      <footer class="portal-footer">Atualizado automaticamente pela equipe da obra</footer>
    `;

    container.querySelectorAll('.diario-foto-thumb').forEach(img => {
      img.addEventListener('click', () => abrirLightbox(img.dataset.url));
    });
  }

  async function init() {
    const container = document.getElementById('portal-conteudo');
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (!token) {
      container.innerHTML = '<div class="no-data portal-erro">Link inválido. Peça o link correto para a equipe da obra.</div>';
      return;
    }

    const obra = await StoreObras.obterObraPorToken(token);
    if (!obra) {
      container.innerHTML = '<div class="no-data portal-erro">Obra não encontrada. Verifique o link com quem te enviou.</div>';
      return;
    }

    const [diario, etapas] = await Promise.all([
      StoreObras.obterDiario(obra.id),
      StoreObras.obterCronograma(obra.id)
    ]);

    renderizar(obra, diario, etapas);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
