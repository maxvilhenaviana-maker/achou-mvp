# achou-mvp

MVP do achou.net.br — Next.js + endpoint que chama Google Gemini.

## Setup local
1. Clone o repositório.
2. Copie `.env.local` com a variável:
   GEMINI_KEY=SEU_KEY_AQUI
3. `npm install`
4. `npm run dev`
5. Abra http://localhost:3000

## Deploy (Vercel)
1. Suba o repo no GitHub.
2. Em Vercel → New Project → importe o repo.
3. Em Settings → Environment Variables:
   - GEMINI_KEY = sua chave do Google Gemini
4. Deploy.
5. Acesse a URL do projeto.

Observações:
- Ajuste o endpoint do Gemini em `pages/api/buscar.js` caso sua conta use OAuth ou outro endpoint.
- Teste localmente antes de publicar.
