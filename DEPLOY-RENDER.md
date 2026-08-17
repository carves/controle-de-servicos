# 🚀 Deploy no Render

## Pré-requisitos

- Conta no [GitHub](https://github.com) (grátis)
- Conta no [Render](https://render.com) (grátis)
- Os arquivos do projeto prontos

---

## Passo 1: Criar Repositório no GitHub

### 1.1 - Inicialize Git localmente

```bash
cd "D:\Projetos IA\Geral\controle de serviços\sistema"
git init
git add .
git commit -m "Initial commit: Sistema de Controle de Serviços"
```

### 1.2 - Crie um repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Preencha:
   - **Repository name**: `controle-de-servicos`
   - **Description**: "Sistema de controle de ordens de serviço"
   - **Public** ou **Private** (sua escolha)
   - **NÃO inicialize com README** (você já tem)
3. Clique **Create repository**

### 1.3 - Suba o código

Na pasta do projeto, execute:

```bash
git remote add origin https://github.com/SEU_USUARIO/controle-de-servicos.git
git branch -M main
git push -u origin main
```

✅ Seu código agora está no GitHub!

---

## Passo 2: Deploy no Render

### 2.1 - Conecte o GitHub ao Render

1. Acesse [render.com](https://render.com)
2. Clique em **Sign Up** com GitHub
3. Autorize o Render a acessar seu GitHub
4. Pronto! ✅

### 2.2 - Crie um novo Web Service

1. No dashboard do Render, clique **New +**
2. Selecione **Web Service**
3. Conecte seu repositório:
   - Clique **Connect a repository**
   - Procure por `controle-de-servicos`
   - Clique **Connect**

### 2.3 - Configure o serviço

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Name** | `controle-de-servicos` |
| **Environment** | `Node` |
| **Region** | `São Paulo (South America)` |
| **Branch** | `main` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### 2.4 - Adicione variáveis de ambiente

Clique em **Environment** e adicione:

```
SUPABASE_URL=seu_url_aqui
SUPABASE_ANON_KEY=sua_chave_aqui
PORT=3000
```

(Copie os valores do seu Supabase)

### 2.5 - Deploy!

Clique **Create Web Service** e aguarde:

```
Building...
Deploying...
✅ Live!
```

---

## Passo 3: Seu App está Online! 🎉

Você receberá uma URL assim:

```
https://controle-de-servicos-xxxxx.onrender.com
```

**Acesse no navegador e pronto!** O app está rodando na nuvem! 🚀

---

## 📝 Atualizar o App

Toda vez que você faz mudanças:

1. Salva os arquivos
2. No seu computador:
   ```bash
   git add .
   git commit -m "Descrição da mudança"
   git push
   ```

3. O Render **detecta automaticamente** e faz redeploy em 2-3 minutos
4. Seu app atualiza sem você fazer nada! ✨

---

## 🔒 Segurança

- ✅ HTTPS automático
- ✅ Dados do Supabase criptografados
- ✅ `.env` não está no GitHub (.gitignore)
- ✅ Chaves guardadas apenas no Render

---

## ⚡ Performance

O Render:
- Inicia seu app automaticamente após deploy
- Reinicia se cair
- Escala automaticamente
- CDN global para servir os arquivos

---

## 💰 Custo

**GRATUITO** (tier free do Render):
- 750 horas/mês (suficiente para 1 app 24/7)
- Banda ilimitada
- SSL/HTTPS incluído

Se precisar de mais, é só $7/mês (Web Service Pro).

---

## 🐛 Solução de Problemas

### "Build Failed" no Render

Verifique:
1. `package.json` existe?
2. `server.js` está correto?
3. Não há erros em `git push`?

Execute localmente:
```bash
npm install
npm start
```

Deve abrir em `http://localhost:3000`

### App cai após deploy

Verifique as variáveis de ambiente no Render:
- `SUPABASE_URL` está correto?
- `SUPABASE_ANON_KEY` está correto?

Veja os logs no Render:
1. Abra seu Web Service
2. Clique em **Logs**
3. Procure por erros

### Arquivos estáticos não carregam

Verifique:
- CSS está em `css/styles.css`?
- JS está em `js/app.js`?
- `server.js` serve os arquivos corretamente?

---

## 📚 Próximas Melhorias

Depois de rodar no Render, você pode:

1. **Automações na nuvem** — mover scripts para Render Cron
2. **Domain customizado** — `seu-dominio.com` em vez de `.onrender.com`
3. **Database no Render** — usar PostgreSQL do Render em vez de Supabase
4. **Monitoring** — alertas se o app cair

---

## 🎯 Checklist Final

- [ ] Repositório criado no GitHub
- [ ] Código fazido commit (`git push`)
- [ ] Conta Render ativa
- [ ] Web Service criado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy bem-sucedido
- [ ] App acessível na URL pública
- [ ] Dados carregando do Supabase

Tudo pronto? **Parabéns!** 🎉 Seu app está na nuvem!
