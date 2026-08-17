/* =========================================================================
   app-obras.js — Aplicação de Gestão de Obras
   ========================================================================= */

const AppObras = (function () {

  const estado = {
    obras: [],
    obraAtual: null,
    telaAtual: 'lista' // 'lista' ou 'obra'
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

  function renderizarListaObras() {
    const container = document.getElementById('lista-obras-container');

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

    const html = estado.obras.map(obra => `
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
        <div class="card-overlay">
          <button class="btn-entrar" data-acao="abrir" data-id="${obra.id}">Acessar Obra →</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="galeria-obras">${html}</div>`;

    // Eventos
    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'abrir') abrirObra(id);
        else if (acao === 'editar') abrirFormularioObra(id);
        else if (acao === 'deletar') deletarObraConfirma(id);
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

  // ===== ABRE OBRA INDIVIDUAL =====
  async function abrirObra(id) {
    const obra = estado.obras.find(o => o.id === id);
    if (!obra) return;

    estado.obraAtual = obra;
    estado.telaAtual = 'obra';

    // Mostrar painel
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
    document.getElementById('lista-obras-container').style.display = 'block';
    document.getElementById('painel-obra-container').style.display = 'none';
  }

  // ===== DIÁRIO DE BORDO =====
  async function carregarDiario() {
    if (!estado.obraAtual) return;
    const diario = await StoreObras.obterDiario(estado.obraAtual.id);
    renderizarDiario(diario);
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
          ${reg.fotos && reg.fotos.length > 0 ? `
            <div class="diario-fotos">
              ${reg.fotos.map(url => `<img src="${Utils.escapeHtml(url)}" alt="Foto do diário" class="diario-foto-thumb" data-acao="ver-foto" data-url="${Utils.escapeHtml(url)}">`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="diario-footer">
          <button class="btn-card btn-pequeno" data-acao="editar-diario" data-id="${reg.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-diario" data-id="${reg.id}">Deletar</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        if (acao === 'ver-foto') {
          abrirLightbox(e.target.dataset.url);
          return;
        }
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-diario') abrirFormularioDiario(id);
        else if (acao === 'deletar-diario') deletarDiarioConfirma(id);
      });
    });
  }

  // Abre foto em tamanho grande (lightbox simples)
  function abrirLightbox(url) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${Utils.escapeHtml(url)}" alt="Foto ampliada">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
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

    // Fotos já salvas (ao editar) ficam nesta lista; novas entram em novasFotos
    let fotosExistentes = [...(dados.fotos || [])];

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
          <input type="file" id="form-diario-fotos" accept="image/*" capture="environment" multiple>
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

    const previewContainer = document.getElementById('preview-fotos');
    const inputFotos = document.getElementById('form-diario-fotos');

    function renderizarPreview() {
      const existentesHtml = fotosExistentes.map((url, i) => `
        <div class="preview-foto-item">
          <img src="${Utils.escapeHtml(url)}" alt="Foto">
          <button type="button" class="remover-foto" data-tipo="existente" data-idx="${i}">✕</button>
        </div>
      `).join('');

      const novasHtml = Array.from(inputFotos.files || []).map((arquivo, i) => `
        <div class="preview-foto-item preview-foto-nova">
          <img src="${URL.createObjectURL(arquivo)}" alt="Nova foto">
          <span class="preview-foto-badge">novo</span>
        </div>
      `).join('');

      previewContainer.innerHTML = existentesHtml + novasHtml;

      previewContainer.querySelectorAll('.remover-foto').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          fotosExistentes.splice(idx, 1);
          renderizarPreview();
        });
      });
    }
    renderizarPreview();

    inputFotos.addEventListener('change', renderizarPreview);

    document.getElementById('form-diario').addEventListener('submit', async (e) => {
      e.preventDefault();

      const submitBtn = e.target.querySelector('.btn-salvar');
      const arquivosNovos = inputFotos.files;

      try {
        let urlsNovas = [];
        if (arquivosNovos.length > 0) {
          submitBtn.disabled = true;
          submitBtn.textContent = `Enviando ${arquivosNovos.length} foto(s)...`;
          urlsNovas = await StoreObras.uploadFotos(arquivosNovos);
        }

        const formDados = {
          data: document.getElementById('form-diario-data').value,
          autor: document.getElementById('form-diario-autor').value,
          descricao: document.getElementById('form-diario-desc').value,
          clima: document.getElementById('form-diario-clima').value,
          pessoal_presente: document.getElementById('form-diario-pessoal').value,
          fotos: [...fotosExistentes, ...urlsNovas]
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

  function renderizarCronograma(etapas) {
    const container = document.getElementById('cronograma-lista');

    const linhasHtml = etapas.map(etapa => `
      <tr data-id="${etapa.id}">
        <td class="etapa-col-titulo">${Utils.escapeHtml(etapa.etapa)}</td>
        <td class="etapa-col-obs">${Utils.escapeHtml(etapa.descricao || '—')}</td>
        <td class="etapa-col-status"><span class="status-badge cor-${getCorStatus(etapa.status)}">${etapa.status}</span></td>
        <td class="etapa-col-progresso">
          <div class="progresso-bar">
            <div class="progresso-fill" style="width: ${etapa.progresso}%"></div>
            <span class="progresso-texto">${etapa.progresso}%</span>
          </div>
        </td>
        <td class="etapa-col-acoes">
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

  // ===== ATIVIDADES =====
  async function carregarAtividades() {
    if (!estado.obraAtual) return;
    const atividades = await StoreObras.obterAtividades(estado.obraAtual.id);
    renderizarAtividades(atividades);
  }

  function renderizarAtividades(atividades) {
    const container = document.getElementById('atividades-lista');
    if (atividades.length === 0) {
      container.innerHTML = '<div class="no-data">Nenhuma atividade</div>';
      return;
    }

    const html = atividades.map(at => `
      <div class="atividade-item" data-id="${at.id}">
        <div class="atividade-header">
          <h4>${Utils.escapeHtml(at.titulo)}</h4>
          <div class="atividade-tags">
            <span class="status-badge cor-${getCorStatus(at.status)}">${at.status}</span>
            <span class="badge cor-${at.prioridade === 'Alta' ? 'red' : at.prioridade === 'Média' ? 'orange' : 'blue'}">${at.prioridade}</span>
          </div>
        </div>
        <div class="atividade-body">
          <p>${Utils.escapeHtml(at.descricao || '')}</p>
          <p><strong>Responsável:</strong> ${Utils.escapeHtml(at.responsavel || '—')}</p>
          <p><strong>Previsão:</strong> ${Utils.dateBR(at.data_prevista) || '—'}</p>
          ${at.data_conclusao ? `<p><strong>Concluída em:</strong> ${Utils.dateBR(at.data_conclusao)}</p>` : ''}
        </div>
        <div class="atividade-footer">
          <button class="btn-card btn-pequeno" data-acao="editar-atividade" data-id="${at.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-atividade" data-id="${at.id}">Deletar</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-atividade') abrirFormularioAtividade(id);
        else if (acao === 'deletar-atividade') deletarAtividadeConfirma(id);
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
      prioridade: 'Média'
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

    document.getElementById('form-atividade').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formDados = {
        titulo: document.getElementById('form-atividade-titulo').value,
        descricao: document.getElementById('form-atividade-desc').value,
        responsavel: document.getElementById('form-atividade-responsavel').value,
        data_prevista: document.getElementById('form-atividade-data').value || null,
        status: document.getElementById('form-atividade-status').value,
        prioridade: document.getElementById('form-atividade-prioridade').value
      };

      try {
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
          <span class="status-badge cor-${getCorStatus(mat.status)}">${mat.status}</span>
        </div>
        <div class="material-body">
          <p><strong>Qtd:</strong> ${mat.quantidade} ${Utils.escapeHtml(mat.unidade || '')}</p>
          <p><strong>Fornecedor:</strong> ${Utils.escapeHtml(mat.fornecedor || '—')}</p>
          <p><strong>Valor:</strong> ${Utils.brl(mat.valor)}</p>
          <p><strong>Data Pedido:</strong> ${Utils.dateBR(mat.data_pedido) || '—'}</p>
          <p><strong>Entrega Prevista:</strong> ${Utils.dateBR(mat.data_entrega_prevista) || '—'}</p>
          ${mat.data_entrega ? `<p><strong>Entregue em:</strong> ${Utils.dateBR(mat.data_entrega)}</p>` : ''}
          ${mat.observacoes ? `<p><strong>Obs:</strong> ${Utils.escapeHtml(mat.observacoes)}</p>` : ''}
        </div>
        <div class="material-footer">
          <button class="btn-card btn-pequeno" data-acao="editar-material" data-id="${mat.id}">Editar</button>
          <button class="btn-card btn-pequeno btn-deletar" data-acao="deletar-material" data-id="${mat.id}">Deletar</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;

    container.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const acao = e.target.dataset.acao;
        const id = parseInt(e.target.dataset.id);
        if (acao === 'editar-material') abrirFormularioMaterial(id);
        else if (acao === 'deletar-material') deletarMaterialConfirma(id);
      });
    });
  }

  async function abrirFormularioMaterial(id = null) {
    let dados = {
      descricao: '',
      quantidade: '',
      unidade: '',
      fornecedor: '',
      data_pedido: '',
      data_entrega_prevista: '',
      valor: '',
      status: 'Planejado',
      observacoes: ''
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
          <input type="number" id="form-material-qtd" placeholder="Quantidade" value="${dados.quantidade || ''}" step="0.01">
          <input type="text" id="form-material-unidade" placeholder="Unidade (m, kg, unid...)" value="${Utils.escapeHtml(dados.unidade || '')}">
          <input type="text" id="form-material-fornecedor" placeholder="Fornecedor" value="${Utils.escapeHtml(dados.fornecedor || '')}">
          <label>Data Pedido</label>
          <input type="date" id="form-material-pedido" value="${dados.data_pedido || ''}">
          <label>Entrega Prevista</label>
          <input type="date" id="form-material-entrega" value="${dados.data_entrega_prevista || ''}">
          <input type="number" id="form-material-valor" placeholder="Valor" value="${dados.valor || ''}" step="0.01">
          <select id="form-material-status">
            <option value="Planejado" ${dados.status === 'Planejado' ? 'selected' : ''}>Planejado</option>
            <option value="Pedido" ${dados.status === 'Pedido' ? 'selected' : ''}>Pedido</option>
            <option value="Entregue" ${dados.status === 'Entregue' ? 'selected' : ''}>Entregue</option>
            <option value="Cancelado" ${dados.status === 'Cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
          <textarea id="form-material-obs" placeholder="Observações">${Utils.escapeHtml(dados.observacoes || '')}</textarea>
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

    document.getElementById('form-material').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formDados = {
        descricao: document.getElementById('form-material-desc').value,
        quantidade: document.getElementById('form-material-qtd').value,
        unidade: document.getElementById('form-material-unidade').value,
        fornecedor: document.getElementById('form-material-fornecedor').value,
        data_pedido: document.getElementById('form-material-pedido').value || null,
        data_entrega_prevista: document.getElementById('form-material-entrega').value || null,
        valor: document.getElementById('form-material-valor').value,
        status: document.getElementById('form-material-status').value,
        observacoes: document.getElementById('form-material-obs').value
      };

      try {
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
          <input type="text" id="form-obra-foto" placeholder="URL da foto (deixe vazio para usar ícone)" value="${Utils.escapeHtml(dados.foto || '')}">
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

    document.getElementById('form-obra').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formDados = {
        nome: document.getElementById('form-obra-nome').value,
        cliente: document.getElementById('form-obra-cliente').value,
        arquiteto: document.getElementById('form-obra-arquiteto').value,
        endereco: document.getElementById('form-obra-endereco').value,
        descricao: document.getElementById('form-obra-desc').value,
        responsavel: document.getElementById('form-obra-responsavel').value,
        foto: document.getElementById('form-obra-foto').value,
        data_inicio: document.getElementById('form-obra-inicio').value || null,
        data_prevista_fim: document.getElementById('form-obra-fim').value || null,
        status: document.getElementById('form-obra-status').value
      };

      try {
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
      });
    });

    // Botões de novos registros
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'btn-nova-anotacao') await abrirFormularioDiario();
      else if (e.target.id === 'btn-nova-atividade') await abrirFormularioAtividade();
      else if (e.target.id === 'btn-novo-material') await abrirFormularioMaterial();
    });

    // Carregar obras inicialmente
    await carregarObras();
  }

  return { init };
})();

// Inicia quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', AppObras.init);
