# ⚡ Quick Start - Deploy em 5 Minutos

## 📋 Checklist Rápido

- [ ] Tem conta no GitHub? (Se não, crie em github.com)
- [ ] Tem conta no Render? (Se não, crie em render.com com GitHub)
- [ ] Tem a URL e chave do Supabase?

---

## 🚀 Passo 1: Preparar Git

```bash
cd "D:\Projetos IA\Geral\controle de serviços\sistema"
git init
git add .
git commit -m "Initial commit"
```

---

## 🚀 Passo 2: Subir para GitHub

### A) Criar repositório vazio em github.com/new

Clique [aqui](https://github.com/new):
- Nome: `controle-de-servicos`
- **Copie o URL do seu repositório** (type: HTTPS)

### B) Conectar e enviar

```bash
git remote add origin https://github.com/SEU_USER/controle-de-servicos.git
git branch -M main
git push -u origin main
```

✅ Pronto! Código está no GitHub.

---

## 🚀 Passo 3: Deploy no Render

1. Acesse [render.com](https://render.com)
2. Clique em **New +** → **Web Service**
3. **Connect a repository** → procure `controle-de-servicos` → Connect
4. Preencha:
   ```
   Name: controle-de-servicos
   Environment: Node
   Region: São Paulo
   Branch: main
   Build Command: npm install
   Start Command: npm start
   ```
5. Clique **Environment** e adicione:
   ```
   SUPABASE_URL=seu_url
   SUPABASE_ANON_KEY=sua_chave
   ```
6. Clique **Create Web Service**

⏳ Aguarde 2-3 minutos...

✅ **Seu app está ONLINE!** 🎉

Você receberá uma URL como:
```
https://controle-de-servicos-xxxxx.onrender.com
```

---

## 📝 Atualizar o App

Toda vez que quiser mudar algo:

```bash
# Faça as mudanças nos arquivos
# Depois:

git add .
git commit -m "Descrição da mudança"
git push
```

O Render detecta e atualiza automaticamente em 2-3 minutos! ✨

---

## 💡 Dicas

- **Local**: `http://localhost:3000` (rodar `node server.js`)
- **Production**: sua URL no Render
- **Logs**: Vê em Render → Logs
- **Variáveis**: Muda em Render → Environment

---

## ❓ Dúvidas?

Veja o arquivo `DEPLOY-RENDER.md` para mais detalhes.
