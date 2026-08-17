/* =========================================================================
   config.js — Configurações centrais do sistema
   Fonte única de verdade para status, prioridades, formas de pagamento,
   cores e filtros. Alterar aqui reflete em todo o sistema.
   ========================================================================= */

const Config = (function () {

  // Lista completa de status (na ordem em que aparecem na lista suspensa)
  const STATUS_LIST = [
    'Novo Atendimento',
    'Aguardando Contato',
    'Aguardando Visita',
    'Em Orçamento',
    'Orçamento Enviado',
    'Orçamento Aprovado',
    'Aguardando Material',
    'Agendado',
    'Em Execução',
    'Aguardando Cliente',
    'Concluído',
    'Cancelado'
  ];

  // Cor de cada status (o nome bate com uma classe CSS: .cor-blue, .cor-green, etc.)
  const STATUS_COR = {
    'Novo Atendimento':   'blue',
    'Aguardando Contato': 'cyan',
    'Aguardando Visita':  'yellow',
    'Em Orçamento':       'orange',
    'Orçamento Enviado':  'orange',
    'Orçamento Aprovado': 'teal',
    'Aguardando Material':'amber',
    'Agendado':           'cyan',
    'Em Execução':        'purple',
    'Aguardando Cliente': 'yellow',
    'Concluído':          'green',
    'Cancelado':          'red'
  };

  const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];

  const PRIORIDADE_COR = {
    'Baixa':   'gray',
    'Média':   'blue',
    'Alta':    'orange',
    'Urgente': 'red'
  };

  // Peso para ordenação por prioridade (maior = mais urgente)
  const PRIORIDADE_PESO = { 'Baixa': 1, 'Média': 2, 'Alta': 3, 'Urgente': 4 };

  const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência'];

  // Filtros rápidos. Cada um tem uma função "test" que decide se a OS aparece.
  const FILTROS = [
    { key: 'todos',     label: 'Todos',            test: () => true },
    { key: 'novo',      label: 'Novo',             test: s => s.status === 'Novo Atendimento' || s.status === 'Aguardando Contato' },
    { key: 'orcamento', label: 'Orçamento',        test: s => s.status.indexOf('Orçamento') !== -1 },
    { key: 'visita',    label: 'Aguardando visita',test: s => s.status === 'Aguardando Visita' },
    { key: 'execucao',  label: 'Em execução',      test: s => s.status === 'Em Execução' },
    { key: 'concluido', label: 'Concluído',        test: s => s.status === 'Concluído' },
    { key: 'cancelado', label: 'Cancelado',        test: s => s.status === 'Cancelado' },
    { key: 'pago',      label: 'Pago',             test: s => s.pago === true },
    { key: 'naopago',   label: 'Não pago',         test: s => s.pago !== true && s.status !== 'Cancelado' }
  ];

  // Valores padrão de uma nova OS (lançamento rápido: só o nome é obrigatório)
  const PADRAO = {
    status: 'Novo Atendimento',
    prioridade: 'Média',
    pago: false,
    formaPagamento: ''
  };

  return {
    STATUS_LIST, STATUS_COR,
    PRIORIDADES, PRIORIDADE_COR, PRIORIDADE_PESO,
    FORMAS_PAGAMENTO, FILTROS, PADRAO
  };
})();
