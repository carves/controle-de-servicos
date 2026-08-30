/* =========================================================================
   store-obras.js — Persistência de dados de obras via Supabase REST
   ========================================================================= */

const StoreObras = (function () {

  const HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };

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
        } catch (e) { }
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
  // Faz upload de um arquivo para o bucket informado e retorna a URL pública
  async function uploadFoto(arquivo, bucket = 'diario-fotos') {
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

  // Faz upload de múltiplos arquivos em paralelo, retorna array de URLs
  async function uploadFotos(arquivos, bucket = 'diario-fotos') {
    const promessas = Array.from(arquivos).map(arquivo => uploadFoto(arquivo, bucket));
    return Promise.all(promessas);
  }

  // ===== OBRAS =====
  async function obterObras() {
    const url = SUPABASE_URL + '/rest/v1/obras?select=*&order=id.desc';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados || [];
    } catch (e) {
      console.error('Erro ao obter obras:', e);
      Utils.toast('Erro ao carregar obras: ' + e.message);
      return [];
    }
  }

  async function obterObra(id) {
    const url = SUPABASE_URL + '/rest/v1/obras?id=eq.' + id + '&select=*';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados && dados[0] ? dados[0] : null;
    } catch (e) {
      console.error('Erro ao obter obra:', e);
      return null;
    }
  }

  // Busca uma obra pelo token público (usado no Portal do Cliente)
  async function obterObraPorToken(token) {
    const url = SUPABASE_URL + '/rest/v1/obras?token_portal=eq.' + encodeURIComponent(token) + '&select=*';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados && dados[0] ? dados[0] : null;
    } catch (e) {
      console.error('Erro ao obter obra por token:', e);
      return null;
    }
  }

  async function criarObra(dados) {
    const url = SUPABASE_URL + '/rest/v1/obras';
    const corpo = {
      nome: dados.nome,
      cliente: dados.cliente || '',
      arquiteto: dados.arquiteto || '',
      endereco: dados.endereco || '',
      descricao: dados.descricao || '',
      foto: dados.foto || '',
      status: dados.status || 'Planejamento',
      data_inicio: dados.data_inicio || null,
      data_prevista_fim: dados.data_prevista_fim || null,
      responsavel: dados.responsavel || '',
      criada: new Date().toISOString()
    };
    try {
      const resposta = await chamar(url, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(corpo)
      });
      return resposta[0];
    } catch (e) {
      console.error('Erro ao criar obra:', e);
      throw e;
    }
  }

  async function atualizarObra(id, dados) {
    const url = SUPABASE_URL + '/rest/v1/obras?id=eq.' + id;
    try {
      const resposta = await chamar(url, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      return resposta[0];
    } catch (e) {
      console.error('Erro ao atualizar obra:', e);
      throw e;
    }
  }

  async function deletarObra(id) {
    const url = SUPABASE_URL + '/rest/v1/obras?id=eq.' + id;
    try {
      await chamar(url, { method: 'DELETE', headers: HEADERS });
    } catch (e) {
      console.error('Erro ao deletar obra:', e);
      throw e;
    }
  }

  // ===== DIÁRIO DE BORDO =====
  async function obterDiario(obraId) {
    const url = SUPABASE_URL + '/rest/v1/diario_bordo?obra_id=eq.' + obraId + '&order=data.desc';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados || [];
    } catch (e) {
      console.error('Erro ao obter diário:', e);
      return [];
    }
  }

  async function adicionarAnotacao(obraId, dados) {
    const url = SUPABASE_URL + '/rest/v1/diario_bordo';
    const corpo = {
      obra_id: obraId,
      data: dados.data || new Date().toISOString().split('T')[0],
      autor: dados.autor || '',
      descricao: dados.descricao || '',
      clima: dados.clima || '',
      pessoal_presente: dados.pessoal_presente || '',
      fotos: dados.fotos || [],
      criada: new Date().toISOString()
    };
    try {
      const resposta = await chamar(url, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(corpo)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function atualizarAnotacao(id, dados) {
    const url = SUPABASE_URL + '/rest/v1/diario_bordo?id=eq.' + id;
    try {
      const resposta = await chamar(url, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function deletarAnotacao(id) {
    const url = SUPABASE_URL + '/rest/v1/diario_bordo?id=eq.' + id;
    try {
      await chamar(url, { method: 'DELETE', headers: HEADERS });
    } catch (e) {
      throw e;
    }
  }

  // ===== ATIVIDADES =====
  async function obterAtividades(obraId) {
    const url = SUPABASE_URL + '/rest/v1/atividades_obra?obra_id=eq.' + obraId + '&order=data_prevista.asc';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados || [];
    } catch (e) {
      return [];
    }
  }

  async function adicionarAtividade(obraId, dados) {
    const url = SUPABASE_URL + '/rest/v1/atividades_obra';
    const corpo = {
      obra_id: obraId,
      titulo: dados.titulo,
      descricao: dados.descricao || '',
      responsavel: dados.responsavel || '',
      data_prevista: dados.data_prevista || null,
      status: dados.status || 'Planejado',
      prioridade: dados.prioridade || 'Média',
      fotos: dados.fotos || []
    };
    try {
      const resposta = await chamar(url, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(corpo)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function atualizarAtividade(id, dados) {
    const url = SUPABASE_URL + '/rest/v1/atividades_obra?id=eq.' + id;
    try {
      const resposta = await chamar(url, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function deletarAtividade(id) {
    const url = SUPABASE_URL + '/rest/v1/atividades_obra?id=eq.' + id;
    try {
      await chamar(url, { method: 'DELETE', headers: HEADERS });
    } catch (e) {
      throw e;
    }
  }

  // ===== MATERIAIS =====
  async function obterMateriais(obraId) {
    const url = SUPABASE_URL + '/rest/v1/materiais_obra?obra_id=eq.' + obraId + '&order=data_entrega_prevista.asc';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados || [];
    } catch (e) {
      return [];
    }
  }

  async function adicionarMaterial(obraId, dados) {
    const url = SUPABASE_URL + '/rest/v1/materiais_obra';
    const corpo = {
      obra_id: obraId,
      descricao: dados.descricao,
      data_entrega_prevista: dados.data_entrega_prevista || null,
      precisa_comprar: !!dados.precisa_comprar,
      status: dados.status || 'Planejado',
      observacoes: dados.observacoes || '',
      fotos: dados.fotos || []
    };
    try {
      const resposta = await chamar(url, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(corpo)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function atualizarMaterial(id, dados) {
    const url = SUPABASE_URL + '/rest/v1/materiais_obra?id=eq.' + id;
    try {
      const resposta = await chamar(url, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function deletarMaterial(id) {
    const url = SUPABASE_URL + '/rest/v1/materiais_obra?id=eq.' + id;
    try {
      await chamar(url, { method: 'DELETE', headers: HEADERS });
    } catch (e) {
      throw e;
    }
  }

  // ===== CRONOGRAMA =====
  async function obterCronograma(obraId) {
    const url = SUPABASE_URL + '/rest/v1/cronograma_obra?obra_id=eq.' + obraId + '&order=data_inicio.asc';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados || [];
    } catch (e) {
      return [];
    }
  }

  async function adicionarEtapa(obraId, dados) {
    const url = SUPABASE_URL + '/rest/v1/cronograma_obra';
    const corpo = {
      obra_id: obraId,
      etapa: dados.etapa,
      descricao: dados.descricao || '',
      data_inicio: dados.data_inicio || null,
      data_fim_prevista: dados.data_fim_prevista || null,
      status: dados.status || 'Planejado',
      progresso: parseInt(dados.progresso) || 0
    };
    try {
      const resposta = await chamar(url, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(corpo)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function atualizarEtapa(id, dados) {
    const url = SUPABASE_URL + '/rest/v1/cronograma_obra?id=eq.' + id;
    try {
      const resposta = await chamar(url, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function deletarEtapa(id) {
    const url = SUPABASE_URL + '/rest/v1/cronograma_obra?id=eq.' + id;
    try {
      await chamar(url, { method: 'DELETE', headers: HEADERS });
    } catch (e) {
      throw e;
    }
  }

  // ===== REVISÃO FINAL (observações da arquiteta para correção) =====
  async function obterRevisao(obraId) {
    const url = SUPABASE_URL + '/rest/v1/revisao_obra?obra_id=eq.' + obraId + '&order=id.desc';
    try {
      const dados = await chamar(url, { headers: HEADERS });
      return dados || [];
    } catch (e) {
      return [];
    }
  }

  async function adicionarRevisao(obraId, dados) {
    const url = SUPABASE_URL + '/rest/v1/revisao_obra';
    const corpo = {
      obra_id: obraId,
      item: dados.item,
      observacao: dados.observacao || '',
      responsavel: dados.responsavel || '',
      status: dados.status || 'Pendente',
      fotos: dados.fotos || []
    };
    try {
      const resposta = await chamar(url, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(corpo)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function atualizarRevisao(id, dados) {
    const url = SUPABASE_URL + '/rest/v1/revisao_obra?id=eq.' + id;
    try {
      const resposta = await chamar(url, {
        method: 'PATCH',
        headers: { ...HEADERS, 'Prefer': 'return=representation' },
        body: JSON.stringify(dados)
      });
      return resposta[0];
    } catch (e) {
      throw e;
    }
  }

  async function deletarRevisao(id) {
    const url = SUPABASE_URL + '/rest/v1/revisao_obra?id=eq.' + id;
    try {
      await chamar(url, { method: 'DELETE', headers: HEADERS });
    } catch (e) {
      throw e;
    }
  }

  // ===== CARGA EM MASSA (usado pelo GridImport — grava várias linhas de uma vez) =====

  // Insere um array de registros numa tabela e devolve as linhas gravadas
  // (usado na conferência pós-carga: comparar o que foi colado com o que voltou do banco).
  async function inserirLote(tabela, registros) {
    if (!registros || registros.length === 0) return [];
    const url = SUPABASE_URL + '/rest/v1/' + tabela;
    return await chamar(url, {
      method: 'POST',
      headers: { ...HEADERS, 'Prefer': 'return=representation' },
      body: JSON.stringify(registros)
    });
  }

  // Cola um orçamento aprovado (descrição / unidade / quantidade / tempo de
  // execução / profissional / observações) e grava direto no cronograma da
  // obra. Sempre adiciona ao final — nunca substitui etapas existentes.
  async function importarEtapas(obraId, linhas) {
    const cronogramaAtual = await obterCronograma(obraId);
    let ordem = cronogramaAtual.length > 0
      ? Math.max(...cronogramaAtual.map(e => e.ordem || 0)) + 10
      : 10;
    const registros = linhas.map(l => {
      const reg = {
        obra_id: obraId,
        etapa: l.descricao,
        unidade: l.unidade || '',
        quantidade: l.quantidade,
        tempo_execucao: l.tempo_execucao || '',
        profissional: l.profissional || '',
        descricao: l.observacoes || '',
        status: 'Planejado',
        progresso: 0,
        ordem
      };
      ordem += 10;
      return reg;
    });
    return await inserirLote('cronograma_obra', registros);
  }

  // Cola a lista de tarefas do dia (descrição / responsável / data / status)
  // e grava direto em atividades_obra.
  async function importarAtividades(obraId, linhas) {
    const registros = linhas.map(l => ({
      obra_id: obraId,
      titulo: l.descricao,
      responsavel: l.responsavel || '',
      data_prevista: l.data || null,
      status: l.status || 'Planejado'
    }));
    return await inserirLote('atividades_obra', registros);
  }

  // Cola a lista de pendências da vistoria final da arquiteta
  // (descrição / ambiente / responsável) e grava em revisao_obra.
  async function importarRevisao(obraId, linhas) {
    const registros = linhas.map(l => ({
      obra_id: obraId,
      item: l.descricao,
      observacao: l.ambiente ? ('Ambiente: ' + l.ambiente) : '',
      responsavel: l.responsavel || '',
      status: 'Pendente'
    }));
    return await inserirLote('revisao_obra', registros);
  }

  return {
    uploadFoto, uploadFotos,
    obterObras, obterObra, obterObraPorToken, criarObra, atualizarObra, deletarObra,
    obterDiario, adicionarAnotacao, atualizarAnotacao, deletarAnotacao,
    obterAtividades, adicionarAtividade, atualizarAtividade, deletarAtividade,
    obterMateriais, adicionarMaterial, atualizarMaterial, deletarMaterial,
    obterCronograma, adicionarEtapa, atualizarEtapa, deletarEtapa,
    obterRevisao, adicionarRevisao, atualizarRevisao, deletarRevisao,
    inserirLote, importarEtapas, importarAtividades, importarRevisao
  };
})();
