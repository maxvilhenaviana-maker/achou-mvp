// pages/api/buscar.js
// Migrado do Gemini -> OpenAI com fallback Bing / fallback sem-web.
// Requisitos env (no Vercel):
//   OPENAI_API_KEY = sk-...
//   (opcional) BING_API_KEY = <sua chave Bing Search v7>

// Nota: Este arquivo faz uma tentativa leve para detectar se a chave OpenAI
// permite "tools/web_search". Em seguida usa o melhor caminho disponível.

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

// Faz um teste rápido para checar suporte a web_search / tools.
// Retorna { webAvailable: boolean, details }
async function detectOpenAIWebSupport(apiKey) {
  // Corpo mínimo de teste — model pequeno para economizar tokens
  const testBody = {
    model: "gpt-4o-mini", // modelo leve — se não existir, API pode rejeitar — tratamos erros
    tools: [{ type: "web_search" }],
    input: "health check: web search availability",
    max_output_tokens: 10,
  };

  try {
    const r = await callOpenAI(testBody, apiKey);
    // Se ok e não há erro no corpo -> provavelmente disponível
    if (r.ok && !r.body?.error) return { webAvailable: true, details: r.body };
    // Se o retorno tem erro e a mensagem menciona "tools" ou "web", então não está habilitado
    const errMsg = (r.body?.error?.message || "").toString().toLowerCase();
    if (errMsg.includes("tools") || errMsg.includes("web") || errMsg.includes("unsupported") || errMsg.includes("unknown parameter")) {
      return { webAvailable: false, details: r.body };
    }
    // Caso ambíguo, marca false mas retorna detalhes para logs
    return { webAvailable: false, details: r.body };
  } catch (e) {
    return { webAvailable: false, details: String(e) };
  }
}

// Busca via Bing (fallback). Requer BING_API_KEY.
// Usa Bing Web Search v7 endpoint
async function searchBing(query, bingKey) {
  const url = "https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query) + "&count=10";
  const resp = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": bingKey },
  });
  if (!resp.ok) {
    const txt = await resp.text();
    return { ok: false, status: resp.status, text: txt };
  }
  const json = await resp.json();
  return { ok: true, json };
}

// Extrai itens brutos de resultados (muito simples): pega webPages.value
function extractItemsFromBing(json, produto, cidade) {
  const items = [];
  const pages = (json.webPages && json.webPages.value) || [];
  for (const p of pages) {
    const title = p.name || "";
    const link = p.url || "";
    const snippet = p.snippet || "";
    // heurística simples: tirar preço com regex (R$ 1.234,00 ou 1234)
    const priceMatch = snippet.match(/R\$\s?[\d\.,]+/) || snippet.match(/[\d\.,]{3,}/);
    const price = priceMatch ? priceMatch[0] : "";
    const location = cidade || "";
    const date = p.dateLastCrawled || "";
    const img = (p.image && p.image.thumbnailUrl) || "";
    items.push({ title, price, location, date, analysis: snippet, link, img });
  }
  return items;
}

// Pede ao OpenAI para analisar uma lista de URLs / trechos e devolver JSON final
async function refineWithOpenAI(apiKey, systemPrompt, userPrompt) {
  const body = {
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    // peça que o output seja texto JSON puro
    text: { format: "json" },
    temperature: 0.0,
    max_output_tokens: 1200,
  };
  return await callOpenAI(body, apiKey);
}

