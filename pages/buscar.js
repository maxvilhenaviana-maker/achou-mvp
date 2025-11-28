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
  // Converte price para número e filtra itens sem preço válido
  const itemsWithPrice = rawItems
    .map((it) => {
      let price_num = null;
      if (it.price) {
        try {
          price_num = Number(it.price.toString().replace(/[^\d.,]/g, "").replace(",", "."));
        } catch {}
      }
      return { ...it, price_num };
    })
    .filter((it) => it.price_num !== null);

  // Estatísticas gerais
  const prices = itemsWithPrice.map((it) => it.price_num);
  const menor = Math.min(...prices);
  const maior = Math.max(...prices);
  const medio = prices.reduce((a, b) => a + b, 0) / prices.length;

  // Ordena todos os anúncios por: preço → sem defeito → mais recente → localização central
  const sorted = itemsWithPrice.sort((a, b) => {
    if (a.price_num !== b.price_num) return a.price_num - b.price_num;
    if ((a.defeito || false) !== (b.defeito || false)) return a.defeito ? 1 : -1;
    if (a.date && b.date) return new Date(b.date) - new Date(a.date);
    return 0;
  });

  // Seleciona os 3 melhores
  const top3 = sorted.slice(0, 3).map((it, idx) => ({
    title: it.title || "Sem título",
    price: it.price || "",
    location: it.location || "",
    date: it.date || "",
    analysis: idx === 0 ? `(Menor: R$${menor.toFixed(2)}, Médio: R$${medio.toFixed(2)}, Maior: R$${maior.toFixed(2)}) ${it.analysis || ""}` : it.analysis || "",
    link: it.link || "#",
    img: "/placeholder-120x90.png",
  }));

  return top3;
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
        {
          role: "system",
          content:
            "Você é um assistente que busca anúncios recentes na web e seleciona as 3 melhores ofertas.",
        },
        {
          role: "user",
          content: `Busque todos os anúncios de "${produto}" em "${cidade}" publicados recentemente. Retorne JSON apenas com um array "items" contendo: title, price, location, date, analysis, link, defeito (booleano).  
Priorize os anúncios de menor preço; em caso de empate, dê preferência para produtos sem defeito; se ainda houver empate, use data mais recente; se necessário, localização mais central.  
Calcule estatísticas (menor preço, preço médio, maior preço) considerando todos os anúncios válidos e inclua apenas no primeiro item.  
Traga os links individuais apenas das 3 melhores ofertas selecionadas.`
        }
      ],
      temperature: 0,
      max_output_tokens: 2000,
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);
    if (!openaiResp.ok) return res.status(500).json({ error: "Erro ao buscar na OpenAI" });

    let items = [];

    if (openaiResp.body?.output?.length > 0) {
      for (const out of openaiResp.body.output) {
        if (out.type === "message" && out.content?.length > 0) {
          for (const c of out.content) {
            if (c.type === "output_text" && c.text) {
              // Extrai JSON do texto usando regex
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
