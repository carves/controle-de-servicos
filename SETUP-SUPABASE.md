# 🚀 Setup Supabase - Controle de Serviços

## ✅ Passo a Passo para Configurar

### 1. Abra o Dashboard do Supabase
Acesse: https://supabase.com/dashboard/project/adrxvlkzcfevrrqxpqkc

### 2. Vá para SQL Editor
No menu lateral esquerdo, clique em **"SQL Editor"**

### 3. Crie uma Nova Query
- Clique em **"New Query"**
- Copie TODO o conteúdo do arquivo `criar-tabela-supabase.sql`
- Cole na janela de edição do Supabase

### 4. Execute a Query
- Clique no botão **"Run"** (ou Ctrl+Enter)
- Você verá uma mensagem de sucesso

### 5. Pronto! ✅
A tabela `ordens_de_servico` foi criada e está pronta para receber dados.

---

## 🔑 Chaves de API

Você já tem as chaves configuradas em `js/supabase-config.js`:

- **URL:** `https://adrxvlkzcfevrrqxpqkc.supabase.co`
- **Anon Key:** Já está salva no arquivo

### Se precisar atualizar as chaves:

1. Vá em **Settings → API**
2. Copie a **URL do projeto** e a **anon public key**
3. Atualize em `js/supabase-config.js`

---

## 📱 Usando o Sistema

Depois que a tabela estiver criada:

1. **Abra** `index.html` no navegador
2. **Crie um novo serviço** → será salvo no Supabase
3. **Outros usuários** verão os mesmos dados em tempo real
4. **Em qualquer dispositivo** com o link, os dados estão sincronizados

---

## 🔐 Segurança (Row Level Security)

O SQL já configurou que:
- ✅ Qualquer um pode **ler** os dados
- ✅ Qualquer um pode **criar** novos serviços
- ✅ Qualquer um pode **editar** serviços
- ✅ Qualquer um pode **deletar** serviços

Se quiser restringir depois, é só mudar as políticas no Supabase.

---

## ⚡ Em Tempo Real

O sistema está configurado para:
- Sincronizar dados entre abas do navegador
- Sincronizar entre dispositivos diferentes
- Mostrar mudanças em tempo real quando outros usuários editam

---

## 🆘 Se der erro:

### "Connection refused" ou "Network error"
- Verifique a URL do Supabase em `supabase-config.js`
- Certifique-se que o projeto está ativo (verde) no dashboard

### "Permission denied"
- As políticas de segurança não foram criadas
- Execute novamente o SQL completo

### "Tabela não encontrada"
- O SQL não foi executado
- Volte ao passo 3 e execute novamente

---

Pronto! Sistema com dados centralizados no Supabase! 🎉