// Normaliza qualquer lista de objetos ao formato final que o front espera
function normalizeItems(rawItems, placeholderImg) {
  return rawItems.map((it) => {
    return {
      title: it.title || it.titulo || "Sem título",
      price: it.price || it.preco || "",
      location: it.location || it.local || "",
      date: it.date || it.data || "",
      analysis: it.analysis || it.analise || "",
      link: it.link || it.url || "#",
      img: it.image_url || it.img || it.image || placeholderImg || "/placeholder-120x90.png",
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_ACHOU_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const bingKey = process.env.BING_API_KEY || null;
  const placeholderImg = "/placeholder-120x90.png";

  const { produto, cidade, raio } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  // 1) Detectar suporte a web_search na OpenAI
  console.log("[buscar] etapa=detect-openai-web-support");
  const detect = await detectOpenAIWebSupport(apiKey);
  console.log("[buscar] detectOpenAIWebSupport result:", detect);

  // Common prompts
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

  // 2) Se a OpenAI permite web_search via tools => usar caminho 1
  if (detect.webAvailable) {
    console.log("[buscar] etapa=using-openai-web-search");
    // Monta a requisição usando tools:web_search — estrutura minimalista
    const requestBody = {
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: [
        { role: "system", content: `Você é um bot que busca anúncios em OLX, Mercado Livre e Desapega. Procure anúncios de "${produto}" na cidade "${cidade}", publicados hoje ou ontem, e devolva JSON com "items".` },
        { role: "user", content: `Produto: ${produto}\nCidade: ${cidade}\nRaio km: ${raio || 40}\nRetorne apenas JSON.` }
      ],
      text: { format: "json" },
      temperature: 0.0,
      max_output_tokens: 1200,
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);
    console.log("[buscar] openai web_search response status:", openaiResp.status);
    if (!openaiResp.ok) {
      console.error("[buscar] openai web_search error:", openaiResp.body || openaiResp.raw);
      // fallback para Bing se existir
    } else {
      // Tenta extrair items do body retornado direto (se já for JSON conforme solicitado)
      const body = openaiResp.body;
      // Caso a API retorne já o JSON, tenta encontrar items em body.output[0].content / ou body.output_text
      // Vários formatos possíveis: adaptamos.
      let items = [];
      try {
        // Se a resposta já vier como objeto com items:
        if (body?.items) items = body.items;
        else if (Array.isArray(body.output) && body.output[0]?.items) items = body.output[0].items;
        else if (body.output_text) {
          // tentativa: parse do texto
          const cleaned = body.output_text.replace(/```json|```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          items = parsed.items || [];
        } else if (body?.output?.[0]?.content) {
          // procurar por bloco text
          const maybe = body.output[0].content.find(c => c.type === "output_text");
          if (maybe?.text) {
            const cleaned = maybe.text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            items = parsed.items || [];
          }
        }
      } catch (e) {
        console.error("[buscar] falha ao extrair items da resposta OpenAI:", e, body);
      }

      if (items && items.length >= 0) {
        const normalized = normalizeItems(items, placeholderImg);
        return res.status(200).json({ items: normalized });
      }
      // se falhar, caí para fallback
      console.log("[buscar] openai web_search não retornou items. seguindo para fallback.");
    }
  } // fim detect.webAvailable

  // 3) Fallback: usar Bing se disponível
  if (bingKey) {
    console.log("[buscar] etapa=using-bing-fallback");
    const q = `${produto} ${cidade} anúncio hoje OR ontem site:olx.com.br OR site:mercadolivre.com.br OR site:desapega.app`;
    const bing = await searchBing(q, bingKey);
    if (!bing.ok) {
      console.error("[buscar] bing error:", bing.status, bing.text);
    } else {
      const rawItems = extractItemsFromBing(bing.json, produto, cidade);
      // Envie para OpenAI (sem web) para filtrar/analisar e garantir formato JSON
      const contextText = `Lista bruta de potenciais anúncios (titulo/link/snippet) gerados pela busca: ${JSON.stringify(rawItems.slice(0, 10))}`;
      const userPrompt = userPromptTemplate(contextText);
      const refineResp = await refineWithOpenAI(apiKey, systemPrompt, userPrompt);
      if (!refineResp.ok) {
        console.error("[buscar] refineWithOpenAI falhou:", refineResp);
        // devolve os rawItems normalizados mesmo assim (marcados como 'estimated')
        const normalized = normalizeItems(rawItems, placeholderImg).map(i => ({ ...i, analysis: (i.analysis || "") + " (estimado)" }));
        return res.status(200).json({ items: normalized });
      } else {
        // parse refineResp.body (deve ser JSON)
        try {
          const out = refineResp.body;
          // se body tiver output_text, parse
          let finalItems = [];
          if (out.output_text) {
            const cleaned = out.output_text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            finalItems = parsed.items || [];
          } else if (out?.output?.[0]?.content) {
            const maybe = out.output[0].content.find(c => c.type === "output_text");
            if (maybe?.text) {
              const cleaned = maybe.text.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(cleaned);
              finalItems = parsed.items || [];
            }
          } else if (out.items) finalItems = out.items;
          const normalized = normalizeItems(finalItems, placeholderImg);
          return res.status(200).json({ items: normalized });
        } catch (e) {
          console.error("[buscar] falha ao parsear refineResp:", e, refineResp);
          const normalized = normalizeItems(rawItems, placeholderImg).map(i => ({ ...i, analysis: (i.analysis || "") + " (estimado)" }));
          return res.status(200).json({ items: normalized });
        }
      }
    }
  }

  // 4) Último recurso: pedir ao OpenAI (sem web) para gerar anúncios plausíveis (marcados como estimados)
  try {
    console.log("[buscar] etapa=using-openai-simulated-fallback");
    const userPrompt = `
Gere até 3 anúncios plausíveis para "${produto}" em "${cidade}" (HOJE/ONTEM) com o máximo de realismo possível.
Retorne APENAS JSON: {"items":[{ "title":"","price":"","location":"","date":"","analysis":"","link":"","image_url":"" }]}
Marque cada item com "analysis" contendo a palavra "(estimado)".
`;
    const resp = await refineWithOpenAI(apiKey, systemPrompt, userPrompt);
    if (!resp.ok) {
      console.error("[buscar] fallback-simulated failed:", resp);
      return res.status(500).json({ error: "Nenhuma estratégia de busca funcionou", details: resp.body || resp.raw });
    }
    // Parse final
    let out = resp.body;
    let finalItems = [];
    try {
      if (out.output_text) {
        const cleaned = out.output_text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        finalItems = parsed.items || [];
      } else if (out.items) finalItems = out.items;
    } catch (e) {
      console.error("[buscar] parse fallback JSON error:", e, out);
    }
    const normalized = normalizeItems(finalItems, placeholderImg);
    return res.status(200).json({ items: normalized });
  } catch (e) {
    console.error("[buscar] erro final inesperado:", e);
    return res.status(500).json({ error: "Erro interno final", details: String(e) });
  }
}
