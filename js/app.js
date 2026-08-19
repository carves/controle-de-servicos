/* =========================================================================
   app.js — Lógica principal e gerenciamento de estado
   ========================================================================= */

const App = (function () {

  // Estado global mínimo
  let estado = {
    ordens: [],              // todas as OS do store
    filtroAtivo: 'todos',    // qual filtro está ativo
    searchTerm: '',          // termo de pesquisa
    ordenaçao: 'data-desc',  // campo e direção de ordenação
    formularioAberto: false, // uma OS está sendo editada?
    osEmEdicao: null         // qual OS (null = novo)
  };

  // Seletor de fotos do formulário atual (recriado toda vez que o modal abre)
  let seletorFotosServico = null;

  // Recarrega as OS do store, aplica filtros e ordenação
  async function recarregar() {
    estado.ordens = await Store.obterTodos();
    renderizar();
  }

  // Filtra e ordena as OS conforme estado
  function ordemsFiltradas() {
    const filtro = Config.FILTROS.find(f => f.key === estado.filtroAtivo);
    let resultado = estado.ordens;

    // Aplica filtro
    if (filtro) resultado = resultado.filter(o => filtro.test(o));

    // Aplica busca (em vários campos)
    if (estado.searchTerm) {
      const termo = Utils.normalize(estado.searchTerm);
      resultado = resultado.filter(o => {
        const campos = [o.cliente, o.telefone, o.endereco, o.descricao, o.tipo, o.observacoes, o.status];
        return campos.some(c => Utils.normalize(c || '').indexOf(termo) !== -1);
      });
    }

    // Ordena
    const [campo, dir] = estado.ordenaçao.split('-');
    resultado.sort((a, b) => {
      let av = a[campo], bv = b[campo];

      // Casos especiais
      if (campo === 'prioridade') {
        av = Config.PRIORIDADE_PESO[av] || 0;
        bv = Config.PRIORIDADE_PESO[bv] || 0;
      } else if (campo === 'valor') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      } else if (campo === 'data') {
        av = new Date(a.dataSolicitacao).getTime();
        bv = new Date(b.dataSolicitacao).getTime();
      } else {
        av = String(av || '').toLowerCase();
        bv = String(bv || '').toLowerCase();
      }

      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === 'desc' ? -cmp : cmp;
    });

    return resultado;
  }

  // Renderiza a tela toda (resumo, filtros, tabela, etc.)
  async function renderizar() {
    const ordens = ordemsFiltradas();

    // Resumo no topo
    atualizarResumo(estado.ordens);

    // Mostrar/esconder tabela
    const tabela = document.getElementById('tabela-container');
    if (ordens.length === 0) {
      tabela.innerHTML = '<div class="no-data">Nenhum serviço encontrado</div>';
    } else {
      tabela.innerHTML = renderTabelaOrdens(ordens);
      attachTabelaEventos();
    }

    // Atualizar estado dos filtros
    document.querySelectorAll('[data-filtro]').forEach(el => {
      el.classList.toggle('ativo', el.dataset.filtro === estado.filtroAtivo);
    });

    // Atualizar campo de busca
    document.getElementById('search-input').value = estado.searchTerm;
  }

  // Atualiza o resumo com números (total, em orçamento, concluído, valor, etc.)
  function atualizarResumo(ordens) {
    const total = ordens.length;
    const novo = ordens.filter(o => o.status === 'Novo Atendimento' || o.status === 'Aguardando Contato').length;
    const orcamento = ordens.filter(o => o.status.indexOf('Orçamento') !== -1).length;
    const visita = ordens.filter(o => o.status === 'Aguardando Visita').length;
    const execucao = ordens.filter(o => o.status === 'Em Execução').length;
    const concluido = ordens.filter(o => o.status === 'Concluído').length;
    const cancelado = ordens.filter(o => o.status === 'Cancelado').length;

    const valorTotal = ordens.reduce((sum, o) => sum + (Number(o.valor) || 0), 0);
    const pago = ordens.filter(o => o.pago === true).reduce((sum, o) => sum + (Number(o.valor) || 0), 0);
    const aReceber = valorTotal - pago;
    const repasseMultiX = pago * 0.15;

    const html = `
      <div class="resumo-item"><strong>${total}</strong> Total</div>
      <div class="resumo-item"><strong>${novo}</strong> Novo</div>
      <div class="resumo-item"><strong>${orcamento}</strong> Orçamento</div>
      <div class="resumo-item"><strong>${visita}</strong> Visita</div>
      <div class="resumo-item"><strong>${execucao}</strong> Execução</div>
      <div class="resumo-item"><strong>${concluido}</strong> Concluído</div>
      <div class="resumo-item"><strong>${cancelado}</strong> Cancelado</div>
      <div class="resumo-item"><strong>${Utils.brl(valorTotal)}</strong> Faturado</div>
      <div class="resumo-item" style="color:#4caf50;"><strong>${Utils.brl(pago)}</strong> Recebido</div>
      <div class="resumo-item" style="color:#ff9800;"><strong>${Utils.brl(aReceber)}</strong> A receber</div>
      <div class="resumo-item" style="border-color: var(--ouro-escuro); background: rgba(212,168,67,0.05);">
        <strong style="color: var(--ouro-claro);">${Utils.brl(repasseMultiX)}</strong> repassa para multiX
      </div>
    `;
    document.getElementById('resumo').innerHTML = html;
  }

  // Monta o HTML da tabela
  function renderTabelaOrdens(ordens) {
    const linhas = ordens.map(o => {
      const corStatus = Config.STATUS_COR[o.status] || 'gray';
      const corPrioridade = Config.PRIORIDADE_COR[o.prioridade] || 'gray';
      const iconePago = o.pago ? '✓' : '✗';
      return `
        <tr data-id="${o.id}">
          <td class="cel-num">${o.id}</td>
          <td class="cel-cliente"><button class="link-btn" data-acao="editar" title="Editar serviço">${Utils.escapeHtml(o.cliente)}</button></td>
          <td class="cel-tel"><a href="tel:${Utils.onlyDigits(o.telefone)}" title="Ligar">${Utils.escapeHtml(o.telefone || '—')}</a></td>
          <td class="cel-end"><button class="link-btn" data-acao="mapa" title="Ver no mapa">${Utils.escapeHtml(o.endereco || '—')}</button></td>
          <td class="cel-tipo"><button class="link-btn" data-acao="editar" title="Editar serviço">${Utils.escapeHtml(o.tipo || '—')}</button></td>
          <td class="cel-status">
            <select class="quick-edit" data-campo="status" title="Alterar status">
              ${Config.STATUS_LIST.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <span class="status-badge cor-${corStatus}">${o.status}</span>
          </td>
          <td class="cel-prio">
            <select class="quick-edit" data-campo="prioridade" title="Alterar prioridade">
              ${Config.PRIORIDADES.map(p => `<option value="${p}" ${p === o.prioridade ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
            <span class="badge cor-${corPrioridade}">${o.prioridade}</span>
          </td>
          <td class="cel-valor">${Utils.brl(o.valor)}</td>
          <td class="cel-pago">
            <select class="quick-edit" data-campo="pago" title="Marcar pago/não pago">
              <option value="false" ${o.pago !== true ? 'selected' : ''}>Não</option>
              <option value="true" ${o.pago === true ? 'selected' : ''}>Sim</option>
            </select>
            <span>${iconePago}</span>
          </td>
          <td class="cel-recebido">${Utils.escapeHtml(o.recebidoPor || '—')}</td>
          <td class="cel-data" title="${Utils.escapeHtml(o.dataSolicitacao)}">${Utils.dateBR(o.dataSolicitacao)}</td>
          <td class="cel-acoes">
            <button class="btn-acao btn-duplicar" data-acao="duplicar" title="Duplicar">⊡</button>
            <button class="btn-acao btn-concluir" data-acao="concluir" title="Concluir">✓</button>
            <button class="btn-acao btn-deletar" data-acao="deletar" title="Deletar">✕</button>
          </td>
        </tr>
      `;
    }).join('');

    const thead = `
      <tr class="header">
        <th class="ordena" data-ordena="id">Nº</th>
        <th class="ordena" data-ordena="cliente">Cliente</th>
        <th>Telefone</th>
        <th>Endereço</th>
        <th>Serviço</th>
        <th class="ordena" data-ordena="status">Status</th>
        <th class="ordena" data-ordena="prioridade">Prioridade</th>
        <th class="ordena" data-ordena="valor">Valor</th>
        <th>Pago</th>
        <th>Recebido por</th>
        <th class="ordena" data-ordena="data">Data</th>
        <th>Ações</th>
      </tr>
    `;

    return `<table class="tabela"><thead>${thead}</thead><tbody>${linhas}</tbody></table>`;
  }

  // Anexa eventos da tabela (editar, deletar, etc.)
  function attachTabelaEventos() {
    // Ordenação
    document.querySelectorAll('th.ordena').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const campo = th.dataset.ordena;
        if (estado.ordenaçao === campo + '-asc') {
          estado.ordenaçao = campo + '-desc';
        } else {
          estado.ordenaçao = campo + '-asc';
        }
        renderizar();
      });
    });

    // Edição rápida (status, prioridade, pago)
    document.querySelectorAll('.quick-edit').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const tr = e.target.closest('tr');
        const id = Number(tr.dataset.id);
        const campo = e.target.dataset.campo;
        let valor = e.target.value;
        if (campo === 'pago') valor = valor === 'true';
        await Store.atualizar(id, { [campo]: valor });
        Utils.toast('Alterado');
        await recarregar();
      });
    });

    // Ações da tabela (editar, deletar, etc.)
    document.querySelectorAll('[data-acao]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tr = e.target.closest('tr');
        const id = Number(tr.dataset.id);
        const acao = e.target.dataset.acao;

        if (acao === 'editar') abrirFormulario(id);
        else if (acao === 'deletar') deletarComConfirmacao(id);
        else if (acao === 'duplicar') duplicarComConfirmacao(id);
        else if (acao === 'concluir') concluirServico(id);
        else if (acao === 'mapa') abrirMapa(id);
      });
    });
  }

  // Abre o formulário (novo ou edição)
  async function abrirFormulario(id = null) {
    if (id) {
      estado.osEmEdicao = await Store.obter(id);
    } else {
      estado.osEmEdicao = {
        cliente: '', telefone: '', endereco: '', tipo: '', descricao: '', observacoes: '',
        dataSolicitacao: Utils.today(), dataVisita: '', dataOrcamento: '', dataFinalizacao: '',
        status: Config.PADRAO.status, prioridade: Config.PADRAO.prioridade,
        valor: '', pago: false, formaPagamento: '', recebidoPor: '', fotos: []
      };
    }

    estado.formularioAberto = true;
    atualizarFormulario();
  }

  // Atualiza o HTML do formulário e o torna visível
  function atualizarFormulario() {
    const os = estado.osEmEdicao;
    const isNovo = !os.id;

    const html = `
      <div class="form-container">
        <div class="form-header">
          <h2>${isNovo ? 'Novo Serviço' : 'Editar Serviço #' + os.id}</h2>
          <button id="fechar-form" class="btn-fechar">✕</button>
        </div>

        <form id="form-servico">
          <fieldset>
            <legend>Dados do Cliente</legend>
            <input type="text" id="form-cliente" placeholder="Nome do cliente *" value="${Utils.escapeHtml(os.cliente)}" required>
            <input type="tel" id="form-telefone" placeholder="Telefone" value="${Utils.escapeHtml(os.telefone || '')}">
            <input type="text" id="form-endereco" placeholder="Endereço" value="${Utils.escapeHtml(os.endereco || '')}">
          </fieldset>

          <fieldset>
            <legend>Serviço</legend>
            <input type="text" id="form-tipo" placeholder="Tipo de serviço" value="${Utils.escapeHtml(os.tipo || '')}">
            <textarea id="form-descricao" placeholder="Descrição detalhada">${Utils.escapeHtml(os.descricao || '')}</textarea>
            <textarea id="form-observacoes" placeholder="Observações">${Utils.escapeHtml(os.observacoes || '')}</textarea>
          </fieldset>

          <fieldset>
            <legend>Datas</legend>
            <div class="campo-data">
              <label for="form-data-sol">📅 Solicitação</label>
              <input type="date" id="form-data-sol" value="${os.dataSolicitacao || ''}" autofocus>
            </div>
            <div class="campo-data">
              <label for="form-data-visita">📅 Visita</label>
              <input type="date" id="form-data-visita" value="${os.dataVisita || ''}">
            </div>
            <div class="campo-data">
              <label for="form-data-orcamento">📅 Orçamento</label>
              <input type="date" id="form-data-orcamento" value="${os.dataOrcamento || ''}">
            </div>
            <div class="campo-data">
              <label for="form-data-final">📅 Finalização</label>
              <input type="date" id="form-data-final" value="${os.dataFinalizacao || ''}">
            </div>
          </fieldset>

          <fieldset>
            <legend>Status e Prioridade</legend>
            <select id="form-status">
              ${Config.STATUS_LIST.map(s => `<option value="${s}" ${s === os.status ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
            <select id="form-prioridade">
              ${Config.PRIORIDADES.map(p => `<option value="${p}" ${p === os.prioridade ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </fieldset>

          <fieldset>
            <legend>Financeiro</legend>
            <input type="number" id="form-valor" placeholder="Valor" value="${os.valor || ''}" step="0.01">
            <select id="form-forma-pag">
              <option value="">Forma de pagamento</option>
              ${Config.FORMAS_PAGAMENTO.map(f => `<option value="${f}" ${f === os.formaPagamento ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
            <label><input type="checkbox" id="form-pago" ${os.pago ? 'checked' : ''}> Pago</label>
            <input type="text" id="form-recebido" placeholder="Recebido por" value="${Utils.escapeHtml(os.recebidoPor || '')}">
          </fieldset>

          <fieldset>
            <legend>Fotos</legend>
            <div id="preview-fotos-servico" class="preview-fotos"></div>
            <input type="file" id="form-servico-fotos" accept="image/*" capture="environment" multiple>
          </fieldset>

          <div class="form-botoes">
            <button type="submit" class="btn btn-salvar">Salvar</button>
            <button type="button" id="form-cancelar" class="btn btn-cancelar">Cancelar</button>
          </div>
        </form>
      </div>
    `;

    const modal = document.getElementById('form-modal');
    modal.innerHTML = html;
    modal.style.display = 'flex';

    seletorFotosServico = Utils.criarSeletorFotos(os.fotos, 'form-servico-fotos', 'preview-fotos-servico', Store, 'servicos-fotos');

    // Eventos do formulário
    document.getElementById('form-servico').addEventListener('submit', async (e) => {
      e.preventDefault();
      await salvarServico(e.target);
    });

    document.getElementById('fechar-form').addEventListener('click', fecharFormulario);
    document.getElementById('form-cancelar').addEventListener('click', fecharFormulario);
  }

  // Salva a OS (novo ou edição)
  async function salvarServico(form) {
    const cliente = document.getElementById('form-cliente').value.trim();
    if (!cliente) {
      Utils.toast('Nome do cliente é obrigatório');
      return;
    }

    const submitBtn = form ? form.querySelector('.btn-salvar') : null;

    const dados = {
      cliente,
      telefone: document.getElementById('form-telefone').value,
      endereco: document.getElementById('form-endereco').value,
      tipo: document.getElementById('form-tipo').value,
      descricao: document.getElementById('form-descricao').value,
      observacoes: document.getElementById('form-observacoes').value,
      dataSolicitacao: document.getElementById('form-data-sol').value,
      dataVisita: document.getElementById('form-data-visita').value,
      dataOrcamento: document.getElementById('form-data-orcamento').value,
      dataFinalizacao: document.getElementById('form-data-final').value,
      status: document.getElementById('form-status').value,
      prioridade: document.getElementById('form-prioridade').value,
      valor: parseFloat(document.getElementById('form-valor').value) || 0,
      formaPagamento: document.getElementById('form-forma-pag').value,
      pago: document.getElementById('form-pago').checked,
      recebidoPor: document.getElementById('form-recebido').value
    };

    try {
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando...'; }
      if (seletorFotosServico) {
        dados.fotos = await seletorFotosServico.fotosFinais();
      }

      if (estado.osEmEdicao.id) {
        await Store.atualizar(estado.osEmEdicao.id, dados);
        Utils.toast('Serviço atualizado');
      } else {
        await Store.inserir(dados);
        Utils.toast('Serviço criado');
      }
      fecharFormulario();
      await recarregar();
    } catch (e) {
      Utils.toast('Erro ao salvar: ' + e.message);
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar'; }
    }
  }

  // Fecha o formulário
  function fecharFormulario() {
    estado.formularioAberto = false;
    estado.osEmEdicao = null;
    document.getElementById('form-modal').style.display = 'none';
  }

  // Deleta com confirmação
  async function deletarComConfirmacao(id) {
    if (!confirm('Tem certeza que quer deletar este serviço?')) return;
    try {
      await Store.deletar(id);
      Utils.toast('Serviço deletado');
      await recarregar();
    } catch (e) {
      Utils.toast('Erro ao deletar');
    }
  }

  // Duplica com confirmação
  async function duplicarComConfirmacao(id) {
    if (!confirm('Duplicar este serviço?')) return;
    try {
      const nova = await Store.duplicar(id);
      Utils.toast('Serviço duplicado (#' + nova.id + ')');
      await recarregar();
    } catch (e) {
      Utils.toast('Erro ao duplicar');
    }
  }

  // Marca como concluído (abre formulário com status já em "Concluído")
  async function concluirServico(id) {
    const os = await Store.obter(id);
    if (!os) return;
    await Store.atualizar(id, { status: 'Concluído', dataFinalizacao: Utils.today() });
    Utils.toast('Serviço concluído');
    await recarregar();
  }

  // Abre Google Maps com o endereço
  async function abrirMapa(id) {
    const os = await Store.obter(id);
    if (!os || !os.endereco) {
      Utils.toast('Endereço não preenchido');
      return;
    }
    const url = 'https://maps.google.com/?q=' + encodeURIComponent(os.endereco);
    window.open(url, '_blank');
  }

  // Filtro por clique
  function ativarFiltro(chave) {
    estado.filtroAtivo = chave;
    estado.searchTerm = '';
    renderizar();
  }

  // Busca em tempo real
  function buscar(termo) {
    estado.searchTerm = termo;
    estado.filtroAtivo = 'todos';
    renderizar();
  }

  // Exporta para Excel (TSV que abre no Excel)
  function exportarExcel() {
    const ordens = ordemsFiltradas();
    const cols = ['ID', 'Cliente', 'Telefone', 'Endereço', 'Serviço', 'Status', 'Prioridade', 'Valor', 'Pago', 'Recebido por', 'Data Solicitação', 'Data Visita', 'Data Orçamento', 'Data Finalização'];
    const linhas = [cols.join('\t')];
    ordens.forEach(o => {
      linhas.push([
        o.id, o.cliente, o.telefone, o.endereco, o.tipo, o.status, o.prioridade,
        o.valor, o.pago ? 'Sim' : 'Não', o.recebidoPor, o.dataSolicitacao, o.dataVisita, o.dataOrcamento, o.dataFinalizacao
      ].join('\t'));
    });
    Utils.downloadFile('ordens_de_servico.txt', linhas.join('\n'), 'text/tab-separated-values');
    Utils.toast('Exportado');
  }

  // Imprime
  function imprimir() {
    const ordens = ordemsFiltradas();
    const linhas = ordens.map((o, i) => `${i + 1}. ${o.cliente} — ${o.status} — ${Utils.brl(o.valor)}`).join('\n');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ordens de Serviço</title></head><body style="font-family:Arial;"><h1>Ordens de Serviço</h1><pre>${Utils.escapeHtml(linhas)}</pre><script>window.print();</script></body></html>`;
    const janela = window.open('', '', 'width=800,height=600');
    janela.document.write(html);
  }

  // Inicializa a app
  async function init() {
    // Carrega as ordens do store com timeout (evita travamentos)
    try {
      const promiseCarregar = recarregar();
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao carregar dados')), 35000)
      );
      await Promise.race([promiseCarregar, timeout]);
    } catch (e) {
      console.error('Erro ao carregar dados inicialmente:', e.message);
      Utils.toast('Erro ao carregar: ' + e.message);
      estado.ordens = [];
      renderizar();
    }

    // Eventos dos filtros
    document.querySelectorAll('[data-filtro]').forEach(el => {
      el.addEventListener('click', () => ativarFiltro(el.dataset.filtro));
    });

    // Evento da busca
    document.getElementById('search-input').addEventListener('input', (e) => buscar(e.target.value));

    // Botão "Novo Serviço"
    document.getElementById('btn-novo').addEventListener('click', () => abrirFormulario());

    // Botões de ação
    document.getElementById('btn-exportar').addEventListener('click', exportarExcel);
    document.getElementById('btn-imprimir').addEventListener('click', imprimir);

    // O modal só fecha pelo botão "Cancelar", pelo "✕" ou ao salvar —
    // clicar fora não fecha, para evitar perda acidental de dados digitados.
  }

  return { init, ativarFiltro, buscar, recarregar, renderizar };
})();

// Inicia quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', App.init);
