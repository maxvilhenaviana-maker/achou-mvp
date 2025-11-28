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

async function detectOpenAIWebSupport(apiKey) {
  try {
    const testBody = {
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: "health check: web search availability",
      max_output_tokens: 10,
    };
    const r = await callOpenAI(testBody, apiKey);
    if (r.ok && !r.body?.error) return { webAvailable: true, details: r.body };
    return { webAvailable: false, details: r.body };
  } catch (e) {
    return { webAvailable: false, details: String(e) };
  }
}

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
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const placeholderImg = "/placeholder-120x90.png";

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade)
    return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  // Verifica se OpenAI suporta web_search
  const detect = await detectOpenAIWebSupport(apiKey);
  console.log("[buscar] detectOpenAIWebSupport:", detect);

  if (!detect.webAvailable)
    return res.status(500).json({
      error: "Chave OpenAI não possui suporte a web_search",
      details: detect.details,
    });

  // Cria prompt para web_search
  const requestBody = {
    model: "gpt-4.1",
    tools: [{ type: "web_search" }],
    input: [
      {
        role: "system",
        content: `Você é um agente de busca de anúncios do mercado de usados no Brasil. 
Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e devolva apenas JSON com "items". 
Formato: {"items":[{"title":"","price":"","location":"","date":"","analysis":"","link":"","img":""}]}`
      },
      {
        role: "user",
        content: `Produto: ${produto}\nCidade: ${cidade}\nRetorne APENAS JSON com anúncios reais.`
      }
    ],
    text: { format: "json" },
    temperature: 0.0,
    max_output_tokens: 1200,
  };

  const openaiResp = await callOpenAI(requestBody, apiKey);

  console.log("[buscar] openaiResp status:", openaiResp.status);
  console.log("[buscar] openaiResp body:", JSON.stringify(openaiResp.body, null, 2));

  if (!openaiResp.ok)
    return res.status(500).json({ error: "Erro ao consultar OpenAI", details: openaiResp.body });

  try {
    let items = [];
    const body = openaiResp.body;

    // Tentativas de parse
    if (body?.items) items = body.items;
    else if (body?.output_text) {
      const cleaned = body.output_text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      items = parsed.items || [];
    } else if (Array.isArray(body?.output) && body.output[0]?.content) {
      const maybe = body.output[0].content.find(c => c.type === "output_text");
      if (maybe?.text) {
        const cleaned = maybe.text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        items = parsed.items || [];
      }
    }

    const normalized = normalizeItems(items, placeholderImg);
    return res.status(200).json({ items: normalized });
  } catch (e) {
    console.error("[buscar] erro ao parsear resposta OpenAI:", e, openaiResp.body);
    return res.status(500).json({ error: "Falha ao processar resultado da OpenAI", details: e.toString() });
  }
}
