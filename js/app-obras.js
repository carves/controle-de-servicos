/* =========================================================================
   app-obras.js — Aplicação de Gestão de Obras
   ========================================================================= */

const AppObras = (function () {

  const estado = {
    obras: [],
    obraAtual: null,
    telaAtual: 'lista', // 'lista' ou 'obra'
    buscaObras: '',
    filtroStatusObra: 'todas'
  };

  // ===== TELA INICIAL: LISTAGEM DE OBRAS =====
  async function carregarObras() {
    try {
      estado.obras = await StoreObras.obterObras();
      renderizarListaObras();
    } catch (e) {
      Utils.toast('Erro ao carregar obras: ' + e.message);
    }
  }

  // Aplica busca por texto e filtro de status sobre a lista de obras
  function obrasFiltradas() {
    let lista = estado.obras;

    if (estado.filtroStatusObra !== 'todas') {
      lista = lista.filter(o => o.status === estado.filtroStatusObra);
    }

    if (estado.buscaObras.trim()) {
      const termo = Utils.normalize(estado.buscaObras);
      lista = lista.filter(o =>
        Utils.normalize(o.nome).includes(termo) ||
        Utils.normalize(o.cliente || '').includes(termo) ||
        Utils.normalize(o.endereco || '').includes(termo)
      );
    }

    return lista;
  }

  function renderizarListaObras() {
    const container = document.getElementById('lista-obras-container');
    const obras = obrasFiltradas();

    if (estado.obras.length === 0) {
      container.innerHTML = `
        <div class="no-data">
          <p>📭 Nenhuma obra cadastrada</p>
          <button id="btn-primeira-obra" class="btn btn-prim">Criar primeira obra</button>
        </div>
      `;
      document.getElementById('btn-primeira-obra').addEventListener('click', () => abrirFormularioObra());
      return;
    }

    if (obras.length === 0) {
      container.innerHTML = `<div class="no-data"><p>🔍 Nenhuma obra encontrada com esse filtro</p></div>`;
      return;
    }

    const html = obras.map(obra => `
      <div class="card-obra-link" data-id="${obra.id}">
        <button class="btn-editar-card" data-acao="editar" data-id="${obra.id}" title="Editar obra">✏️</button>
        <div class="card-foto" style="background-image: url('${Utils.escapeHtml(obra.foto || '')}'); background-color: var(--preto-surface);">
          ${!obra.foto ? '<span class="foto-placeholder">🏗️</span>' : ''}
        </div>
        <div class="card-info">
          <h3>${Utils.escapeHtml(obra.nome)}</h3>
          <p class="card-cliente"><strong>Cliente:</strong> ${Utils.escapeHtml(obra.cliente || '—')}</p>
          <p class="card-endereco"><strong>📍</strong> ${Utils.escapeHtml(obra.endereco || '—')}</p>
          ${obra.arquiteto ? `<p class="card-arquiteto"><strong>🎨 Arquiteto:</strong> ${Utils.escapeHtml(obra.arquiteto)}</p>` : ''}
          <div class="card-status-mini">
            <span class="status-badge cor-${getCorStatus(obra.status)}">${obra.status}</span>
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="galeria-obras">${html}</div>`;

    // Clique em qualquer lugar do card abre a obra direto — sem precisar
    // tocar duas vezes (hover pra revelar o botão, depois clicar nele).
    // O botão de editar continua isolado, sem abrir a obra.
    container.querySelectorAll('.card-obra-link').forEach(card => {
      card.addEventListener('click', () => abrirObra(parseInt(card.dataset.id)));
    });

    container.querySelectorAll('.btn-editar-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirFormularioObra(parseInt(btn.dataset.id));
      });
    });
  }

  function getCorStatus(status) {
    const cores = {
      'Planejamento': 'blue',
      'Em Andamento': 'orange',
      'Concluída': 'green',
      'Pausada': 'gray'
    };
    return cores[status] || 'gray';
  }

  // Atalho local: seletor de fotos usando o StoreObras para upload
  function criarSeletorFotos(fotosIniciais, idInput, idPreview, bucket = 'diario-fotos') {
    return Utils.criarSeletorFotos(fotosIniciais, idInput, idPreview, StoreObras, bucket);
  }

  // ===== ABRE OBRA INDIVIDUAL =====
  async function abrirObra(id) {
    const obra = estado.obras.find(o => o.id === id);
    if (!obra) return;

    estado.obraAtual = obra;
    estado.telaAtual = 'obra';

    // Mostrar painel (esconde a busca da lista — não faz sentido
    // enquanto estamos dentro de uma obra)
    document.getElementById('toolbar-obras').style.display = 'none';
    document.getElementById('lista-obras-container').style.display = 'none';
    document.getElementById('painel-obra-container').style.display = 'flex';

    // Preencher header
    document.getElementById('painel-nome-obra').textContent = obra.nome;
    document.getElementById('painel-endereco-obra').textContent = obra.endereco || '—';
    document.getElementById('painel-status-badge').textContent = obra.status;
    document.getElementById('painel-status-badge').className = `status-badge cor-${getCorStatus(obra.status)}`;

    // Carregar conteúdo padrão (diário)
    await carregarDiario();
  }

  function voltarParaLista() {
    estado.telaAtual = 'lista';
    estado.obraAtual = null;
    document.getElementById('toolbar-obras').style.display = 'flex';
    document.getElementById('lista-obras-container').style.display = 'block';
    document.getElementById('painel-obra-container').style.display = 'none';
  }

  // Mostra o link do Portal do Cliente (página pública só-leitura desta obra)
  function mostrarLinkPortal() {
    const obra = estado.obraAtual;
    if (!obra) return;
    if (!obra.token_portal) {
      Utils.toast('Esta obra ainda não tem link de portal — edite e salve a obra para gerar um');
      return;
    }

    const base = location.origin + location.pathname.replace('obras.html', '');
    const url = base + 'portal.html?token=' + obra.token_portal;

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>🔗 Portal do Cliente</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <p class="portal-link-explicacao">Envie este link para o cliente acompanhar o andamento da obra. Ele só consegue ver, não pode editar nada.</p>
        <input type="text" id="link-portal-input" value="${Utils.escapeHtml(url)}" readonly>
        <div class="form-botoes">
          <button type="button" id="btn-copiar-link-portal" class="btn btn-salvar">📋 Copiar Link</button>
          <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Fechar</button>
        </div>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    const input = document.getElementById('link-portal-input');
    input.addEventListener('click', () => input.select());

    document.getElementById('btn-copiar-link-portal').addEventListener('click', async () => {
      const ok = await Utils.copy(url);
      Utils.toast(ok ? 'Link copiado!' : 'Não copiou automático — selecione o texto e copie manualmente');
    });
  }

  // ===== DIÁRIO DE BORDO =====
  async function carregarDiario() {
    if (!estado.obraAtual) return;
    const diario = await StoreObras.obterDiario(estado.obraAtual.id);
    renderizarDiario(diario);
  }

  // Monta uma versão para impressão do diário e abre o diálogo de impressão
  // (o usuário escolhe "Salvar como PDF" no próprio diálogo do navegador)
  async function exportarDiarioPDF() {
    if (!estado.obraAtual) return;
    Utils.toast('Preparando PDF...');

    const registros = await StoreObras.obterDiario(estado.obraAtual.id);
    const obra = estado.obraAtual;

    // Ordena do mais antigo para o mais novo (ordem cronológica de leitura)
    const ordenados = [...registros].sort((a, b) => new Date(a.data) - new Date(b.data));

    const corpoHtml = ordenados.map(reg => `
      <section class="pdf-registro">
        <div class="pdf-registro-header">
          <strong>${Utils.dateBR(reg.data)}</strong>
          <span>${Utils.escapeHtml(reg.autor || 'Sem autor')}</span>
        </div>
        <p>${Utils.escapeHtml(reg.descricao)}</p>
        ${reg.clima ? `<p class="pdf-campo">🌤️ Clima: ${Utils.escapeHtml(reg.clima)}</p>` : ''}
        ${reg.pessoal_presente ? `<p class="pdf-campo">👥 Pessoal: ${Utils.escapeHtml(reg.pessoal_presente)}</p>` : ''}
        ${reg.fotos && reg.fotos.length > 0 ? `
          <div class="pdf-fotos">
            ${reg.fotos.map(url => `<img src="${Utils.escapeHtml(url)}" alt="Foto do registro">`).join('')}
          </div>
        ` : ''}
      </section>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Diário de Bordo - ${Utils.escapeHtml(obra.nome)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 30px; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .pdf-subtitulo { color: #555; font-size: 13px; margin-bottom: 24px; }
          .pdf-registro { border-bottom: 1px solid #ddd; padding: 14px 0; page-break-inside: avoid; }
          .pdf-registro-header { display: flex; justify-content: space-between; font-size: 13px; color: #333; margin-bottom: 6px; }
          .pdf-registro p { font-size: 13px; line-height: 1.5; margin: 4px 0; }
          .pdf-campo { color: #555; font-size: 12px; }
          .pdf-fotos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
          .pdf-fotos img { width: 140px; height: 140px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc; }
          @media print { .pdf-registro { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <h1>📖 Diário de Bordo — ${Utils.escapeHtml(obra.nome)}</h1>
        <p class="pdf-subtitulo">${Utils.escapeHtml(obra.endereco || '')} ${obra.cliente ? '· Cliente: ' + Utils.escapeHtml(obra.cliente) : ''} · ${ordenados.length} registro(s)</p>
        ${corpoHtml || '<p>Nenhum registro no diário.</p>'}
        <script>window.onload = () => window.print();</script>
      </body>
      </html>
    `;

    const janela = window.open('', '_blank');
    if (!janela) {
      Utils.toast('Permita pop-ups para exportar o PDF');
      return;
    }
    janela.document.write(html);
    janela.document.close();
  }

  function renderizarDiario(registros) {
    const container = document.getElementById('diario-lista');
    if (registros.length === 0) {
      container.innerHTML = '<div class="no-data">Nenhum registro no diário</div>';
      return;
    }

    const html = registros.map(reg => `
      <div class="diario-item" data-id="${reg.id}">
        <div class="diario-header">
          <strong>${Utils.dateBR(reg.data)}</strong>
          <span class="diario-autor">${Utils.escapeHtml(reg.autor || 'Sem autor')}</span>
        </div>
        <div class="diario-body">
          <p>${Utils.escapeHtml(reg.descricao)}</p>
          ${reg.clima ? `<p class="diario-campo">🌤️ Clima: ${Utils.escapeHtml(reg.clima)}</p>` : ''}
          ${reg.pessoal_presente ? `<p class="diario-campo">👥 Pessoal: ${Utils.escapeHtml(reg.pessoal_presente)}</p>` : ''}
          ${Utils.htmlGaleriaFotos(reg.fotos)}
        </div>
        <div class="diario-footer">
          <button class="btn-card btn-pequeno" data-acao="editar-diario" data-id="${reg.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-diario" data-id="${reg.id}">Deletar</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    Utils.ativarGaleriaFotos(container);

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-diario') abrirFormularioDiario(id);
        else if (acao === 'deletar-diario') deletarDiarioConfirma(id);
      });
    });
  }

  async function abrirFormularioDiario(id = null) {
    let dados = {
      data: Utils.today(),
      autor: '',
      descricao: '',
      clima: '',
      pessoal_presente: '',
      fotos: []
    };

    if (id) {
      const diario = await StoreObras.obterDiario(estado.obraAtual.id);
      const reg = diario.find(r => r.id === id);
      if (reg) dados = reg;
    }

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${id ? 'Editar Registro' : 'Novo Registro'} do Diário</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <form id="form-diario">
          <input type="date" id="form-diario-data" value="${dados.data}" required>
          <input type="text" id="form-diario-autor" placeholder="Seu nome" value="${Utils.escapeHtml(dados.autor || '')}">
          <textarea id="form-diario-desc" placeholder="O que foi feito hoje?" required>${Utils.escapeHtml(dados.descricao)}</textarea>
          <input type="text" id="form-diario-clima" placeholder="Clima" value="${Utils.escapeHtml(dados.clima || '')}">
          <input type="text" id="form-diario-pessoal" placeholder="Pessoal presente" value="${Utils.escapeHtml(dados.pessoal_presente || '')}">

          <label class="campo-fotos-label">📷 Fotos</label>
          <input type="file" id="form-diario-fotos" accept="image/*" multiple>
          <div id="preview-fotos" class="preview-fotos"></div>

          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    const seletorFotos = criarSeletorFotos(dados.fotos, 'form-diario-fotos', 'preview-fotos');

    document.getElementById('form-diario').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('.btn-salvar');

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const formDados = {
          data: document.getElementById('form-diario-data').value,
          autor: document.getElementById('form-diario-autor').value,
          descricao: document.getElementById('form-diario-desc').value,
          clima: document.getElementById('form-diario-clima').value,
          pessoal_presente: document.getElementById('form-diario-pessoal').value,
          fotos: await seletorFotos.fotosFinais()
        };

        if (id) {
          await StoreObras.atualizarAnotacao(id, formDados);
          Utils.toast('Registro atualizado');
        } else {
          await StoreObras.adicionarAnotacao(estado.obraAtual.id, formDados);
          Utils.toast('Registro criado');
        }
        modal.style.display = 'none';
        await carregarDiario();
      } catch (e) {
        Utils.toast('Erro: ' + e.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
      }
    });
  }

  async function deletarDiarioConfirma(id) {
    if (!confirm('Deletar este registro?')) return;
    try {
      await StoreObras.deletarAnotacao(id);
      Utils.toast('Deletado');
      await carregarDiario();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // ===== CRONOGRAMA =====
  async function carregarCronograma() {
    if (!estado.obraAtual) return;
    const cronograma = await StoreObras.obterCronograma(estado.obraAtual.id);
    renderizarCronograma(cronograma);
  }

  // Cola o orçamento aprovado (descrição / unidade / quantidade / tempo de
  // execução / profissional / observações) e gera as etapas do cronograma de
  // uma vez, na ordem em que apareceram. Sempre adiciona ao final — para
  // remover uma etapa antiga, usa o botão "Deletar" da lista. Sem valor por
  // enquanto — a métrica de orçamento aqui é execução, não dinheiro.
  async function abrirImportarCronograma() {
    if (!estado.obraAtual) return;
    const cronogramaAtual = await StoreObras.obterCronograma(estado.obraAtual.id);
    GridImport.abrir({
      titulo: 'Importar orçamento aprovado',
      colunas: [
        { chave: 'descricao', label: 'Descrição', obrigatorio: true, tipo: 'texto' },
        { chave: 'unidade', label: 'Unidade', obrigatorio: false, tipo: 'texto' },
        { chave: 'quantidade', label: 'Quantidade', obrigatorio: false, tipo: 'numero' },
        { chave: 'tempo_execucao', label: 'Tempo de execução', obrigatorio: false, tipo: 'texto' },
        { chave: 'profissional', label: 'Profissional', obrigatorio: false, tipo: 'texto' },
        { chave: 'observacoes', label: 'Observações', obrigatorio: false, tipo: 'texto' }
      ],
      existentes: cronogramaAtual.map(e => e.etapa),
      campoDuplicata: 'descricao',
      sugestoes: { profissional: [...new Set(cronogramaAtual.map(e => e.profissional).filter(Boolean))] },
      aoConfirmar: async (linhas) => {
        const gravadas = await StoreObras.importarEtapas(estado.obraAtual.id, linhas);
        await carregarCronograma();
        Utils.toast(`${gravadas.length} item(ns) importado(s)`);
        return gravadas.map(g => ({
          descricao: g.etapa,
          unidade: g.unidade || '',
          quantidade: g.quantidade ?? '',
          tempo_execucao: g.tempo_execucao || '',
          profissional: g.profissional || '',
          observacoes: g.descricao || ''
        }));
      }
    });
  }

  function renderizarCronograma(etapas) {
    const container = document.getElementById('cronograma-lista');

    const linhasHtml = etapas.map(etapa => `
      <tr data-id="${etapa.id}">
        <td class="etapa-col-titulo" data-label="Título">${Utils.escapeHtml(etapa.etapa)}</td>
        <td class="etapa-col-obs" data-label="Observação">${Utils.escapeHtml(etapa.descricao || '—')}</td>
        <td class="etapa-col-status" data-label="Status"><span class="status-badge cor-${getCorStatus(etapa.status)}">${etapa.status}</span></td>
        <td class="etapa-col-progresso" data-label="Progresso">
          <div class="progresso-bar">
            <div class="progresso-fill" style="width: ${etapa.progresso}%"></div>
            <span class="progresso-texto">${etapa.progresso}%</span>
          </div>
        </td>
        <td class="etapa-col-acoes" data-label="Ações">
          <button class="btn-card btn-pequeno" data-acao="editar-etapa" data-id="${etapa.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-etapa" data-id="${etapa.id}">Deletar</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="tabela-etapas">
        <thead>
          <tr>
            <th class="etapa-col-titulo">Título</th>
            <th class="etapa-col-obs">Observação</th>
            <th class="etapa-col-status">Status</th>
            <th class="etapa-col-progresso">Progresso</th>
            <th class="etapa-col-acoes">Ações</th>
          </tr>
        </thead>
        <tbody id="etapas-tbody">
          ${linhasHtml || `<tr><td colspan="5" class="no-data">Nenhuma etapa cadastrada</td></tr>`}
        </tbody>
        <tfoot>
          <tr class="linha-add-etapa">
            <td><input type="text" id="add-etapa-titulo" placeholder="Título da etapa"></td>
            <td><input type="text" id="add-etapa-obs" placeholder="Observação (opcional)"></td>
            <td colspan="3"><button id="btn-add-etapa" class="btn btn-pequeno btn-prim">➕ Adicionar</button></td>
          </tr>
        </tfoot>
      </table>
    `;

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-etapa') abrirFormularioEtapa(id);
        else if (acao === 'deletar-etapa') deletarEtapaConfirma(id);
      });
    });

    // Adição rápida via linha da tabela (sem abrir modal)
    const inputTitulo = document.getElementById('add-etapa-titulo');
    const inputObs = document.getElementById('add-etapa-obs');
    const btnAdd = document.getElementById('btn-add-etapa');

    async function adicionarRapido() {
      const titulo = inputTitulo.value.trim();
      if (!titulo) {
        inputTitulo.focus();
        return;
      }
      try {
        btnAdd.disabled = true;
        await StoreObras.adicionarEtapa(estado.obraAtual.id, {
          etapa: titulo,
          descricao: inputObs.value.trim(),
          status: 'Planejado',
          progresso: 0
        });
        await carregarCronograma();
        // Mantém o foco no campo título para adicionar a próxima etapa rapidamente
        setTimeout(() => document.getElementById('add-etapa-titulo')?.focus(), 0);
      } catch (e) {
        Utils.toast('Erro ao adicionar etapa: ' + e.message);
        btnAdd.disabled = false;
      }
    }

    btnAdd.addEventListener('click', adicionarRapido);
    [inputTitulo, inputObs].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          adicionarRapido();
        }
      });
    });
  }

  async function abrirFormularioEtapa(id = null) {
    let dados = {
      etapa: '',
      descricao: '',
      data_inicio: '',
      data_fim_prevista: '',
      status: 'Planejado',
      progresso: 0
    };

    if (id) {
      const cronograma = await StoreObras.obterCronograma(estado.obraAtual.id);
      const etapa = cronograma.find(e => e.id === id);
      if (etapa) dados = etapa;
    }

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${id ? 'Editar Etapa' : 'Nova Etapa'}</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <form id="form-etapa">
          <input type="text" id="form-etapa-nome" placeholder="Nome da etapa" value="${Utils.escapeHtml(dados.etapa)}" required>
          <textarea id="form-etapa-desc" placeholder="Descrição">${Utils.escapeHtml(dados.descricao || '')}</textarea>
          <label>Data Início</label>
          <input type="date" id="form-etapa-inicio" value="${dados.data_inicio || ''}">
          <label>Data Fim Prevista</label>
          <input type="date" id="form-etapa-fim" value="${dados.data_fim_prevista || ''}">
          <select id="form-etapa-status">
            <option value="Planejado" ${dados.status === 'Planejado' ? 'selected' : ''}>Planejado</option>
            <option value="Em Andamento" ${dados.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="Concluída" ${dados.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
            <option value="Pausada" ${dados.status === 'Pausada' ? 'selected' : ''}>Pausada</option>
          </select>
          <label>Progresso: <span id="progresso-valor">${dados.progresso}%</span></label>
          <input type="range" id="form-etapa-progresso" min="0" max="100" value="${dados.progresso}" step="10">
          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    document.getElementById('form-etapa-progresso').addEventListener('input', (e) => {
      document.getElementById('progresso-valor').textContent = e.target.value + '%';
    });

    document.getElementById('form-etapa').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formDados = {
        etapa: document.getElementById('form-etapa-nome').value,
        descricao: document.getElementById('form-etapa-desc').value,
        data_inicio: document.getElementById('form-etapa-inicio').value || null,
        data_fim_prevista: document.getElementById('form-etapa-fim').value || null,
        status: document.getElementById('form-etapa-status').value,
        progresso: parseInt(document.getElementById('form-etapa-progresso').value)
      };

      try {
        if (id) {
          await StoreObras.atualizarEtapa(id, formDados);
          Utils.toast('Etapa atualizada');
        } else {
          await StoreObras.adicionarEtapa(estado.obraAtual.id, formDados);
          Utils.toast('Etapa criada');
        }
        modal.style.display = 'none';
        await carregarCronograma();
      } catch (e) {
        Utils.toast('Erro: ' + e.message);
      }
    });
  }

  async function deletarEtapaConfirma(id) {
    if (!confirm('Deletar esta etapa?')) return;
    try {
      await StoreObras.deletarEtapa(id);
      Utils.toast('Deletado');
      await carregarCronograma();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // ===== REVISÃO FINAL (observações da arquiteta/cliente para correção) =====
  async function carregarRevisao() {
    if (!estado.obraAtual) return;
    const revisao = await StoreObras.obterRevisao(estado.obraAtual.id);
    renderizarRevisao(revisao);
  }

  // Cola a lista de pendências levantadas na vistoria final da arquiteta
  // (descrição / ambiente / responsável) e grava tudo de uma vez.
  async function abrirImportarRevisao() {
    if (!estado.obraAtual) return;
    const revisaoAtual = await StoreObras.obterRevisao(estado.obraAtual.id);
    GridImport.abrir({
      titulo: 'Importar lista de vistoria',
      colunas: [
        { chave: 'descricao', label: 'Pendência', obrigatorio: true, tipo: 'texto' },
        { chave: 'ambiente', label: 'Ambiente', obrigatorio: false, tipo: 'texto' },
        { chave: 'responsavel', label: 'Responsável', obrigatorio: false, tipo: 'texto' }
      ],
      existentes: revisaoAtual.map(r => r.item),
      campoDuplicata: 'descricao',
      sugestoes: { responsavel: [...new Set(revisaoAtual.map(r => r.responsavel).filter(Boolean))] },
      aoConfirmar: async (linhas) => {
        const gravadas = await StoreObras.importarRevisao(estado.obraAtual.id, linhas);
        await carregarRevisao();
        Utils.toast(`${gravadas.length} item(ns) de vistoria importado(s)`);
        return gravadas.map(g => ({
          descricao: g.item,
          ambiente: (g.observacao || '').replace(/^Ambiente:\s*/, ''),
          responsavel: g.responsavel || ''
        }));
      }
    });
  }

  function renderizarRevisao(itens) {
    const container = document.getElementById('revisao-lista');

    const linhasHtml = itens.map(it => `
      <tr data-id="${it.id}">
        <td class="etapa-col-titulo" data-label="Item">${Utils.escapeHtml(it.item)}</td>
        <td class="etapa-col-obs" data-label="Observação">${Utils.escapeHtml(it.observacao || '—')}</td>
        <td class="etapa-col-status" data-label="Status">
          <span class="status-badge cor-${it.status === 'Corrigido' ? 'green' : 'orange'}">${it.status}</span>
        </td>
        <td class="etapa-col-progresso" data-label="Fotos">${it.fotos && it.fotos.length > 0 ? `📷 ${it.fotos.length}` : '—'}</td>
        <td class="etapa-col-acoes" data-label="Ações">
          <button class="btn-card btn-pequeno" data-acao="editar-revisao" data-id="${it.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-revisao" data-id="${it.id}">Deletar</button>
        </td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="tabela-etapas">
        <thead>
          <tr>
            <th class="etapa-col-titulo">Item</th>
            <th class="etapa-col-obs">Observação</th>
            <th class="etapa-col-status">Status</th>
            <th class="etapa-col-progresso">Fotos</th>
            <th class="etapa-col-acoes">Ações</th>
          </tr>
        </thead>
        <tbody id="revisao-tbody">
          ${linhasHtml || `<tr><td colspan="5" class="no-data">Nenhum item de revisão cadastrado</td></tr>`}
        </tbody>
        <tfoot>
          <tr class="linha-add-etapa">
            <td><input type="text" id="add-revisao-item" placeholder="O que precisa corrigir"></td>
            <td><input type="text" id="add-revisao-obs" placeholder="Observação (opcional)"></td>
            <td colspan="3"><button id="btn-add-revisao" class="btn btn-pequeno btn-prim">➕ Adicionar</button></td>
          </tr>
        </tfoot>
      </table>
    `;

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-revisao') abrirFormularioRevisao(id);
        else if (acao === 'deletar-revisao') deletarRevisaoConfirma(id);
      });
    });

    // Adição rápida via linha da tabela (sem abrir modal)
    const inputItem = document.getElementById('add-revisao-item');
    const inputObs = document.getElementById('add-revisao-obs');
    const btnAdd = document.getElementById('btn-add-revisao');

    async function adicionarRapido() {
      const item = inputItem.value.trim();
      if (!item) { inputItem.focus(); return; }
      try {
        btnAdd.disabled = true;
        await StoreObras.adicionarRevisao(estado.obraAtual.id, {
          item,
          observacao: inputObs.value.trim(),
          status: 'Pendente'
        });
        await carregarRevisao();
        setTimeout(() => document.getElementById('add-revisao-item')?.focus(), 0);
      } catch (e) {
        Utils.toast('Erro ao adicionar: ' + e.message);
        btnAdd.disabled = false;
      }
    }

    btnAdd.addEventListener('click', adicionarRapido);
    [inputItem, inputObs].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); adicionarRapido(); }
      });
    });
  }

  async function abrirFormularioRevisao(id = null) {
    let dados = { item: '', observacao: '', responsavel: '', status: 'Pendente', fotos: [] };

    if (id) {
      const itens = await StoreObras.obterRevisao(estado.obraAtual.id);
      const it = itens.find(i => i.id === id);
      if (it) dados = it;
    }

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${id ? 'Editar Item de Revisão' : 'Novo Item de Revisão'}</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <form id="form-revisao">
          <input type="text" id="form-revisao-item" placeholder="O que precisa corrigir" value="${Utils.escapeHtml(dados.item)}" required>
          <textarea id="form-revisao-obs" placeholder="Observação detalhada">${Utils.escapeHtml(dados.observacao || '')}</textarea>
          <input type="text" id="form-revisao-responsavel" placeholder="Quem apontou (ex: arquiteta, cliente)" value="${Utils.escapeHtml(dados.responsavel || '')}">
          <select id="form-revisao-status">
            <option value="Pendente" ${dados.status === 'Pendente' ? 'selected' : ''}>Pendente</option>
            <option value="Corrigido" ${dados.status === 'Corrigido' ? 'selected' : ''}>Corrigido</option>
          </select>

          <label class="campo-fotos-label">📷 Fotos</label>
          <div id="preview-fotos-revisao" class="preview-fotos"></div>
          <input type="file" id="form-revisao-fotos" accept="image/*" multiple>

          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    const seletorFotos = criarSeletorFotos(dados.fotos, 'form-revisao-fotos', 'preview-fotos-revisao');

    document.getElementById('form-revisao').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('.btn-salvar');

      const formDados = {
        item: document.getElementById('form-revisao-item').value,
        observacao: document.getElementById('form-revisao-obs').value,
        responsavel: document.getElementById('form-revisao-responsavel').value,
        status: document.getElementById('form-revisao-status').value
      };

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        formDados.fotos = await seletorFotos.fotosFinais();

        if (id) {
          await StoreObras.atualizarRevisao(id, formDados);
          Utils.toast('Item atualizado');
        } else {
          await StoreObras.adicionarRevisao(estado.obraAtual.id, formDados);
          Utils.toast('Item criado');
        }
        modal.style.display = 'none';
        await carregarRevisao();
      } catch (e) {
        Utils.toast('Erro: ' + e.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
      }
    });
  }

  async function deletarRevisaoConfirma(id) {
    if (!confirm('Deletar este item de revisão?')) return;
    try {
      await StoreObras.deletarRevisao(id);
      Utils.toast('Deletado');
      await carregarRevisao();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // ===== ATIVIDADES =====
  async function carregarAtividades() {
    if (!estado.obraAtual) return;
    const atividades = await StoreObras.obterAtividades(estado.obraAtual.id);
    renderizarAtividades(atividades);
  }

  // Cola as tarefas do dia (descrição / responsável / data / status) e grava
  // tudo de uma vez, em vez de abrir o formulário uma tarefa por vez.
  async function abrirImportarAtividades() {
    if (!estado.obraAtual) return;
    const atividadesAtuais = await StoreObras.obterAtividades(estado.obraAtual.id);
    GridImport.abrir({
      titulo: 'Importar tarefas',
      colunas: [
        { chave: 'descricao', label: 'Descrição', obrigatorio: true, tipo: 'texto' },
        { chave: 'responsavel', label: 'Responsável', obrigatorio: false, tipo: 'texto' },
        { chave: 'data', label: 'Data', obrigatorio: false, tipo: 'data' },
        { chave: 'status', label: 'Status', obrigatorio: false, tipo: 'texto' }
      ],
      existentes: atividadesAtuais.map(a => a.titulo),
      campoDuplicata: 'descricao',
      sugestoes: { responsavel: [...new Set(atividadesAtuais.map(a => a.responsavel).filter(Boolean))] },
      aoConfirmar: async (linhas) => {
        const gravadas = await StoreObras.importarAtividades(estado.obraAtual.id, linhas);
        await carregarAtividades();
        Utils.toast(`${gravadas.length} tarefa(s) importada(s)`);
        return gravadas.map(g => ({
          descricao: g.titulo, responsavel: g.responsavel || '', data: g.data_prevista || '', status: g.status || ''
        }));
      }
    });
  }

  function renderizarAtividades(atividades) {
    const container = document.getElementById('atividades-lista');
    if (atividades.length === 0) {
      container.innerHTML = '<div class="no-data">Nenhuma atividade</div>';
      return;
    }

    const opcoesStatus = ['Planejado', 'Em Andamento', 'Concluído'];

    const html = atividades.map(at => `
      <div class="atividade-item" data-id="${at.id}">
        <div class="atividade-header">
          <h4>${Utils.escapeHtml(at.titulo)}</h4>
          <div class="atividade-tags">
            <select class="quick-edit-status cor-${getCorStatus(at.status)}" data-id="${at.id}">
              ${opcoesStatus.map(s => `<option value="${s}" ${at.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <span class="badge cor-${at.prioridade === 'Alta' ? 'red' : at.prioridade === 'Média' ? 'orange' : 'blue'}">${at.prioridade}</span>
          </div>
        </div>
        <div class="atividade-body">
          <p>${Utils.escapeHtml(at.descricao || '')}</p>
          <p><strong>Responsável:</strong>
            <span class="quick-edit-texto" data-campo="responsavel" data-id="${at.id}" contenteditable="true">${Utils.escapeHtml(at.responsavel || '')}</span>
          </p>
          <p><strong>Previsão:</strong>
            <input type="date" class="quick-edit-data" data-campo="data_prevista" data-id="${at.id}" value="${at.data_prevista || ''}">
          </p>
          ${at.data_conclusao ? `<p><strong>Concluída em:</strong> ${Utils.dateBR(at.data_conclusao)}</p>` : ''}
          ${Utils.htmlGaleriaFotos(at.fotos)}
        </div>
        <div class="atividade-footer">
          <button class="btn-card btn-pequeno" data-acao="editar-atividade" data-id="${at.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-atividade" data-id="${at.id}">Deletar</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    Utils.ativarGaleriaFotos(container);

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-atividade') abrirFormularioAtividade(id);
        else if (acao === 'deletar-atividade') deletarAtividadeConfirma(id);
      });
    });

    // Edição rápida direto no card — sem abrir modal. Pensado para o uso mais
    // comum: colar várias tarefas de uma vez e depois ajustar responsável,
    // data e status item a item, olhando a lista.
    container.querySelectorAll('.quick-edit-status').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = parseInt(sel.dataset.id);
        try {
          await StoreObras.atualizarAtividade(id, { status: sel.value });
          Utils.toast('Status atualizado');
          await carregarAtividades();
        } catch (e) {
          Utils.toast('Erro ao atualizar status');
        }
      });
    });

    container.querySelectorAll('.quick-edit-texto').forEach(el => {
      el.addEventListener('blur', async () => {
        const id = parseInt(el.dataset.id);
        const campo = el.dataset.campo;
        try {
          await StoreObras.atualizarAtividade(id, { [campo]: el.textContent.trim() });
        } catch (e) {
          Utils.toast('Erro ao salvar');
        }
      });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    });

    container.querySelectorAll('.quick-edit-data').forEach(el => {
      el.addEventListener('change', async () => {
        const id = parseInt(el.dataset.id);
        const campo = el.dataset.campo;
        try {
          await StoreObras.atualizarAtividade(id, { [campo]: el.value || null });
          Utils.toast('Data atualizada');
        } catch (e) {
          Utils.toast('Erro ao salvar data');
        }
      });
    });
  }

  async function abrirFormularioAtividade(id = null) {
    let dados = {
      titulo: '',
      descricao: '',
      responsavel: '',
      data_prevista: '',
      status: 'Planejado',
      prioridade: 'Média',
      fotos: []
    };

    if (id) {
      const atividades = await StoreObras.obterAtividades(estado.obraAtual.id);
      const at = atividades.find(a => a.id === id);
      if (at) dados = at;
    }

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${id ? 'Editar Atividade' : 'Nova Atividade'}</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <form id="form-atividade">
          <input type="text" id="form-atividade-titulo" placeholder="Título da atividade" value="${Utils.escapeHtml(dados.titulo)}" required>
          <textarea id="form-atividade-desc" placeholder="Descrição">${Utils.escapeHtml(dados.descricao || '')}</textarea>
          <input type="text" id="form-atividade-responsavel" placeholder="Responsável" value="${Utils.escapeHtml(dados.responsavel || '')}">
          <label>Data Prevista</label>
          <input type="date" id="form-atividade-data" value="${dados.data_prevista || ''}">
          <select id="form-atividade-status">
            <option value="Planejado" ${dados.status === 'Planejado' ? 'selected' : ''}>Planejado</option>
            <option value="Em Andamento" ${dados.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="Concluído" ${dados.status === 'Concluído' ? 'selected' : ''}>Concluído</option>
            <option value="Cancelado" ${dados.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
          <select id="form-atividade-prioridade">
            <option value="Baixa" ${dados.prioridade === 'Baixa' ? 'selected' : ''}>Baixa</option>
            <option value="Média" ${dados.prioridade === 'Média' ? 'selected' : ''}>Média</option>
            <option value="Alta" ${dados.prioridade === 'Alta' ? 'selected' : ''}>Alta</option>
          </select>

          <label class="campo-fotos-label">📷 Fotos</label>
          <div id="preview-fotos-atividade" class="preview-fotos"></div>
          <input type="file" id="form-atividade-fotos" accept="image/*" multiple>

          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    const seletorFotos = criarSeletorFotos(dados.fotos, 'form-atividade-fotos', 'preview-fotos-atividade');

    document.getElementById('form-atividade').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('.btn-salvar');

      const formDados = {
        titulo: document.getElementById('form-atividade-titulo').value,
        descricao: document.getElementById('form-atividade-desc').value,
        responsavel: document.getElementById('form-atividade-responsavel').value,
        data_prevista: document.getElementById('form-atividade-data').value || null,
        status: document.getElementById('form-atividade-status').value,
        prioridade: document.getElementById('form-atividade-prioridade').value
      };

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        formDados.fotos = await seletorFotos.fotosFinais();

        if (id) {
          await StoreObras.atualizarAtividade(id, formDados);
          Utils.toast('Atividade atualizada');
        } else {
          await StoreObras.adicionarAtividade(estado.obraAtual.id, formDados);
          Utils.toast('Atividade criada');
        }
        modal.style.display = 'none';
        await carregarAtividades();
      } catch (e) {
        Utils.toast('Erro: ' + e.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
      }
    });
  }

  async function deletarAtividadeConfirma(id) {
    if (!confirm('Deletar esta atividade?')) return;
    try {
      await StoreObras.deletarAtividade(id);
      Utils.toast('Deletado');
      await carregarAtividades();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // ===== MATERIAIS =====
  async function carregarMateriais() {
    if (!estado.obraAtual) return;
    const materiais = await StoreObras.obterMateriais(estado.obraAtual.id);
    renderizarMateriais(materiais);
  }

  function renderizarMateriais(materiais) {
    const container = document.getElementById('materiais-lista');
    if (materiais.length === 0) {
      container.innerHTML = '<div class="no-data">Nenhum material</div>';
      return;
    }

    const html = materiais.map(mat => `
      <div class="material-item" data-id="${mat.id}">
        <div class="material-header">
          <h4>${Utils.escapeHtml(mat.descricao)}</h4>
          <div class="material-tags">
            <span class="status-badge cor-${getCorStatus(mat.status)}">${mat.status}</span>
            <label class="switch-comprar ${mat.precisa_comprar ? 'ativo' : ''}">
              <input type="checkbox" class="quick-edit-comprar" data-id="${mat.id}" ${mat.precisa_comprar ? 'checked' : ''}>
              <span class="switch-track"><span class="switch-knob"></span></span>
              <span class="switch-label">Comprar</span>
            </label>
          </div>
        </div>
        <div class="material-body">
          <p><strong>Levar em:</strong>
            <input type="date" class="quick-edit-data" data-campo="data_entrega_prevista" data-id="${mat.id}" value="${mat.data_entrega_prevista || ''}">
          </p>
          ${mat.observacoes ? `<p><strong>Obs:</strong> ${Utils.escapeHtml(mat.observacoes)}</p>` : ''}
          ${Utils.htmlGaleriaFotos(mat.fotos)}
        </div>
        <div class="material-footer">
          <button class="btn-card btn-pequeno" data-acao="editar-material" data-id="${mat.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-material" data-id="${mat.id}">Deletar</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;
    Utils.ativarGaleriaFotos(container);

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-material') abrirFormularioMaterial(id);
        else if (acao === 'deletar-material') deletarMaterialConfirma(id);
      });
    });

    // Toggle rápido "Comprar" direto no card — sem abrir modal
    container.querySelectorAll('.quick-edit-comprar').forEach(chk => {
      chk.addEventListener('change', async () => {
        const id = parseInt(chk.dataset.id);
        const label = chk.closest('.switch-comprar');
        try {
          await StoreObras.atualizarMaterial(id, { precisa_comprar: chk.checked });
          label.classList.toggle('ativo', chk.checked);
          Utils.toast(chk.checked ? 'Marcado para comprar' : 'Marcado como já em posse');
        } catch (e) {
          chk.checked = !chk.checked;
          Utils.toast('Erro ao atualizar');
        }
      });
    });

    // Data "Levar em" editável direto no card
    container.querySelectorAll('.quick-edit-data').forEach(el => {
      el.addEventListener('change', async () => {
        const id = parseInt(el.dataset.id);
        const campo = el.dataset.campo;
        try {
          await StoreObras.atualizarMaterial(id, { [campo]: el.value || null });
          Utils.toast('Data atualizada');
        } catch (e) {
          Utils.toast('Erro ao salvar data');
        }
      });
    });
  }

  async function abrirFormularioMaterial(id = null) {
    let dados = {
      descricao: '',
      data_entrega_prevista: '',
      precisa_comprar: false,
      status: 'Planejado',
      observacoes: '',
      fotos: []
    };

    if (id) {
      const materiais = await StoreObras.obterMateriais(estado.obraAtual.id);
      const mat = materiais.find(m => m.id === id);
      if (mat) dados = mat;
    }

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${id ? 'Editar Material' : 'Novo Material'}</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <form id="form-material">
          <input type="text" id="form-material-desc" placeholder="Descrição do material" value="${Utils.escapeHtml(dados.descricao)}" required>
          <label>Levar em (data que precisa estar na obra)</label>
          <input type="date" id="form-material-entrega" value="${dados.data_entrega_prevista || ''}">
          <select id="form-material-status">
            <option value="Planejado" ${dados.status === 'Planejado' ? 'selected' : ''}>Planejado</option>
            <option value="Pedido" ${dados.status === 'Pedido' ? 'selected' : ''}>Pedido</option>
            <option value="Entregue" ${dados.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
            <option value="Cancelado" ${dados.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
          <label class="switch-comprar ${dados.precisa_comprar ? 'ativo' : ''}" id="label-form-material-comprar">
            <input type="checkbox" id="form-material-comprar" ${dados.precisa_comprar ? 'checked' : ''}>
            <span class="switch-track"><span class="switch-knob"></span></span>
            <span class="switch-label">Precisa comprar</span>
          </label>
          <textarea id="form-material-obs" placeholder="Observações">${Utils.escapeHtml(dados.observacoes || '')}</textarea>

          <label class="campo-fotos-label">📷 Fotos</label>
          <div id="preview-fotos-material" class="preview-fotos"></div>
          <input type="file" id="form-material-fotos" accept="image/*" multiple>

          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    const seletorFotos = criarSeletorFotos(dados.fotos, 'form-material-fotos', 'preview-fotos-material');

    // Toggle "Precisa comprar" dentro do form — só liga a cor, o valor real
    // é lido no submit a partir do checkbox.
    document.getElementById('form-material-comprar').addEventListener('change', (e) => {
      document.getElementById('label-form-material-comprar').classList.toggle('ativo', e.target.checked);
    });

    document.getElementById('form-material').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = e.target.querySelector('.btn-salvar');

      const formDados = {
        descricao: document.getElementById('form-material-desc').value,
        data_entrega_prevista: document.getElementById('form-material-entrega').value || null,
        precisa_comprar: document.getElementById('form-material-comprar').checked,
        status: document.getElementById('form-material-status').value,
        observacoes: document.getElementById('form-material-obs').value
      };

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        formDados.fotos = await seletorFotos.fotosFinais();

        if (id) {
          await StoreObras.atualizarMaterial(id, formDados);
          Utils.toast('Material atualizado');
        } else {
          await StoreObras.adicionarMaterial(estado.obraAtual.id, formDados);
          Utils.toast('Material criado');
        }
        modal.style.display = 'none';
        await carregarMateriais();
      } catch (e) {
        Utils.toast('Erro: ' + e.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
      }
    });
  }

  async function deletarMaterialConfirma(id) {
    if (!confirm('Deletar este material?')) return;
    try {
      await StoreObras.deletarMaterial(id);
      Utils.toast('Deletado');
      await carregarMateriais();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // ===== RESUMO DA OBRA =====
  async function carregarResumo() {
    if (!estado.obraAtual) return;
    const obraId = estado.obraAtual.id;
    const [etapas, diario, atividades, materiais, revisao] = await Promise.all([
      StoreObras.obterCronograma(obraId),
      StoreObras.obterDiario(obraId),
      StoreObras.obterAtividades(obraId),
      StoreObras.obterMateriais(obraId),
      StoreObras.obterRevisao(obraId)
    ]);
    renderizarResumo(etapas, diario, atividades, materiais, revisao);
  }

  function contarPorStatus(itens) {
    const contagem = {};
    itens.forEach(it => {
      contagem[it.status] = (contagem[it.status] || 0) + 1;
    });
    return contagem;
  }

  function htmlContagem(contagem) {
    const chaves = Object.keys(contagem);
    if (chaves.length === 0) return '<p class="sem-foto-texto">Nada cadastrado ainda.</p>';
    return chaves.map(status => `
      <div class="resumo-linha">
        <span>${Utils.escapeHtml(status)}</span>
        <strong>${contagem[status]}</strong>
      </div>
    `).join('');
  }

  function renderizarResumo(etapas, diario, atividades, materiais, revisao) {
    const container = document.getElementById('resumo-conteudo');

    // Progresso geral das etapas (média simples)
    const progressoMedio = etapas.length > 0
      ? Math.round(etapas.reduce((soma, e) => soma + (e.progresso || 0), 0) / etapas.length)
      : 0;
    const etapasConcluidas = etapas.filter(e => e.status === 'Concluída').length;

    // Diário: total de registros e data do último
    const diarioOrdenado = [...diario].sort((a, b) => new Date(b.data) - new Date(a.data));
    const ultimoRegistro = diarioOrdenado[0];

    // Revisão: pendentes vs corrigidos
    const revisaoPendente = revisao.filter(r => r.status !== 'Corrigido').length;
    const revisaoCorrigida = revisao.filter(r => r.status === 'Corrigido').length;

    container.innerHTML = `
      <div class="resumo-cards">
        <div class="card-resumo">
          <h4>Progresso das Etapas</h4>
          <div class="progresso-bar">
            <div class="progresso-fill" style="width:${progressoMedio}%"></div>
            <span class="progresso-texto">${progressoMedio}%</span>
          </div>
          <p class="resumo-detalhe">${etapasConcluidas} de ${etapas.length} etapa(s) concluída(s)</p>
        </div>

        <div class="card-resumo">
          <h4>📖 Diário de Bordo</h4>
          <p class="resumo-detalhe"><strong>${diario.length}</strong> registro(s) no total</p>
          ${ultimoRegistro ? `<p class="resumo-detalhe">Último em ${Utils.dateBR(ultimoRegistro.data)} por ${Utils.escapeHtml(ultimoRegistro.autor || 'equipe')}</p>` : '<p class="sem-foto-texto">Nenhum registro ainda.</p>'}
        </div>

        <div class="card-resumo">
          <h4>✓ Atividades</h4>
          ${htmlContagem(contarPorStatus(atividades))}
        </div>

        <div class="card-resumo">
          <h4>📦 Materiais</h4>
          ${htmlContagem(contarPorStatus(materiais))}
        </div>

        <div class="card-resumo">
          <h4>🔍 Revisão Final</h4>
          <div class="resumo-linha"><span>Pendente</span><strong>${revisaoPendente}</strong></div>
          <div class="resumo-linha"><span>Corrigido</span><strong>${revisaoCorrigida}</strong></div>
        </div>
      </div>
    `;
  }

  // ===== FORMULÁRIO DE OBRA =====
  async function abrirFormularioObra(id = null) {
    let dados = {
      nome: '',
      cliente: '',
      arquiteto: '',
      endereco: '',
      descricao: '',
      status: 'Planejamento',
      data_inicio: '',
      data_prevista_fim: '',
      responsavel: '',
      foto: ''
    };

    if (id) {
      const obra = estado.obras.find(o => o.id === id);
      if (obra) dados = obra;
    }

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${id ? 'Editar Obra' : 'Nova Obra'}</h2>
          <button class="btn-fechar-form" onclick="document.getElementById('form-modal-obras').style.display='none'">✕</button>
        </div>
        <form id="form-obra">
          <input type="text" id="form-obra-nome" placeholder="Nome da obra" value="${Utils.escapeHtml(dados.nome)}" required>
          <input type="text" id="form-obra-cliente" placeholder="Cliente" value="${Utils.escapeHtml(dados.cliente || '')}">
          <input type="text" id="form-obra-arquiteto" placeholder="Arquiteto" value="${Utils.escapeHtml(dados.arquiteto || '')}">
          <input type="text" id="form-obra-endereco" placeholder="Endereço" value="${Utils.escapeHtml(dados.endereco || '')}">
          <textarea id="form-obra-desc" placeholder="Descrição da obra">${Utils.escapeHtml(dados.descricao || '')}</textarea>

          <label class="campo-fotos-label">🖼️ Foto de Apresentação</label>
          <div id="preview-foto-capa" class="preview-foto-capa"></div>
          <input type="file" id="form-obra-foto-arquivo" accept="image/*">

          <input type="text" id="form-obra-responsavel" placeholder="Responsável da obra" value="${Utils.escapeHtml(dados.responsavel || '')}">
          <label>Data Início</label>
          <input type="date" id="form-obra-inicio" value="${dados.data_inicio || ''}">
          <label>Data Previsão Fim</label>
          <input type="date" id="form-obra-fim" value="${dados.data_prevista_fim || ''}">
          <select id="form-obra-status">
            <option value="Planejamento" ${dados.status === 'Planejamento' ? 'selected' : ''}>Planejamento</option>
            <option value="Em Andamento" ${dados.status === 'Em Andamento' ? 'selected' : ''}>Em Andamento</option>
            <option value="Concluída" ${dados.status === 'Concluída' ? 'selected' : ''}>Concluída</option>
            <option value="Pausada" ${dados.status === 'Pausada' ? 'selected' : ''}>Pausada</option>
          </select>
          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" class="btn btn-cancelar" onclick="document.getElementById('form-modal-obras').style.display='none'">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal-obras');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    // ===== Preview da foto de apresentação =====
    let fotoAtual = dados.foto || '';
    const previewCapa = document.getElementById('preview-foto-capa');
    const inputFotoArquivo = document.getElementById('form-obra-foto-arquivo');

    function renderizarPreviewCapa() {
      if (inputFotoArquivo.files[0]) {
        const urlLocal = URL.createObjectURL(inputFotoArquivo.files[0]);
        previewCapa.innerHTML = `
          <div class="preview-foto-item preview-foto-nova">
            <img src="${urlLocal}" alt="Nova foto de capa" class="preview-foto-clicavel" data-url="${urlLocal}">
            <span class="preview-foto-badge">novo</span>
          </div>
        `;
      } else if (fotoAtual) {
        previewCapa.innerHTML = `
          <div class="preview-foto-item">
            <img src="${Utils.escapeHtml(fotoAtual)}" alt="Foto de capa atual" class="preview-foto-clicavel" data-url="${Utils.escapeHtml(fotoAtual)}">
            <button type="button" class="remover-foto" id="btn-remover-foto-capa">✕</button>
          </div>
        `;
        document.getElementById('btn-remover-foto-capa').addEventListener('click', () => {
          fotoAtual = '';
          inputFotoArquivo.value = '';
          renderizarPreviewCapa();
        });
      } else {
        previewCapa.innerHTML = '<p class="sem-foto-texto">Nenhuma foto selecionada</p>';
      }

      previewCapa.querySelectorAll('.preview-foto-clicavel').forEach(img => {
        img.addEventListener('click', () => Utils.abrirLightbox(img.dataset.url));
      });
    }
    renderizarPreviewCapa();
    inputFotoArquivo.addEventListener('change', renderizarPreviewCapa);

    document.getElementById('form-obra').addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = e.target.querySelector('.btn-salvar');
      const arquivoNovo = inputFotoArquivo.files[0];

      try {
        let urlFoto = fotoAtual;
        if (arquivoNovo) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Otimizando foto...';
          const arquivoComprimido = await Utils.comprimirImagem(arquivoNovo);
          submitBtn.textContent = 'Enviando foto...';
          urlFoto = await StoreObras.uploadFoto(arquivoComprimido, 'obras-fotos');
        }

        const formDados = {
          nome: document.getElementById('form-obra-nome').value,
          cliente: document.getElementById('form-obra-cliente').value,
          arquiteto: document.getElementById('form-obra-arquiteto').value,
          endereco: document.getElementById('form-obra-endereco').value,
          descricao: document.getElementById('form-obra-desc').value,
          responsavel: document.getElementById('form-obra-responsavel').value,
          foto: urlFoto,
          data_inicio: document.getElementById('form-obra-inicio').value || null,
          data_prevista_fim: document.getElementById('form-obra-fim').value || null,
          status: document.getElementById('form-obra-status').value
        };

        if (id) {
          await StoreObras.atualizarObra(id, formDados);
          Utils.toast('Obra atualizada');
        } else {
          await StoreObras.criarObra(formDados);
          Utils.toast('Obra criada');
        }
        modal.style.display = 'none';
        await carregarObras();
      } catch (e) {
        Utils.toast('Erro: ' + e.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar';
      }
    });
  }

  async function deletarObraConfirma(id) {
    if (!confirm('Tem certeza? Isso deletará toda a obra e seus registros!')) return;
    try {
      await StoreObras.deletarObra(id);
      Utils.toast('Obra deletada');
      await carregarObras();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // ===== EVENTOS E INICIALIZAÇÃO =====
  async function init() {
    // Botão nova obra
    document.getElementById('btn-nova-obra').addEventListener('click', () => abrirFormularioObra());

    // Botão voltar
    document.getElementById('btn-voltar-obras').addEventListener('click', voltarParaLista);

    // Botão do Portal do Cliente
    document.getElementById('btn-portal-cliente').addEventListener('click', mostrarLinkPortal);

    // Busca de obras
    document.getElementById('busca-obras').addEventListener('input', (e) => {
      estado.buscaObras = e.target.value;
      renderizarListaObras();
    });

    // Filtros de status
    document.querySelectorAll('.filtro-obra-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filtro-obra-btn').forEach(b => b.classList.remove('ativo'));
        btn.classList.add('ativo');
        estado.filtroStatusObra = btn.dataset.filtro;
        renderizarListaObras();
      });
    });

    // Botões das abas
    document.querySelectorAll('.aba-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('aba-ativa'));
        document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('aba-ativa'));
        e.target.classList.add('aba-ativa');
        const aba = e.target.dataset.aba;
        document.getElementById('aba-' + aba).classList.add('aba-ativa');

        if (aba === 'diario') await carregarDiario();
        else if (aba === 'cronograma') await carregarCronograma();
        else if (aba === 'atividades') await carregarAtividades();
        else if (aba === 'materiais') await carregarMateriais();
        else if (aba === 'revisao') await carregarRevisao();
        else if (aba === 'resumo') await carregarResumo();
      });
    });

    // Botões de novos registros
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'btn-nova-anotacao') await abrirFormularioDiario();
      else if (e.target.id === 'btn-exportar-diario') await exportarDiarioPDF();
      else if (e.target.id === 'btn-nova-atividade') await abrirFormularioAtividade();
      else if (e.target.id === 'btn-novo-material') await abrirFormularioMaterial();
      else if (e.target.id === 'btn-importar-cronograma') abrirImportarCronograma();
      else if (e.target.id === 'btn-importar-atividades') abrirImportarAtividades();
      else if (e.target.id === 'btn-importar-revisao') abrirImportarRevisao();
    });

    // Carregar obras inicialmente
    await carregarObras();
  }

  return { init };
})();

// Inicia quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', AppObras.init);
