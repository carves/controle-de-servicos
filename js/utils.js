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

  // Comprime uma imagem no navegador antes do upload (redimensiona e reduz qualidade).
  // Reduz o tamanho de fotos de celular (4-8MB) para poucas centenas de KB.
  function comprimirImagem(arquivo, maxDimensao = 1600, qualidade = 0.75) {
    return new Promise((resolve) => {
      if (!arquivo.type || !arquivo.type.startsWith('image/')) {
        resolve(arquivo);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(arquivo);

      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;

        if (width > maxDimensao || height > maxDimensao) {
          if (width > height) {
            height = Math.round(height * (maxDimensao / width));
            width = maxDimensao;
          } else {
            width = Math.round(width * (maxDimensao / height));
            height = maxDimensao;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) { resolve(arquivo); return; }
          const nomeComprimido = arquivo.name.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(new File([blob], nomeComprimido, { type: 'image/jpeg' }));
        }, 'image/jpeg', qualidade);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(arquivo); // se der erro, segue com o arquivo original
      };

      img.src = url;
    });
  }

  // ===== GALERIA DE FOTOS (compartilhado por Serviços e Obras) =====

  // Abre uma foto em tamanho grande (lightbox)
  function abrirLightbox(url) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${escapeHtml(url)}" alt="Foto ampliada">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  // Monta o HTML de uma galeria de miniaturas clicáveis
  function htmlGaleriaFotos(fotos) {
    if (!fotos || fotos.length === 0) return '';
    return `
      <div class="diario-fotos">
        ${fotos.map(url => `<img src="${escapeHtml(url)}" alt="Foto" class="diario-foto-thumb" data-url="${escapeHtml(url)}">`).join('')}
      </div>
    `;
  }

  // Anexa o clique de lightbox às miniaturas dentro de um container já renderizado
  function ativarGaleriaFotos(container) {
    container.querySelectorAll('.diario-foto-thumb').forEach(img => {
      img.addEventListener('click', () => abrirLightbox(img.dataset.url));
    });
  }

  // Cria um seletor de fotos reutilizável (preview + upload + remoção) dentro
  // de um formulário. Permite escolher fotos em vários lotes (abre o seletor
  // de arquivos quantas vezes quiser, sempre somando ao que já foi escolhido
  // — nada se perde e não precisa salvar entre uma seleção e outra).
  // Chame fotosFinais() no submit para obter a lista de URLs final (fotos
  // antigas mantidas + novas já comprimidas e enviadas).
  // `storeModule` precisa ter uploadFotos(arquivos, bucket).
  function criarSeletorFotos(fotosIniciais, idInput, idPreview, storeModule, bucket = 'diario-fotos') {
    let fotosExistentes = [...(fotosIniciais || [])];
    let arquivosNovos = []; // acumula File objects de todas as seleções feitas
    const input = document.getElementById(idInput);
    const preview = document.getElementById(idPreview);

    function render() {
      const existentesHtml = fotosExistentes.map((url, i) => `
        <div class="preview-foto-item">
          <img src="${escapeHtml(url)}" alt="Foto">
          <button type="button" class="remover-foto" data-tipo="existente" data-idx="${i}">✕</button>
        </div>
      `).join('');

      const novasHtml = arquivosNovos.map((arquivo, i) => `
        <div class="preview-foto-item preview-foto-nova">
          <img src="${URL.createObjectURL(arquivo)}" alt="Nova foto">
          <span class="preview-foto-badge">novo</span>
          <button type="button" class="remover-foto" data-tipo="novo" data-idx="${i}">✕</button>
        </div>
      `).join('');

      preview.innerHTML = existentesHtml + novasHtml;

      preview.querySelectorAll('.remover-foto').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          if (btn.dataset.tipo === 'existente') fotosExistentes.splice(idx, 1);
          else arquivosNovos.splice(idx, 1);
          render();
        });
      });
    }

    render();

    // Cada seleção SOMA ao que já estava escolhido, em vez de substituir —
    // assim dá pra abrir o seletor várias vezes (câmera, depois galeria, etc.)
    input.addEventListener('change', () => {
      arquivosNovos = arquivosNovos.concat(Array.from(input.files || []));
      input.value = ''; // limpa para permitir escolher os mesmos arquivos de novo se precisar
      render();
    });

    return {
      async fotosFinais() {
        let urlsNovas = [];
        if (arquivosNovos.length > 0) {
          const comprimidos = await Promise.all(arquivosNovos.map(a => comprimirImagem(a)));
          urlsNovas = await storeModule.uploadFotos(comprimidos, bucket);
        }
        return [...fotosExistentes, ...urlsNovas];
      }
    };
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

  return {
    brl, dateBR, today, escapeHtml, normalize, onlyDigits, waNumber, copy, downloadFile,
    comprimirImagem, abrirLightbox, htmlGaleriaFotos, ativarGaleriaFotos, criarSeletorFotos,
    toast
  };
})();
