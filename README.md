# Accord Telemetry — Deploy Guide

## Stack
- **Next.js 14** (frontend + API routes)
- **Supabase** (banco de dados PostgreSQL, free tier)
- **Vercel** (hospedagem, free tier)
- **Chart.js** (gráficos)

---

## Passo 1 — Supabase (banco de dados)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita
2. Clique em **New Project** → escolha nome e região (South America - São Paulo)
3. Aguarde o projeto ser criado (~2 min)
4. Vá em **SQL Editor** → cole o conteúdo de `supabase_schema.sql` → clique **Run**
5. Vá em **Settings → API** e copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Passo 2 — GitHub

1. Crie um repositório novo em [github.com](https://github.com) (pode ser privado)
2. Faça upload desta pasta inteira para o repositório:
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git remote add origin https://github.com/SEU_USER/accord-telemetry.git
   git push -u origin main
   ```

---

## Passo 3 — Vercel (hospedagem)

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **Add New → Project**
3. Selecione o repositório `accord-telemetry`
4. Em **Environment Variables**, adicione:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   ```
5. Clique **Deploy** — em ~2 minutos o app estará online

---

## Como usar

- Acesse o link gerado pelo Vercel (ex: `accord-telemetry.vercel.app`)
- Arraste um ou mais CSVs do HondsH na área de upload (sidebar)
- O app extrai as métricas, salva no Supabase e atualiza todos os gráficos
- Na próxima vez que abrir, os logs já estarão lá (persistidos)

## Adicionar novos logs

Basta arrastar o novo CSV — o app detecta pelo nome do arquivo.  
Se o nome for igual a um log existente, ele atualiza. Se for novo, adiciona à linha do tempo.

## Desenvolvimento local

```bash
cp .env.example .env.local
# preencha com suas credenciais do Supabase

npm install
npm run dev
# acesse http://localhost:3000
```
