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
  return rawItems.map(it => {
    // Garantir que price seja número
    let price = parseFloat(String(it.price).replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(price)) price = null;

    return {
      title: it.title || "Sem título",
      price,
      priceDisplay: it.price || "—",
      location: it.location || "—",
      date: it.date || "—",
      analysis: it.analysis || "",
      link: it.link || "#",
      img: "/placeholder-120x90.png",
      defect: it.defect || false,   // caso venha informação de defeito
      updatedAt: it.updatedAt || null,
      centrality: it.centrality || 0
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
        { role: "system", content: "Você é um assistente que busca anúncios recentes na web." },
        { role: "user", content: `
Busque anúncios de "${produto}" em "${cidade}" publicados recentemente.
Retorne JSON apenas com array "items" contendo: title, price, location, date, analysis, link, defect (boolean), updatedAt (ISO), centrality (numérica, 0-100).
Analise todas as ofertas encontradas, mas retorne apenas as **3 melhores ofertas** seguindo:
1) Preferência por produtos sem defeito.
2) Se empate, escolha os mais recentes.
3) Se empate, escolha os mais centrais.
Além disso, registre no primeiro item o menor preço encontrado, o preço médio e o maior preço considerando **todos os anúncios válidos encontrados**, mesmo que não estejam nos 3 selecionados.
      ` }
      ],
      temperature: 0,
      max_output_tokens: 2000
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);
    if (!openaiResp.ok) return res.status(500).json({ error: "Erro ao buscar na OpenAI" });

    let items = [];

    // Extrair JSON do output do OpenAI
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
                  console.error("[buscar] falha ao parsear JSON:", e);
                }
              }
            }
          }
        }
      }
    }

    const normalized = normalizeItems(items);

    // Somente anúncios com preço válido
    const validItems = normalized.filter(it => it.price !== null);

    // Cálculo menor, médio e maior
    const allPrices = validItems.map(it => it.price);
    const menor = Math.min(...allPrices);
    const maior = Math.max(...allPrices);
    const medio = (allPrices.reduce((a, b) => a + b, 0) / allPrices.length) || 0;

    // Ordenar por critérios de preferência
    const sorted = normalized.sort((a, b) => {
      if (a.defect !== b.defect) return a.defect ? 1 : -1; // sem defeito primeiro
      if (a.price !== b.price) return a.price - b.price; // menor preço primeiro
      if (a.updatedAt && b.updatedAt) return new Date(b.updatedAt) - new Date(a.updatedAt); // mais recente
      return b.centrality - a.centrality; // mais central
    });

    // Selecionar 3 melhores
    const top3 = sorted.slice(0, 3);

    // Adicionar informação de menor, médio e maior apenas no primeiro item
    if (top3.length > 0) {
      top3[0].priceStats = `Menor: R$${menor}, Médio: R$${medio.toFixed(2)}, Maior: R$${maior}`;
    }

    return res.status(200).json({ items: top3 });

  } catch (err) {
    console.error("[buscar] Erro inesperado:", err);
    return res.status(500).json({ error: "Erro inesperado no servidor", details: String(err) });
  }
}
