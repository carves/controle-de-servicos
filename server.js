/* =========================================================================
   server.js — Servidor Node.js simples para servir a aplicação
   Roda na porta 3000 (ou a definida em PORT env var)
   ========================================================================= */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Tipos de arquivo e suas MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Parse da URL
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Remove a barra inicial se existir
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  // Constrói o caminho do arquivo
  const filePath = path.join(__dirname, pathname);

  // Lê o arquivo
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Se arquivo não existe, retorna 404
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - Não Encontrado</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>404 - Arquivo não encontrado</h1>
          <p>Procurei por: ${pathname}</p>
          <a href="/">← Voltar para Home</a>
        </body>
        </html>
      `);
      return;
    }

    // Obtém a extensão do arquivo
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Envia o arquivo
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║  📋 Controle de Serviços              ║
  ╚═══════════════════════════════════════╝

  🚀 Servidor rodando em: http://localhost:${PORT}
  📂 Arquivos: ${__dirname}

  Pressione Ctrl+C para parar.
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso!`);
  } else {
    console.error('❌ Erro no servidor:', err);
  }
  process.exit(1);
});
