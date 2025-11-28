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

async function searchBing(query, bingKey) {
  const url = "https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query) + "&count=10";
  const resp = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": bingKey } });
  if (!resp.ok) {
    const txt = await resp.text(); // CORRIGIDO AQUI
    return { ok: false, status: resp.status, text: txt };
  }
  const json = await resp.json();
  return { ok: true, json };
}

function extractItemsFromBing(json, produto, cidade) {
  const items = [];
  const pages = (json.webPages && json.webPages.value) || [];
  for (const p of pages) {
    items.push({
      title: p.name || "",
      price: "",
      location: cidade || "",
      date: p.dateLastCrawled || "",
      analysis: p.snippet || "",
      link: p.url || "",
      img: (p.image && p.image.thumbnailUrl) || "",
    });
  }
  return items;
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
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const bingKey = process.env.BING_API_KEY || null;
  const placeholderImg = "/placeholder-120x90.png";

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  const detect = await detectOpenAIWebSupport(apiKey);

  if (detect.webAvailable) {
    const requestBody = {
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e devolva JSON com "items".` },
        { role: "user", content: `Produto: ${produto}\nCidade: ${cidade}\nRetorne apenas JSON.` },
      ],
      text: { format: "json" },
      temperature: 0.0,
      max_output_tokens: 1200,
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);
    if (openaiResp.ok) {
      try {
        let items = [];
        const body = openaiResp.body;
        if (body?.items) items = body.items;
        const normalized = normalizeItems(items, placeholderImg);
        return res.status(200).json({ items: normalized });
      } catch (e) {
        console.error("[buscar] falha ao extrair items da resposta OpenAI:", e);
      }
    }
  }

  if (bingKey) {
    const q = `${produto} ${cidade} anúncio recente site:olx.com.br OR site:mercadolivre.com.br OR site:desapega.app`;
    const bing = await searchBing(q, bingKey);
    if (bing.ok) {
      const rawItems = extractItemsFromBing(bing.json, produto, cidade);
      const normalized = normalizeItems(rawItems, placeholderImg).map((i) => ({ ...i, analysis: (i.analysis || "") + " (estimado)" }));
      return res.status(200).json({ items: normalized });
    }
  }

  const fallbackItems = [
    { title: `Anúncio simulado de ${produto}`, price: "R$ 100", location: cidade, date: "recentemente", analysis: "(estimado)", link: "#", img: placeholderImg },
  ];
  return res.status(200).json({ items: normalizeItems(fallbackItems, placeholderImg) });
}
