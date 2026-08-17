/* =========================================================================
   utils.js — Funções utilitárias (formatação, texto, arquivos, avisos)
   ========================================================================= */

const Utils = (function () {

  // Formata número como moeda brasileira: 1234.5 -> "R$ 1.234,50"
  function brl(v) {
    return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Converte data ISO (yyyy-mm-dd) para pt-BR (dd/mm/aaaa)
  function dateBR(iso) {
    if (!iso) return '—';
    const p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // Data de hoje em formato ISO (yyyy-mm-dd)
  function today() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // Escapa HTML para injetar texto do usuário com segurança
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Remove acentos e deixa minúsculo (para busca "sem acento")
  function normalize(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Mantém apenas os dígitos de um texto
  function onlyDigits(s) {
    return String(s == null ? '' : s).replace(/\D/g, '');
  }

  // Monta o número no padrão internacional para o WhatsApp (adiciona 55 se faltar)
  function waNumber(phone) {
    let d = onlyDigits(phone);
    if (!d) return '';
    if (d.length <= 11 && d.indexOf('55') !== 0) d = '55' + d;
    return d;
  }

  // Copia texto para a área de transferência
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback para navegadores/contextos sem clipboard API
      try {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        return true;
      } catch (e2) { return false; }
    }
  }

  // Gera download de um arquivo no navegador
  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type: type || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Aviso rápido no canto da tela (toast)
  let toastTimer = null;
  function toast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  return { brl, dateBR, today, escapeHtml, normalize, onlyDigits, waNumber, copy, downloadFile, toast };
})();
