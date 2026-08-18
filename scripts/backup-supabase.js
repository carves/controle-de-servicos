#!/usr/bin/env node
/* =========================================================================
   backup-supabase.js — Baixa uma cópia de todos os dados do Supabase e
   salva em backups/<data>/ dentro do próprio repositório Git.

   Roda automaticamente todo dia via GitHub Actions (.github/workflows/backup.yml).
   Pode também rodar manualmente: node scripts/backup-supabase.js

   Usa a mesma chave pública (anon) que já fica exposta no navegador em
   js/supabase-config.js — não é segredo, só permite leitura/escrita
   conforme as políticas RLS configuradas no Supabase.
   ========================================================================= */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://adrxvlkzcfevrrqxpqkc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_RmyFLPP85ZLWP_nAbRB4qw_8xRLmP9-';

const TABELAS = [
  'ordens_de_servico',
  'obras',
  'diario_bordo',
  'atividades_obra',
  'materiais_obra',
  'cronograma_obra'
];

async function buscarTabela(nome) {
  const url = `${SUPABASE_URL}/rest/v1/${nome}?select=*`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  if (!resp.ok) {
    throw new Error(`Falha ao buscar ${nome}: HTTP ${resp.status}`);
  }
  return resp.json();
}

async function main() {
  const hoje = new Date().toISOString().split('T')[0];
  const pastaBackup = path.join(__dirname, '..', 'backups', hoje);
  fs.mkdirSync(pastaBackup, { recursive: true });

  for (const tabela of TABELAS) {
    console.log(`Baixando ${tabela}...`);
    const dados = await buscarTabela(tabela);
    fs.writeFileSync(
      path.join(pastaBackup, `${tabela}.json`),
      JSON.stringify(dados, null, 2)
    );
    console.log(`  -> ${dados.length} registro(s) salvos`);
  }

  console.log(`Backup concluído em backups/${hoje}/`);
}

main().catch((e) => {
  console.error('Erro no backup:', e.message);
  process.exit(1);
});
