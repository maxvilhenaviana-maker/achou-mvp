// pages/api/buscar.js
export const config = { api: { bodyParser: true }, runtime: "nodejs" };

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
  return { ok: resp.ok, status: resp.status, body: parsed, raw: text };
}

function normalizeItems(rawItems) {
  const itemsWithPrice = rawItems
    .map((it) => {
      const priceStr = it.price !== undefined && it.price !== null ? String(it.price) : '';
      const priceNum = parseFloat(priceStr.replace(/\D/g, "")) || null;

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
    .filter((it) => it.price_num !== null); // descarta itens sem preço

  // Cálculos de min, médio e max
  const prices = itemsWithPrice.map(it => it.price_num);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const avgPrice = prices.length > 0 ? (prices.reduce((a,b)=>a+b,0)/prices.length) : 0;

  // Adiciona estatísticas no analysis
  return itemsWithPrice.map(it => ({
    ...it,
    analysis: `${it.analysis || ''} (Menor: R$${minPrice}, Médio: R$${avgPrice.toFixed(2)}, Maior: R$${maxPrice})`
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  try {
    const requestBody = {
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: "Você é um assistente que busca as melhores oportunidades em anúncios recentes na web." },
        { role: "user", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente. Selecione os 3 melhores anúncios considerando: preço mais baixo, sem defeito, mais recente e localização central. Retorne JSON apenas com um array "items" (title, price, location, date, analysis, link).` }
      ],
      temperature: 0,
      max_output_tokens: 1500
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);
    if (!openaiResp.ok) return res.status(500).json({ error: "Erro ao buscar na OpenAI" });

    let items = [];

    if (openaiResp.body?.output?.length > 0) {
      for (const out of openaiResp.body.output) {
        if (out.type === "message" && out.content?.length > 0) {
          for (const c of out.content) {
            if (c.type === "output_text" && c.text) {
              const match = c.text.match(/\{.*"items":.*\}/s);
              if (match) {
                try {
                  const parsed = JSON.parse(match[0]);
                  if (parsed.items) items = items.concat(parsed.items);
                } catch (e) {
                  console.error("[buscar] falha ao parsear JSON regex:", e);
                }
              }
            }
          }
        }
      }
    }

    const normalized = normalizeItems(items);
    return res.status(200).json({ items: normalized });

  } catch (err) {
    console.error("[buscar] Erro inesperado:", err);
    return res.status(500).json({ error: "Erro inesperado no servidor", details: String(err) });
  }
}
