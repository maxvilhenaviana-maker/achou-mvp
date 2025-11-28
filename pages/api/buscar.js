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
  try {
    return { ok: resp.ok, status: resp.status, body: JSON.parse(text), raw: text };
  } catch {
    return { ok: resp.ok, status: resp.status, body: { rawText: text }, raw: text };
  }
}

function normalizeItems(rawItems) {
  return rawItems.map((it) => {
    const priceNum = parseFloat(it.price.replace(/\D/g, "")) || 0;
    return {
      title: it.title || "Sem título",
      price: it.price || "",
      price_num: priceNum,
      location: it.location || "",
      date: it.date || "",
      analysis: it.analysis || "",
      link: it.link || "#",
      img: "/placeholder-120x90.png",
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  try {
    const requestBody = {
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: "Você é um assistente especializado em buscar anúncios recentes na web e analisar as melhores oportunidades." },
        {
          role: "user",
          content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente. 
          Analise todos os resultados encontrados e retorne **somente os 3 melhores anúncios** considerando estas prioridades: 
          1) Evitar produtos com defeito; 
          2) Em caso de empate de preço, escolher os publicados ou alterados mais recentemente; 
          3) Em caso de empate, escolher os localizados mais centrais.
          Para cada resultado, inclua: title, price, location, date, link individual, e um campo analysis que descreva o valor mais baixo, médio e mais alto das ofertas analisadas.
          Retorne apenas um JSON válido com array "items".`
        }
      ],
      temperature: 0,
      max_output_tokens: 2000
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
