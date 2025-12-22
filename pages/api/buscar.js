export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(apiKey, model, messages) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });

  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {

    /* =====================================================
       🔹 CAMADA 1 — COLETA, LIMPEZA E TRIAGEM (gpt-5-nano)
    ===================================================== */
    const layer1 = await callOpenAI(apiKey, "gpt-5-nano", [
      {
        role: "system",
        content: `
Você coleta anúncios de "${produto}" na região de ${cidade}.
Normalize e limpe os dados.

Tarefas:
- Normalizar título
- Extrair preço, estado e localização
- Detectar duplicidade
- Classificar qualidade: bom | medio | suspeito

REGRAS:
- Retorne APENAS JSON puro
- Não use markdown
- Não escreva texto fora do JSON

Formato:
{
  "items": [
    {
      "title",
      "price",
      "location",
      "date",
      "link",
      "full_text",
      "quality"
    }
  ]
}
        `
      },
      {
        role: "user",
        content: `Colete anúncios de ${produto} em ${cidade} e região metropolitana.`
      }
    ]);

    if (layer1.error) {
      return res.status(500).json({ error: layer1.error.message });
    }

    const ra
