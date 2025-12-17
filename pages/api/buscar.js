// pages/api/buscar.js
export const config = {
  api: { bodyParser: true },
  runtime: "nodejs",
};

const OPENAI_BASE = "https://api.openai.com/v1/responses";

async function callOpenAI(body, apiKey) {
  const resp = await fetch(OPENAI_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { rawText: text };
  }

  return {
    ok: resp.ok,
    status: resp.status,
    body: parsed,
    raw: text,
  };
}

function normalizeItems(rawItems) {
  const itemsWithPrice = rawItems
    .map((it) => {
      const priceStr =
        it.price !== undefined && it.price !== null ? String(it.price) : "";
      const priceNum =
        parseFloat(priceStr.replace(/[^\d]/g, "")) || null;

      return {
        title: it.title || "Sem título",
        price: priceStr,
        price_num: priceNum,
        location: it.location || "",
        date: it.date || "",
        analysis: it.analysis || "",
        link: it.link || "#",
        img: "/placeholder-120x90.png",
      };
    })
    .filter((it) => it.price_num !== null);

  if (itemsWithPrice.length === 0) return [];

  const prices = itemsWithPrice.map((it) => it.price_num);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice =
    prices.reduce((a, b) => a + b, 0) / prices.length;

  return itemsWithPrice.map((it) => ({
    ...it,
    analysis: `${it.analysis} (Menor: R$ ${minPrice}, Médio: R$ ${avgPrice.toFixed(
      2
    )}, Maior: R$ ${maxPrice})`,
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY não configurada" });
  }

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) {
    return res
      .status(400)
      .json({ error: "Produto e cidade são obrigatórios" });
  }

  try {
    const requestBody = {
      model: "gpt-4.1-turbo",
      temperature: 0,
      max_output_tokens: 1200,
      tools: [{ type: "web_search" }],
      input: [
        {
          role: "system",
          content:
            "Você é um assistente que busca anúncios reais e recentes na web brasileira.",
        },
        {
          role: "user",
          content: `
Busque anúncios recentes de "${produto}" em "${cidade}".

Critérios:
- anúncios reais (OLX, Mercado Livre, Desapega, Facebook Marketplace)
- sem defeitos aparentes
- preço abaixo ou próximo do mercado
- publicados recentemente
- priorize região central

Retorne APENAS JSON no formato:
{
  "items": [
    {
      "title": "",
      "price": "",
      "location": "",
      "date": "",
      "analysis": "",
      "link": ""
    }
  ]
}
          `.trim(),
        },
      ],
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);

    if (!openaiResp.ok) {
      console.error(openaiResp.raw);
      return res.status(500).json({
        error: "Erro ao consultar OpenAI",
      });
    }

    let items = [];

    const outputs = openaiResp.body?.output || [];
    for (const out of outputs) {
      if (out.type === "message") {
        for (const c of out.content || []) {
          if (c.type === "output_text") {
            try {
              const parsed = JSON.parse(c.text);
              if (Array.isArray(parsed.items)) {
                items = parsed.items;
              }
            } catch {
              console.warn("JSON inválido ignorado");
            }
          }
        }
      }
    }

    const normalized = normalizeItems(items);
    return res.status(200).json({ items: normalized });
  } catch (err) {
    console.error("[buscar] Erro inesperado:", err);
    return res.status(500).json({
      error: "Erro inesperado no servidor",
      details: String(err),
    });
  }
}
