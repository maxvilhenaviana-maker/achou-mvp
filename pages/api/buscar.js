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

// Teste se a chave permite web_search / tools
async function detectOpenAIWebSupport(apiKey) {
  try {
    const testBody = {
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: "health check: web search availability",
      max_output_tokens: 16, // mínimo permitido pela API
    };
    const r = await callOpenAI(testBody, apiKey);
    if (r.ok && !r.body?.error) return { webAvailable: true, details: r.body };
    return { webAvailable: false, details: r.body };
  } catch (e) {
    return { webAvailable: false, details: String(e) };
  }
}

// Normaliza qualquer lista de objetos para o front
function normalizeItems(rawItems, placeholderImg) {
  return rawItems.map((it) => ({
    title: it.title || "Sem título",
    price: it.price || "",
    location: it.location || "",
    date: it.date || "",
    analysis: it.analysis || "",
    link: it.link || "#",
    img: it.img || placeholderImg || "/placeholder-120x90.png",
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const placeholderImg = "/placeholder-120x90.png";
  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  // Verifica se a chave permite web_search
  const detect = await detectOpenAIWebSupport(apiKey);
  if (!detect.webAvailable) {
    console.error("[buscar] Chave OpenAI não permite web_search:", detect.details);
    return res.status(500).json({ error: "A chave OpenAI não permite buscas na web", details: detect.details });
  }

  // Requisição principal para buscar anúncios recentes
  const requestBody = {
    model: "gpt-4.1",
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content: `Você é um agente que busca anúncios do mercado de usados no Brasil. Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e devolva apenas JSON com "items".`
      },
      {
        role: "user",
        content: `Produto: ${produto}\nCidade: ${cidade}\nRetorne apenas JSON com a estrutura: {"items":[{"title":"","price":"","location":"","date":"","analysis":"","link":"","img":""}]}`
      }
    ],
    text: { format: "json" },
    temperature: 0.0,
    max_output_tokens: 1200,
  };

  const openaiResp = await callOpenAI(requestBody, apiKey);
  if (!openaiResp.ok) {
    console.error("[buscar] Erro na resposta OpenAI:", openaiResp.body || openaiResp.raw);
    return res.status(500).json({ error: "Falha na busca OpenAI", details: openaiResp.body || openaiResp.raw });
  }

  // Extrai items do JSON retornado
  let items = [];
  try {
    const body = openaiResp.body;
    if (body?.items) items = body.items;
    else if (body.output_text) {
      const cleaned = body.output_text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      items = parsed.items || [];
    }
  } catch (e) {
    console.error("[buscar] Falha ao extrair items da resposta OpenAI:", e, openaiResp.body);
    return res.status(500).json({ error: "Falha ao processar resposta OpenAI", details: String(e) });
  }

  const normalized = normalizeItems(items, placeholderImg);
  return res.status(200).json({ items: normalized });
}
