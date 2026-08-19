/* =========================================================================
   store.js — Camada de persistência (Supabase via REST, sem dependências)
   Fala direto com a API REST do Supabase usando fetch(). Não depende de
   nenhuma biblioteca externa/CDN — evita bloqueios de firewall/adblock.
   ========================================================================= */

const Store = (function () {

  const REST_URL = SUPABASE_URL + '/rest/v1/ordens_de_servico';
  const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

  // A tabela foi criada com colunas em minúsculas (Postgres dobra
  // identificadores não citados). Mapeia nomes JS (camelCase) <-> DB.
  const MAPA_CAMPOS_DATA = ['dataSolicitacao', 'dataVisita', 'dataOrcamento', 'dataFinalizacao'];
  const MAPA = {
    dataSolicitacao: 'datasolicitacao',
    dataVisita: 'datavisita',
    dataOrcamento: 'dataorcamento',
    dataFinalizacao: 'datafinalizacao',
    formaPagamento: 'formapagamento',
    recebidoPor: 'recebidopor'
  };
  const MAPA_INVERSO = Object.fromEntries(Object.entries(MAPA).map(([k, v]) => [v, k]));

  // Converte um objeto do formato JS (camelCase) para o formato do banco
  function paraDb(obj) {
    const out = {};
    for (const [chave, valor] of Object.entries(obj)) {
      const chaveDb = MAPA[chave] || chave;
      // Datas vazias precisam virar null (Postgres rejeita '' em coluna DATE)
      out[chaveDb] = (MAPA_CAMPOS_DATA.includes(chave) && valor === '') ? null : valor;
    }
    return out;
  }

  // Converte um registro do banco para o formato JS (camelCase)
  function paraJs(obj) {
    const out = {};
    for (const [chave, valor] of Object.entries(obj)) {
      const chaveJs = MAPA_INVERSO[chave] || chave;
      out[chaveJs] = valor === null ? '' : valor;
    }
    return out;
  }

  // Faz a chamada HTTP com timeout (30s) e trata erros
  async function chamar(url, opcoes) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const resp = await fetch(url, { ...opcoes, signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) {
        let msg = 'Erro ' + resp.status;
        try {
          const erro = await resp.json();
          msg = erro.message || erro.hint || msg;
        } catch (e) { /* corpo sem JSON */ }
        throw new Error(msg);
      }
      const texto = await resp.text();
      return texto ? JSON.parse(texto) : null;
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
  }

  // ===== UPLOAD DE FOTOS =====
  async function uploadFoto(arquivo, bucket = 'servicos-fotos') {
    const extensao = arquivo.name.split('.').pop();
    const nomeArquivo = `${Date.now()}_${Math.random().toString(36).slice(2)}.${extensao}`;
    const url = SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + nomeArquivo;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Content-Type': arquivo.type
      },
      body: arquivo
    });

    if (!resp.ok) {
      const erro = await resp.text();
      throw new Error('Falha no upload: ' + erro);
    }

    return SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + nomeArquivo;
  }

  async function uploadFotos(arquivos, bucket = 'servicos-fotos') {
    const promessas = Array.from(arquivos).map(arquivo => uploadFoto(arquivo, bucket));
    return Promise.all(promessas);
  }

  // Retorna todas as OS armazenadas
  async function obterTodos() {
    try {
      const dados = await chamar(REST_URL + '?select=*&order=id.asc', { headers: HEADERS });
      return (dados || []).map(paraJs);
    } catch (e) {
      console.error('Erro ao ler dados do Supabase:', e);
      Utils.toast('Erro ao carregar dados: ' + e.message);
      return [];
    }
  }

  // Retorna uma OS pelo ID
  async function obter(id) {
    try {
      const dados = await chamar(REST_URL + '?select=*&id=eq.' + id, { headers: HEADERS });
      return dados && dados[0] ? paraJs(dados[0]) : null;
    } catch (e) {
      console.error('Erro ao obter OS:', e);
      return null;
    }
  }

  // Insere uma nova OS (o ID é gerado automaticamente pelo banco)
  async function inserir(dados) {
    const corpo = paraDb({ ...dados, criada: new Date().toISOString() });
    const resposta = await chamar(REST_URL, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(corpo)
    });
    return paraJs(resposta[0]);
  }

  // Atualiza uma OS existente
  async function atualizar(id, dados) {
    const corpo = paraDb(dados);
    const resposta = await chamar(REST_URL + '?id=eq.' + id, {
      method: 'PATCH',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(corpo)
    });
    return paraJs(resposta[0]);
  }

  // Deleta uma OS
  async function deletar(id) {
    await chamar(REST_URL + '?id=eq.' + id, {
      method: 'DELETE',
      headers: HEADERS
    });
  }

  // Cria uma cópia de uma OS existente (remove id e criada para não conflitar)
  async function duplicar(id) {
    const orig = await obter(id);
    if (!orig) throw new Error('OS não encontrada: ' + id);
    const dados = { ...orig };
    delete dados.id;
    delete dados.criada;
    delete dados.atualizada;
    return await inserir(dados);
  }

  return { uploadFoto, uploadFotos, obterTodos, obter, inserir, atualizar, deletar, duplicar };
})();
