/* =========================================================================
   grid-import.js — Carga em massa por colagem (colar do Excel/PDF/WhatsApp)
   Componente genérico usado em 3 lugares: cronograma da obra (a partir de um
   orçamento), tarefas diárias, e revisão de fechamento de obra. Cada tela só
   passa a configuração de colunas e a função que grava no Supabase — o parser,
   o grid editável e a conferência pós-carga são os mesmos nos três casos.

   Uso:
     GridImport.abrir({
       titulo: 'Importar orçamento',
       colunas: [
         { chave: 'etapa', label: 'Etapa', obrigatorio: true,  tipo: 'texto' },
         { chave: 'valor', label: 'Valor', obrigatorio: false, tipo: 'moeda' },
         { chave: 'prazo', label: 'Prazo', obrigatorio: false, tipo: 'data'  }
       ],
       existentes: listaDeDescricoesJaGravadas, // opcional, p/ aviso de duplicata
       campoDuplicata: 'etapa',                 // qual coluna comparar
       sugestoes: { responsavel: ['Equipe 1', 'João Elétrica'] }, // datalist opcional
       aoConfirmar: async (linhas) => Store.inserirLote(linhas)   // grava e retorna as linhas gravadas
     });
   ========================================================================= */

const GridImport = (function () {

  let overlayAtual = null;

  // ===== PARSER DE TEXTO COLADO =====

  // Detecta o separador testando na ordem: tab > pipe > múltiplos espaços.
  // Trava no primeiro que aparecer de forma consistente em pelo menos 2 linhas.
  function detectarSeparador(linhas) {
    const candidatos = [
      { nome: 'tab', re: /\t/ },
      { nome: 'pipe', re: /\|/ },
      { nome: 'espacos', re: /\s{2,}/ }
    ];
    for (const cand of candidatos) {
      const ocorrencias = linhas.filter(l => cand.re.test(l)).length;
      if (ocorrencias >= 2 || (linhas.length === 1 && ocorrencias === 1)) return cand;
    }
    return null;
  }

  function dividirLinha(linha, separador) {
    if (!separador) return [linha.trim()];
    const re = separador.nome === 'espacos' ? /\s{2,}/ : separador.re;
    return linha.split(re).map(c => c.trim()).filter((c, i, arr) => !(c === '' && i === arr.length - 1));
  }

  // Converte texto de moeda em número. Aceita "1.500,00" (BR) e "1500.00" (solto).
  function parseMoeda(txt) {
    if (txt == null || txt === '') return { valor: null, ok: true };
    let s = String(txt).replace(/[Rr]\$/g, '').replace(/\s/g, '').trim();
    if (s === '') return { valor: null, ok: true };
    const ultimaVirgula = s.lastIndexOf(',');
    const ultimoPonto = s.lastIndexOf('.');
    if (ultimaVirgula > ultimoPonto) {
      // formato BR: ponto = milhar, vírgula = decimal
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (ultimoPonto > ultimaVirgula && s.indexOf(',') !== -1) {
      // formato solto com vírgula de milhar e ponto decimal
      s = s.replace(/,/g, '');
    }
    const n = Number(s);
    return isNaN(n) ? { valor: txt, ok: false } : { valor: n, ok: true };
  }

  // Converte texto de data em ISO (yyyy-mm-dd). Ano ausente = ano corrente,
  // sempre — sem heurística de "próximo ano", que só gera confusão.
  function parseData(txt) {
    if (txt == null || String(txt).trim() === '') return { valor: null, ok: true };
    const s = String(txt).trim();
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
    if (!m) return { valor: txt, ok: false };
    const dia = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10);
    let ano = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (ano < 100) ano += 2000;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return { valor: txt, ok: false };
    const p = n => String(n).padStart(2, '0');
    return { valor: `${ano}-${p(mes)}-${p(dia)}`, ok: true };
  }

  function converterCelula(txt, tipo) {
    const bruto = (txt || '').trim();
    if (tipo === 'moeda' || tipo === 'numero') {
      const r = parseMoeda(bruto);
      return { bruto, valor: r.valor, ok: r.ok };
    }
    if (tipo === 'data') {
      const r = parseData(bruto);
      return { bruto, valor: r.valor, ok: r.ok };
    }
    return { bruto, valor: bruto, ok: true };
  }

  // Texto colado inteiro -> matriz de células já convertidas por coluna
  function parseTexto(texto, colunas) {
    const linhasTexto = texto.replace(/\r\n/g, '\n').split('\n').filter(l => l.trim() !== '');
    if (linhasTexto.length === 0) return [];
    const separador = detectarSeparador(linhasTexto);
    return linhasTexto.map(linhaTxt => {
      const partes = dividirLinha(linhaTxt, separador);
      const linha = {};
      colunas.forEach((col, i) => {
        linha[col.chave] = converterCelula(partes[i] || '', col.tipo);
      });
      return linha;
    });
  }

  // ===== DUPLICATA (aviso, nunca bloqueia) =====

  function normalizar(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().trim();
  }

  function marcarDuplicatas(linhas, campoDuplicata, existentes) {
    if (!campoDuplicata || !existentes || existentes.length === 0) return linhas;
    const existentesNorm = existentes.map(normalizar);
    return linhas.map(linha => {
      const valorNorm = normalizar(linha[campoDuplicata] ? linha[campoDuplicata].bruto : '');
      linha.__possivelDuplicata = valorNorm !== '' && existentesNorm.includes(valorNorm);
      return linha;
    });
  }

  // ===== MONTAGEM DO MODAL =====

  function abrir(config) {
    const {
      titulo = 'Carga em massa',
      colunas,
      existentes = [],
      campoDuplicata = null,
      sugestoes = {},
      aoConfirmar
    } = config;

    fecharAtual();
    injetarEstilos();

    let linhas = colunas.map(() => Object.fromEntries(colunas.map(c => [c.chave, { bruto: '', valor: '', ok: true }])));
    // garante ao menos 3 linhas em branco para preenchimento manual inicial
    while (linhas.length < 3) linhas.push(Object.fromEntries(colunas.map(c => [c.chave, { bruto: '', valor: '', ok: true }])));

    const overlay = document.createElement('div');
    overlay.className = 'gi-overlay';
    overlay.innerHTML = `
      <div class="gi-modal">
        <div class="gi-head">
          <h3>${Utils.escapeHtml(titulo)}</h3>
          <button type="button" class="gi-x" data-gi-fechar>✕</button>
        </div>
        <p class="gi-dica">Cole um bloco copiado do Excel, PDF ou WhatsApp em qualquer célula, ou preencha manualmente. <kbd>Tab</kbd> anda para o lado, <kbd>Enter</kbd> desce de linha.</p>
        <div class="gi-tabela-wrap">
          <table class="gi-tabela">
            <thead><tr>
              ${colunas.map(c => `<th>${Utils.escapeHtml(c.label)}${c.obrigatorio ? ' <span class="gi-obrig">*</span>' : ''}</th>`).join('')}
              <th class="gi-col-acao"></th>
            </tr></thead>
            <tbody id="gi-corpo"></tbody>
          </table>
        </div>
        <div class="gi-rodape">
          <button type="button" class="gi-btn-add" data-gi-add>+ Linha</button>
          <span class="gi-contador" id="gi-contador"></span>
          <div class="gi-acoes">
            <button type="button" class="gi-btn gi-btn-cancelar" data-gi-fechar>Cancelar</button>
            <button type="button" class="gi-btn gi-btn-confirmar" id="gi-confirmar">Confirmar</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlayAtual = overlay;

    const corpo = overlay.querySelector('#gi-corpo');

    function renderLinhas() {
      linhas = marcarDuplicatas(linhas, campoDuplicata, existentes);
      corpo.innerHTML = linhas.map((linha, li) => `
        <tr data-li="${li}">
          ${colunas.map(col => {
            const celula = linha[col.chave];
            const invalida = !celula.ok;
            const vazia = celula.bruto === '' && col.obrigatorio;
            const classe = invalida || vazia ? 'gi-cel gi-cel-erro' : 'gi-cel';
            const listId = sugestoes[col.chave] ? `gi-list-${col.chave}` : '';
            return `<td class="${classe}" contenteditable="true" data-li="${li}" data-campo="${col.chave}" data-tipo="${col.tipo}" ${listId ? `list="${listId}"` : ''}>${Utils.escapeHtml(celula.bruto)}</td>`;
          }).join('')}
          <td class="gi-col-acao">
            ${linha.__possivelDuplicata ? '<span class="gi-tag-dup" title="Parece com um item já existente — pode ser repetição ou algo pendente">⚠</span>' : ''}
            <button type="button" class="gi-del" data-del="${li}" title="Remover linha">✕</button>
          </td>
        </tr>
      `).join('');
      atualizarContador();
    }

    function atualizarContador() {
      const total = linhas.filter(l => colunas.some(c => l[c.chave].bruto !== '')).length;
      const comErro = linhas.filter(l => colunas.some(c => (c.obrigatorio && l[c.chave].bruto === '') || !l[c.chave].ok)).length;
      const contadorEl = overlay.querySelector('#gi-contador');
      contadorEl.textContent = comErro > 0
        ? `${total} linha(s) preenchida(s) · ${comErro} com pendência`
        : `${total} linha(s) preenchida(s)`;
      overlay.querySelector('#gi-confirmar').disabled = totalInvalido();
    }

    function totalInvalido() {
      return linhas.some(l => colunas.some(c => (c.obrigatorio && l[c.chave].bruto === '') || (l[c.chave].bruto !== '' && !l[c.chave].ok)));
    }

    // datalists de sugestão (responsável etc.)
    Object.entries(sugestoes).forEach(([campo, valores]) => {
      const dl = document.createElement('datalist');
      dl.id = `gi-list-${campo}`;
      dl.innerHTML = [...new Set(valores.map(v => v))].map(v => `<option value="${Utils.escapeHtml(v)}">`).join('');
      overlay.appendChild(dl);
    });

    renderLinhas();

    // ---- colar em qualquer célula ----
    corpo.addEventListener('paste', (e) => {
      const alvo = e.target.closest('td.gi-cel');
      if (!alvo) return;
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      if (!texto) return;

      const liInicial = parseInt(alvo.dataset.li, 10);
      const colInicialIdx = colunas.findIndex(c => c.chave === alvo.dataset.campo);
      const parsed = parseTexto(texto, colunas.slice(colInicialIdx));

      parsed.forEach((linhaColada, offset) => {
        const li = liInicial + offset;
        while (li >= linhas.length) linhas.push(Object.fromEntries(colunas.map(c => [c.chave, { bruto: '', valor: '', ok: true }])));
        colunas.slice(colInicialIdx).forEach((col) => {
          if (linhaColada[col.chave] !== undefined) linhas[li][col.chave] = linhaColada[col.chave];
        });
      });
      renderLinhas();
    });

    // ---- edição manual célula a célula ----
    corpo.addEventListener('blur', (e) => {
      const td = e.target.closest('td.gi-cel');
      if (!td) return;
      const li = parseInt(td.dataset.li, 10);
      const campo = td.dataset.campo;
      const tipo = td.dataset.tipo;
      linhas[li][campo] = converterCelula(td.textContent, tipo);
      renderLinhas();
    }, true);

    corpo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    });

    corpo.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (!del) return;
      linhas.splice(parseInt(del.dataset.del, 10), 1);
      if (linhas.length === 0) linhas.push(Object.fromEntries(colunas.map(c => [c.chave, { bruto: '', valor: '', ok: true }])));
      renderLinhas();
    });

    overlay.querySelector('[data-gi-add]').addEventListener('click', () => {
      linhas.push(Object.fromEntries(colunas.map(c => [c.chave, { bruto: '', valor: '', ok: true }])));
      renderLinhas();
    });

    overlay.querySelectorAll('[data-gi-fechar]').forEach(btn => btn.addEventListener('click', fecharAtual));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) fecharAtual(); });

    overlay.querySelector('#gi-confirmar').addEventListener('click', async () => {
      const btn = overlay.querySelector('#gi-confirmar');
      const linhasValidas = linhas
        .filter(l => colunas.some(c => l[c.chave].bruto !== ''))
        .map(l => Object.fromEntries(colunas.map(c => [c.chave, l[c.chave].valor])));

      if (linhasValidas.length === 0) { Utils.toast('Nada para gravar.'); return; }

      btn.disabled = true;
      btn.textContent = 'Gravando...';
      try {
        const gravadas = await aoConfirmar(linhasValidas);
        mostrarConferencia(overlay, colunas, linhasValidas, gravadas || linhasValidas);
      } catch (err) {
        console.error('Erro ao gravar carga em massa:', err);
        Utils.toast('Erro ao gravar: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Confirmar';
      }
    });
  }

  // ===== CONFERÊNCIA PÓS-CARGA (origem colada × gravado no banco) =====

  function mostrarConferencia(overlay, colunas, enviadas, gravadas) {
    const modal = overlay.querySelector('.gi-modal');
    const linhasHtml = enviadas.map((enviada, i) => {
      const gravada = gravadas[i] || {};
      const divergente = colunas.some(c => String(enviada[c.chave] ?? '') !== String(gravada[c.chave] ?? ''));
      return `
        <tr class="${divergente ? 'gi-conf-diverge' : ''}">
          <td class="gi-conf-label">Colado</td>
          ${colunas.map(c => `<td>${Utils.escapeHtml(enviada[c.chave] ?? '—')}</td>`).join('')}
        </tr>
        <tr class="${divergente ? 'gi-conf-diverge' : ''}">
          <td class="gi-conf-label">Gravado</td>
          ${colunas.map(c => `<td>${Utils.escapeHtml(gravada[c.chave] ?? '—')}</td>`).join('')}
        </tr>
      `;
    }).join('');

    const totalDivergente = enviadas.filter((enviada, i) => {
      const gravada = gravadas[i] || {};
      return colunas.some(c => String(enviada[c.chave] ?? '') !== String(gravada[c.chave] ?? ''));
    }).length;

    modal.innerHTML = `
      <div class="gi-head">
        <h3>Conferência — ${enviadas.length} linha(s) gravada(s)</h3>
        <button type="button" class="gi-x" data-gi-fechar>✕</button>
      </div>
      <p class="gi-dica">
        ${totalDivergente > 0
          ? `<strong class="gi-alerta">${totalDivergente} linha(s) destacada(s) em vermelho</strong> — o que foi colado é diferente do que ficou gravado. Confira antes de fechar.`
          : 'Tudo bateu: o que foi colado é exatamente o que foi gravado no banco.'}
      </p>
      <div class="gi-tabela-wrap">
        <table class="gi-tabela gi-tabela-conf">
          <thead><tr><th></th>${colunas.map(c => `<th>${Utils.escapeHtml(c.label)}</th>`).join('')}</tr></thead>
          <tbody>${linhasHtml}</tbody>
        </table>
      </div>
      <div class="gi-rodape">
        <span></span>
        <div class="gi-acoes">
          <button type="button" class="gi-btn gi-btn-confirmar" data-gi-fechar>Fechar</button>
        </div>
      </div>
    `;
    modal.querySelectorAll('[data-gi-fechar]').forEach(btn => btn.addEventListener('click', fecharAtual));
    document.dispatchEvent(new CustomEvent('gridimport:concluido', { detail: { gravadas } }));
  }

  function fecharAtual() {
    if (overlayAtual) { overlayAtual.remove(); overlayAtual = null; }
  }

  // ===== ESTILO (auto-injetado uma única vez, usa as variáveis do tema) =====

  let estiloInjetado = false;
  function injetarEstilos() {
    if (estiloInjetado) return;
    estiloInjetado = true;
    const style = document.createElement('style');
    style.textContent = `
      .gi-overlay { position: fixed; inset: 0; background: rgba(5,7,10,0.72); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
      .gi-modal { background: var(--preto-card, #111318); border: 1px solid var(--preto-borda2, #2e3545); border-radius: 12px; width: min(880px, 100%); max-height: 88vh; display: flex; flex-direction: column; box-shadow: var(--sombra-lg, 0 8px 40px rgba(0,0,0,0.7)); }
      .gi-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--preto-borda, #252a35); }
      .gi-head h3 { margin: 0; font-size: 16px; color: var(--texto-primario, #e8eaf0); }
      .gi-x { background: none; border: none; color: var(--texto-secundario, #8a95a8); font-size: 16px; cursor: pointer; }
      .gi-dica { margin: 12px 22px; font-size: 12.5px; color: var(--texto-secundario, #8a95a8); }
      .gi-dica kbd { background: var(--preto-surface, #181c24); border: 1px solid var(--preto-borda2, #2e3545); border-radius: 3px; padding: 1px 5px; font-size: 11px; }
      .gi-alerta { color: #fca5a5; }
      .gi-tabela-wrap { overflow: auto; margin: 0 22px; border: 1px solid var(--preto-borda, #252a35); border-radius: 8px; }
      .gi-tabela { width: 100%; border-collapse: collapse; font-size: 13px; }
      .gi-tabela th { text-align: left; padding: 8px 10px; background: var(--preto-surface, #181c24); color: var(--texto-secundario, #8a95a8); font-weight: 600; position: sticky; top: 0; }
      .gi-obrig { color: var(--ouro, #d4a843); }
      .gi-tabela td { padding: 7px 10px; border-top: 1px solid var(--preto-borda, #252a35); color: var(--texto-primario, #e8eaf0); }
      .gi-cel { outline: none; cursor: text; min-width: 90px; }
      .gi-cel:focus { background: rgba(16,185,129,0.08); }
      .gi-cel-erro { background: rgba(239,68,68,0.1); box-shadow: inset 0 0 0 1px rgba(239,68,68,0.4); }
      .gi-col-acao { width: 54px; text-align: right; white-space: nowrap; }
      .gi-tag-dup { margin-right: 6px; cursor: help; }
      .gi-del { background: none; border: none; color: var(--texto-fraco, #505868); cursor: pointer; font-size: 12px; }
      .gi-del:hover { color: #fca5a5; }
      .gi-rodape { display: flex; align-items: center; justify-content: space-between; padding: 14px 22px; gap: 12px; }
      .gi-btn-add { background: none; border: 1px dashed var(--preto-borda2, #2e3545); color: var(--texto-secundario, #8a95a8); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12.5px; }
      .gi-btn-add:hover { border-color: var(--esmeralda, #10b981); color: var(--esmeralda-claro, #34d399); }
      .gi-contador { font-size: 12px; color: var(--texto-secundario, #8a95a8); }
      .gi-acoes { display: flex; gap: 10px; margin-left: auto; }
      .gi-btn { border: none; border-radius: 6px; padding: 8px 18px; font-size: 13px; cursor: pointer; }
      .gi-btn-cancelar { background: var(--preto-surface, #181c24); color: var(--texto-secundario, #8a95a8); }
      .gi-btn-confirmar { background: var(--grad-esmeralda, #10b981); color: #06120d; font-weight: 600; }
      .gi-btn-confirmar:disabled { opacity: 0.4; cursor: not-allowed; }
      .gi-tabela-conf .gi-conf-label { color: var(--texto-fraco, #505868); font-size: 11px; text-transform: uppercase; }
      .gi-tabela-conf tr.gi-conf-diverge td { background: rgba(239,68,68,0.12); }
    `;
    document.head.appendChild(style);
  }

  return { abrir, parseTexto, parseMoeda, parseData, normalizar };
})();
