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
    parsed = { rawText: text }; // conteúdo bruto se não for JSON
  }
  return { ok: resp.ok, status: resp.status, body: parsed, raw: text };
}

function parsePrice(price) {
  if (!price) return null;
  if (typeof price === "number") return price;
  // Remove "R$", espaços, pontos de milhar e vírgula decimal
  const num = parseFloat(price.replace(/[R$\s\.]/g, "").replace(",", "."));
  return isNaN(num) ? null : num;
}

function normalizeItems(rawItems, priceStats) {
  return rawItems.map((it) => {
    const priceNum = parsePrice(it.price);
    return {
      title: it.title || "Sem título",
      price: priceNum,
      priceStr: it.price || "",
      location: it.location || "",
      date: it.date || "",
      analysis: it.analysis || "",
      link: it.link || "#",
      img: "/placeholder-120x90.png",
      showStats: it.showStats || false,
      stats: priceStats,
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade)
    return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  try {
    const requestBody = {
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: "Você é um assistente que busca anúncios recentes na web." },
        {
          role: "user",
          content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente. 
          Retorne JSON apenas com um array "items" contendo: title, price, location, date, analysis, link.
          Selecione as 3 melhores ofertas considerando: 
          1) preferência para produtos sem defeito, 
          2) menor preço, 
          3) mais recente, 
          4) localização central em caso de empate.`
        }
      ],
      temperature: 0,
      max_output_tokens: 1500
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);
    if (!openaiResp.ok) return res.status(500).json({ error: "Erro ao buscar na OpenAI" });

    let allItems = [];

    if (openaiResp.body?.output?.length > 0) {
      for (const out of openaiResp.body.output) {
        if (out.type === "message" && out.content?.length > 0) {
          for (const c of out.content) {
            if (c.type === "output_text" && c.text) {
              // Regex resiliente para extrair o JSON de items
              const match = c.text.match(/\{[^]*"items"\s*:\s*\[.*?\]\}/s);
              if (match) {
                try {
                  const parsed = JSON.parse(match[0]);
                  if (parsed.items) allItems = allItems.concat(parsed.items);
                } catch (e) {
                  console.error("[buscar] falha ao parsear JSON:", e);
                }
              } else {
                console.warn("[buscar] Nenhum JSON encontrado na resposta");
              }
            }
          }
        }
      }
    }

    // Converte preços e filtra apenas itens válidos para estatísticas
    const pricesValid = allItems
      .map((i) => parsePrice(i.price))
      .filter((v) => v !== null);

    const priceStats = pricesValid.length > 0 ? {
      min: Math.min(...pricesValid),
      max: Math.max(...pricesValid),
      avg: parseFloat((pricesValid.reduce((a, b) => a + b, 0) / pricesValid.length).toFixed(2))
    } : null;

    // Ordena para escolher as 3 melhores ofertas
    const sorted = allItems
      .filter((i) => parsePrice(i.price) !== null)
      .sort((a, b) => {
        const pa = parsePrice(a.price);
        const pb = parsePrice(b.price);
        if (pa !== pb) return pa - pb; // menor preço primeiro
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA; // mais recente em caso de empate
      });

    const top3 = sorted.slice(0, 3).map((i, idx) => {
      return { ...i, showStats: idx === 0 }; // só o primeiro mostra stats
    });

    const normalized = normalizeItems(top3, priceStats);
    return res.status(200).json({ items: normalized });

  } catch (err) {
    console.error("[buscar] Erro inesperado:", err);
    return res.status(500).json({ error: "Erro inesperado no servidor", details: String(err) });
  }
}
