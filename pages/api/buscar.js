// pages/api/buscar.js
// Migrado do Gemini -> OpenAI com fallback Bing / fallback sem-web.
// Requisitos env (no Vercel):
//   OPENAI_API_KEY = sk-...
//   (opcional) BING_API_KEY = <sua chave Bing Search v7>

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
  } catch (e) {
    parsed = { rawText: text };
  }
  return { ok: resp.ok, status: resp.status, body: parsed, raw: text };
}

// Teste rápido de suporte a tools/web_search
async function detectOpenAIWebSupport(apiKey) {
  const testBody = {
    model: "gpt-4o-mini",
    tools: [{ type: "web_search" }],
    input: "health check: web search availability",
    max_output_tokens: 10,
  };

  try {
    const r = await callOpenAI(testBody, apiKey);
    if (r.ok && !r.body?.error) return { webAvailable: true, details: r.body };
    const errMsg = (r.body?.error?.message || "").toString().toLowerCase();
    if (errMsg.includes("tools") || errMsg.includes("web") || errMsg.includes("unsupported") || errMsg.includes("unknown parameter")) {
      return { webAvailable: false, details: r.body };
    }
    return { webAvailable: false, details: r.body };
  } catch (e) {
    return { webAvailable: false, details: String(e) };
  }
}

// Busca via Bing (fallback)
async function searchBing(query, bingKey) {
  const url = "https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query) + "&count=10";
  const resp = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": bingKey },
  });
  if (!resp.ok) {
    const txt = await resp.text(); // corrigido aqui
    return { ok: false, status: resp.status, text: txt };
  }
  const json = await resp.json();
  return { ok: true, json };
}

// Extrai itens brutos de resultados Bing
function extractItemsFromBing(json, produto, cidade) {
  const items = [];
  const pages = (json.webPages && json.webPages.value) || [];
  for (const p of pages) {
    const title = p.name || "";
    const link = p.url || "";
    const snippet = p.snippet || "";
    const priceMatch = snippet.match(/R\$\s?[\d\.,]+/) || snippet.match(/[\d\.,]{3,}/);
    const price = priceMatch ? priceMatch[0] : "";
    const location = cidade || "";
    const date = p.dateLastCrawled || "";
    const img = (p.image && p.image.thumbnailUrl) || "";
    items.push({ title, price, location, date, analysis: snippet, link, img });
  }
  return items;
}

// Refina itens via OpenAI (JSON)
async function refineWithOpenAI(apiKey, systemPrompt, userPrompt) {
  const body = {
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    text: { format: "json" },
    temperature: 0.0,
    max_output_tokens: 1200,
  };
  return await callOpenAI(body, apiKey);
}

// Normaliza qualquer lista de objetos
function normalizeItems(rawItems, placeholderImg) {
  return rawItems.map((it) => ({
    title: it.title || it.titulo || "Sem título",
    price: it.price || it.preco || "",
    location: it.location || it.local || "",
    date: it.date || it.data || "",
    analysis: it.analysis || it.analise || "",
    link: it.link || it.url || "#",
    img: it.image_url || it.img || it.image || placeholderImg || "/placeholder-120x90.png",
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_ACHOU_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const bingKey = process.env.BING_API_KEY || null;
  const placeholderImg = "/placeholder-120x90.png";

  const { produto, cidade, raio } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  console.log("[buscar] etapa=detect-openai-web-support");
  const detect = await detectOpenAIWebSupport(apiKey);
  console.log("[buscar] detectOpenAIWebSupport result:", detect);

  const systemPrompt = `
Você é um agente de busca e filtragem de anúncios do mercado de usados no Brasil.
Seu trabalho é: receber uma lista de achados (URLs e trechos) e retornar SOMENTE um JSON com "items".
Formato final:
{"items":[{"title":"","price":"","location":"","date":"","analysis":"","link":"","image_url":""}]}
Retorne JSON válido estritamente.
`;
  const userPromptTemplate = (contextText) => `
Contexto: ${contextText}

Retorne APENAS o JSON com a lista "items" (mesmo que vazia).
`;

  if (detect.webAvailable) {
    console.log("[buscar] etapa=using-openai-web-search");
    const requestBody = {
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e devolva JSON com "items".` },
        { role: "user", content: `Produto: ${produto}\nCidade: ${cidade}\nRaio km: ${raio || 40}\nRetorne apenas JSON.` }
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
        else if (Array.isArray(body.output) && body.output[0]?.items) items = body.output[0].items;
        else if (body.output_text) {
          const cleaned = body.output_text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          items = parsed.items || [];
        }
        const normalized = normalizeItems(items, placeholderImg);
        return res.status(200).json({ items: normalized });
      } catch (e) {
        console.error("[buscar] falha ao extrair items da resposta OpenAI:", e, openaiResp.body);
      }
    } else {
      console.error("[buscar] openai web_search error:", openaiResp.body || openaiResp.raw);
    }
  }

  if (bingKey) {
    console.log("[buscar] etapa=using-bing-fallback");
    const q = `${produto} ${cidade} anúncio recente site:olx.com.br OR site:mercadolivre.com.br OR site:desapega.app`;
    const bing = await searchBing(q, bingKey);
    if (bing.ok) {
      const rawItems = extractItemsFromBing(bing.json, produto, cidade);
      const contextText = `Lista bruta de potenciais anúncios (titulo/link/snippet) gerados pela busca: ${JSON.stringify(rawItems.slice(0, 10))}`;
      const userPrompt = userPromptTemplate(contextText);
      const refineResp = await refineWithOpenAI(apiKey, systemPrompt, userPrompt);
      if (refineResp.ok) {
        try {
          let finalItems = [];
          const out = refineResp.body;
          if (out.output_text) {
            const cleaned = out.output_text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            finalItems = parsed.items || [];
          } else if (out.items) finalItems = out.items;
          const normalized = normalizeItems(finalItems, placeholderImg);
          return res.status(200).json({ items: normalized });
        } catch (e) {
          console.error("[buscar] falha ao parsear refineResp:", e, refineResp);
        }
      }
      const normalized = normalizeItems(rawItems, placeholderImg).map(i => ({ ...i, analysis: (i.analysis || "") + " (estimado)" }));
      return res.status(200).json({ items: normalized });
    } else {
      console.error("[buscar] bing error:", bing.status, bing.text);
    }
  }

  console.log("[buscar] etapa=using-openai-simulated-fallback");
  const userPrompt = `
Gere até 3 anúncios plausíveis para "${produto}" em "${cidade}" (recentes) com o máximo de realismo possível.
Retorne APENAS JSON: {"items":[{ "title":"","price":"","location":"","date":"","analysis":"","link":"","image_url":"" }]}
Marque cada item com "analysis" contendo a palavra "(estimado)".
`;
  const resp = await refineWithOpenAI(apiKey, systemPrompt, userPrompt);
  if (resp.ok) {
    try {
      let out = resp.body;
      let finalItems = [];
      if (out.output_text) {
        const cleaned = out.output_text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        finalItems = parsed.items || [];
      } else if (out.items) finalItems = out.items;
      const normalized = normalizeItems(finalItems, placeholderImg);
      return res.status(200).json({ items: normalized });
    } catch (e) {
      console.error("[buscar] parse fallback JSON error:", e, resp.body);
    }
  }

  return res.status(500).json({ error: "Nenhuma estratégia de busca funcionou", details: resp.body || resp.raw });
}
