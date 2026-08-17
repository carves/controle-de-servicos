# Sistema de Controle de Serviços

## 📁 Estrutura de Arquivos

```
controle de serviços/
├── index.html          → Página principal (abrir no navegador)
├── salvar.php          → API que salva/lê dados (PHP necessário no servidor)
├── dados.txt           → Arquivo com os serviços cadastrados (gerado automaticamente)
├── .htaccess           → Desativa listagem de diretório
├── css/
│   └── styles.css      → Estilos responsivos
└── js/
    ├── config.js       → Status, prioridades, cores, filtros
    ├── utils.js        → Funções utilitárias
    ├── store.js        → Camada de dados (conecta com salvar.php)
    └── app.js          → Lógica principal
```

## 💾 Armazenamento de Dados

Os dados são salvos em um arquivo **`dados.txt`** simples:
- **Formato:** JSON (um array de objetos)
- **Localização:** Raiz da pasta do sistema
- **Acesso:** Apenas quem tiver o link direto acessa
- **Sem segurança:** Qualquer pessoa pode ver/editar os dados (conforme solicitado)

### Fluxo de Dados:
1. **Usuário salva um serviço** → JavaScript envia para `salvar.php`
2. **salvar.php valida e escreve em `dados.txt`**
3. **Próxima vez que abre** → JavaScript lê `dados.txt` via `salvar.php`

## 🚀 Como Usar

### No seu servidor (precisa de PHP):

1. **Copie todos os arquivos** para uma pasta dentro da árvore do seu site:
   ```
   seu-site.com/
   └── controle-servicos/    ← pasta privada
       ├── index.html
       ├── salvar.php
       ├── dados.txt
       └── ... outros arquivos
   ```

2. **Acesse via link direto:**
   ```
   https://seu-site.com/controle-servicos/index.html
   ```

3. **Compartilhe o link** — qualquer um que tiver pode acessar

### Requisitos:
- ✅ PHP habilitado no servidor
- ✅ Permissão de escrita na pasta (chmod 755 ou 777)
- ✅ Navegador moderno (Chrome, Firefox, Safari, Edge)

## 📊 Formato dos Dados (dados.txt)

```json
[
  {
    "id": 1,
    "cliente": "João da Silva",
    "telefone": "(11) 98765-4321",
    "endereco": "Rua das Flores, 123",
    "tipo": "Encanamento",
    "descricao": "Reparo de vazamento",
    "observacoes": "",
    "dataSolicitacao": "2026-07-22",
    "dataVisita": "",
    "dataOrcamento": "",
    "dataFinalizacao": "",
    "status": "Em Execução",
    "prioridade": "Alta",
    "valor": 350,
    "formaPagamento": "PIX",
    "pago": false,
    "recebidoPor": "Carlos",
    "criada": "2026-07-22T21:15:40.433Z"
  }
]
```

## ⚙️ Configuração do Servidor

### Se o arquivo `dados.txt` ficar com permissão errada:

```bash
chmod 755 controle-servicos/
chmod 666 controle-servicos/dados.txt
```

Ou via cPanel/Hosting:
1. Clique direito na pasta → Permissões
2. Defina para `755`
3. Arquivo `dados.txt` → `666`

## 🔄 Migrando para Banco de Dados (depois)

Se precisar escalar no futuro, **apenas modifique `salvar.php`**:
- Não precisa alterar `store.js` nem `app.js`
- Já está pronto para conectar com MySQL, PostgreSQL, etc.

---

## 📱 Compatibilidade

✅ Desktop (Chrome, Firefox, Safari, Edge)
✅ Tablet (iPad, Android)
✅ Mobile (iPhone, Android)
✅ Responsivo em todas as resoluções

---

**Desenvolvido para ser simples, rápido e funcional.** 🚀
