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

IMPORTANTE:
Classifique como "suspeito" APENAS se houver:
- menção explícita a defeito
- preço extremamente fora do mercado
- pedido de sinal, PIX antecipado ou contato externo

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

    const raw1 = layer1.choices[0].message.content;
    const match1 = raw1.match(/\{[\s\S]*\}/);

    if (!match1) {
      console.error("Camada 1 sem JSON:", raw1);
      return res.status(500).json({ error: "Falha na camada 1" });
    }

    const parsedLayer1 = JSON.parse(match1[0]);

    // 🔧 ALTERAÇÃO CRÍTICA: aceitar "bom" e "medio"
    const cleanItems = (parsedLayer1.items || []).filter(
      item => item.quality === "bom" || item.quality === "medio"
    );

    console.log("Camada 1 - total:", parsedLayer1.items?.length || 0);
    console.log("Camada 1 - bom/medio:", cleanItems.length);

    if (cleanItems.length === 0) {
      return res.status(200).json({ items: [], precoMedio: 0 });
    }

    /* =====================================================
       🔹 CAMADA 2 — PREÇO MÉDIO REGIONAL (gpt-5-mini)
    ===================================================== */
    const layer2 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content: `
Calcule o preço médio regional ponderado.
Ignore outliers extremos.

REGRAS:
- Retorne APENAS JSON puro
- Não use markdown

Formato:
{ "market_average": number }
        `
      },
      {
        role: "user",
        content: JSON.stringify(cleanItems)
      }
    ]);

    if (layer2.error) {
      return res.status(500).json({ error: layer2.error.message });
    }

    const raw2 = laye
