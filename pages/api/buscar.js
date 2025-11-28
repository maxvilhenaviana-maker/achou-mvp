// pages/api/buscar.js
//
// Versão completa, detalhada e segura para migrar Gemini -> OpenAI.
// Estratégia:
// 1) Detecta se a OPENAI_API_KEY permite web_search (tools).
// 2) Se permitido: tenta usar OpenAI web_search (tools).
// 3) Se não permitido e houver BING_API_KEY: usa Bing Search -> refina com OpenAI.
// 4) Caso contrário: pede ao OpenAI gerar anúncios plausíveis (marcados como estimados).
//
// Requisitos (Vercel env):
//   OPENAI_API_KEY = sk-...
//   (opcional) BING_API_KEY = <Bing Search v7 key>
//
// Logs: procurar por linhas iniciadas com [buscar] no Vercel.

export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_BASE = "https://api.openai.com/v1/responses";
const BING_SEARCH_URL = "https://api.bing.microsoft.com/v7.0/search";

async function callOpenAIRaw(body, apiKey) {
  // wrapper que retorna objeto com ok, status, parsed body quando possível, raw text
  try {
    const resp = await fetch(OPENAI_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) { /* leave parsed null */ }
    return { ok: resp.ok, status: resp.status, parsed, raw: text };
  } catch (err) {
    return { ok: false, status: 0, parsed: null, raw: String(err) };
  }
}

// Detecta se a chave OpenAI aceita tools:web_search.
// Faz uma chamada mínima e observa a resposta.
async function detectOpenAIWebSupport(apiKey) {
  const testBody = {
    model: "gpt-4o-mini", // modelo leve; se sua conta não suportar, resultará em erro tratado
    tools: [{ type: "web_search" }],
    input: "health-check web_search availability",
    max_output_tokens: 10,
    temperature: 0.0,
  };
  const r = await callOpenAIRaw(testBody, apiKey);
  if (r.ok && !r.parsed?.error) return { webAvailable: true, detail: r };
  const errMsg = (r.parsed?.error?.message || r.raw || "").toString().toLowerCase();
  const indicators = ["tools", "web_search", "unknown parameter", "unsupported", "not available", "not enabled"];
  for (const ind of indicators) if (errMsg.includes(ind)) return { webAvailable: false, detail: r };
  // Caso ambíguo: não habilitar por segurança
  return { webAvailable: false, detail: r };
}

// Chama Bing Search (v7) - retorna json ou erro
async function searchBing(query, bingKey) {
  try {
    const url = `${BING_SEARCH_URL}?q=${encodeURIComponent(query)}&count=10`;
    const resp = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": bingKey } });
    const text = await resp.text();
    if (!resp.ok) return { ok: false, status: resp.status, raw: text };
    return { ok: true, json: JSON.parse(text) };
  } catch (e) {
    return { ok: false, status: 0, raw: String(e) };
  }
}

// Extrai items simples do retorno do Bing (heurística)
// NOTA: essa função cria objetos plausíveis; serão refinados depois pelo OpenAI.
function extractItemsFromBing(json, produto, cidade) {
  const items = [];
  const pages = (json.webPages && json.webPages.value) || [];
  for (const p of pages) {
    const title = p.name || "";
    const link = p.url || "";
    const snippet = p.snippet || "";
    const priceMatch = snippet.match(/R\$\s?[\d\.,]+/) || snippet.match(/\d{3,}[\d\.,]*/);
    const price = priceMatch ? priceMatch[0] : "";
    const location = cidade || "";
    const date = p.dateLastCrawled || "";
    const img = (p.thumbnailUrl || (p.image && p.image.thumbnailUrl)) || "";
    items.push({ title, price, location, date, analysis: snippet, link, image_url: img });
  }
  return items;
}

// Faz uma chamada ao OpenAI pedindo JSON (refinamento). Usa response_format json_schema quando possível.
// Essa função tenta primeiro usar response_format (json_schema). Se o OpenAI recusar por parâmetro, faz fallback para solicitar JSON via prompt e parse do texto.
async function refineWithOpenAI(apiKey, systemPrompt, userPrompt, schema = null) {
  // tentativa 1: com response_format JSON schema (recomendado)
  if (schema) {
    const body = {
      model: "gpt-4.1",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: schema,
      },
      temperature: 0.0,
      max_output_tokens: 1200,
    };
    const r = await callOpenAIRaw(body, apiKey);
    if (r.ok && !r.parsed?.error) return { ok: true, mode: "json_schema", resp: r };
    // se houve erro específico de parâmetro, cair para tentativa 2
    const err = (r.parsed?.error?.message || r.raw || "").toString().toLowerCase();
    if (!err.includes("response_format") && !err.includes("json_schema")) {
      // se erro não relacionado, ainda retornaremos o r para análise (não sobrescrever)
      return { ok: false, mode: "error", resp: r };
    }
    // caso a API rejeite response_format, continuamos para tentativa 2
  }

  // tentativa 2: pedir JSON via instrução no prompt, sem response_format
  const body2 = {
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt + "\n\n**IMPORTANTE**: responda APENAS com JSON válido (somente um objeto JSON). Não inclua texto extra." },
    ],
    temperature: 0.0,
    max_output_tokens: 1200,
  };
  const r2 = await callOpenAIRaw(body2, apiKey);
  if (!r2.ok) return { ok: false, mode: "text", resp: r2 };
  // parse do texto bruto tentando extrair um JSON
  const raw = r2.raw;
  // remove blocos ```json ``` se existirem e tenta extrair o primeiro JSON
  const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return { ok: false, mode: "text", resp: r2, parseError: "Nenhum objeto JSON encontrado" };
  try {
    const parsed = JSON.parse(match[0]);
    return { ok: true, mode: "text", resp: r2, parsedFromText: parsed };
  } catch (e) {
    return { ok: false, mode: "text", resp: r2, parseError: String(e) };
  }
}

// Normaliza itens para formato final (compatível com front)
function normalizeItems(rawItems, placeholderImg = "/placeholder-120x90.png") {
  if (!Array.isArray(rawItems)) return [];
  return rawItems.map((it) => ({
    title: it.title || it.titulo || "Sem título",
    price: it.price || it.preco || "",
    location: it.location || it.local || "",
    date: it.date || it.data || "",
    analysis: it.analysis || it.analise || "",
    link: it.link || it.url || "#",
    img: it.image_url || it.img || it.image || placeholderImg,
  }));
}

// Utilitário simples para sleep (ms)
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// -------------------------------
// Handler principal
// -------------------------------
export default async function handler(req, res) {
  const startTs = Date.now();
  console.log("[buscar] start", new Date().toISOString());

  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { produto, cidade, raio } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_ACHOU_KEY;
  if (!apiKey) {
    console.error("[buscar] missing OPENAI_API_KEY");
    return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });
  }
  const bingKey = process.env.BING_API_KEY || null;
  const placeholderImg = "/placeholder-120x90.png";

  // 1) Detectar suporte web_search (OpenAI tools)
  console.log("[buscar] etapa=detect-openai-web-support");
  const detect = await detectOpenAIWebSupport(apiKey);
  console.log("[buscar] detect result:", { webAvailable: detect.webAvailable, detailsSnippet: detect.detail?.raw ? String(detect.detail.raw).slice(0, 300) : "" });

  // JSON schema para resposta padronizada (usado quando refinamos com OpenAI)
  const jsonSchema = {
    name: "achou_busca",
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              price: { type: "string" },
              location: { type: "string" },
              date: { type: "string" },
              analysis: { type: "string" },
              link: { type: "string" },
              image_url: { type: "string" },
            },
            required: ["title", "link"],
          },
        },
      },
      required: ["items"],
    },
  };

  // Função auxiliar para montar prompts
  const systemPromptForRefine = `
Você é um agente que recebe uma lista de achados (títulos, links, trechos) e deve:
- Filtrar apenas anúncios plausíveis e com preço baixo quando possível.
- Retornar SOMENTE um objeto JSON válido conforme o schema: {"items":[{title,price,location,date,analysis,link,image_url}]}
- Não inclua explicações, apenas o JSON.
`;

  // 2) Se disponível, tenta usar OpenAI web_search (tools)
  if (detect.webAvailable) {
    try {
      console.log("[buscar] etapa=openai-web-search (tentativa)");
      const promptUser = `Procure anúncios de "${produto}" na cidade "${cidade}" (publicados hoje ou ontem). Retorne apenas JSON com "items". Pare quando encontrar até 3 oportunidades.`;
      const body = {
        model: "gpt-4.1",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: `Buscador: foque em OLX, Mercado Livre, Desapega` },
          { role: "user", content: promptUser },
        ],
        // tentamos solicitar JSON via json_schema (se a API aceitar)
        response_format: { type: "json_schema", json_schema: jsonSchema },
        temperature: 0.0,
        max_output_tokens: 1200,
      };

      const openaiResp = await callOpenAIRaw(body, apiKey);
      console.log("[buscar] openai web_search status:", openaiResp.status);

      if (openaiResp.ok && openaiResp.parsed) {
        // Se a API retornou já em JSON conforme schema, extrair items
        // Dependendo do formato, pode estar em parsed.output[0].content, parsed.items, etc.
        // Vamos tentar diversas abordagens.
        let items = [];
        try {
          // 1) parsed.items (caso devolvido no topo)
          if (openaiResp.parsed.items) items = openaiResp.parsed.items;
          // 2) output[0].items
          else if (Array.isArray(openaiResp.parsed.output) && openaiResp.parsed.output[0]?.items)
            items = openaiResp.parsed.output[0].items;
          // 3) procurar content blocks que inclinam ao schema
          else if (Array.isArray(openaiResp.parsed.output) && openaiResp.parsed.output[0]?.content) {
            // some providers return the structured object directly in content
            const content = openaiResp.parsed.output[0].content;
            for (const c of content) {
              if (c.type === "json_schema") {
                // tentar extrair
                if (c.value && c.value.items) {
                  items = c.value.items;
                  break;
                }
              }
              if (c.type === "output_text" && c.text) {
                try {
                  const cleaned = c.text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
                  const parsed = JSON.parse(cleaned);
                  if (parsed.items) { items = parsed.items; break; }
                } catch (_) { /* ignore */ }
              }
            }
          }
        } catch (e) {
          console.error("[buscar] erro extrair items openai web_search:", e);
        }

        if (items && items.length >= 0) {
          const normalized = normalizeItems(items, placeholderImg);
          console.log("[buscar] sucesso openai web_search items:", normalized.length);
          return res.status(200).json({ items: normalized });
        }
        // se não encontrou items, caí para fallback abaixo
        console.log("[buscar] openai web_search não retornou items; seguindo fallback");
      } else {
        console.error("[buscar] openai web_search resposta inválida:", openaiResp.parsed || openaiResp.raw);
      }
    } catch (e) {
      console.error("[buscar] erro usando openai web_search:", e);
    }
  } // fim detect.webAvailable

  // 3) Fallback com Bing Search (recomendado se você quer busca real e confiável)
  if (bingKey) {
    try {
      console.log("[buscar] etapa=bing-fallback (query)");
      const q = `${produto} ${cidade} anúncio hoje OR ontem site:olx.com.br OR site:mercadolivre.com.br OR site:desapega.app`;
      const bingResp = await searchBing(q, bingKey);
      if (!bingResp.ok) {
        console.error("[buscar] bing error:", bingResp.status, bingResp.raw);
      } else {
        // Extrai itens heurísticos
        const rawItems = extractItemsFromBing(bingResp.json, produto, cidade);
        console.log("[buscar] bing extraiu itens:", rawItems.length);
        // Enviar para OpenAI refinar (usar schema preferencialmente)
        const contextText = `Lista bruta (até 10) gerada pela busca: ${JSON.stringify(rawItems.slice(0, 10))}`;
        const userPrompt = `Refine a lista abaixo, filtrando anúncios reais e plausíveis, retornando APENAS JSON conforme schema: ${JSON.stringify(jsonSchema.schema)}\n\n${contextText}`;
        const refine = await refineWithOpenAI(apiKey, systemPromptForRefine, userPrompt, jsonSchema);
        if (refine.ok) {
          // se refine.mode === 'json_schema', o retorno estará em refine.resp.parsed
          let finalItems = [];
          if (refine.mode === "json_schema" && refine.resp.parsed) {
            // Procurar por parsed.items ou parsed.output...
            if (refine.resp.parsed.items) finalItems = refine.resp.parsed.items;
            else if (Array.isArray(refine.resp.parsed.output) && refine.resp.parsed.output[0]?.items)
              finalItems = refine.resp.parsed.output[0].items;
            // fallback: tentar extrair de texto
            else if (refine.resp.parsed.output_text) {
              try {
                const cleaned = refine.resp.parsed.output_text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
                const p = JSON.parse(cleaned);
                finalItems = p.items || [];
              } catch (e) { /* ignore */ }
            }
          } else if (refine.mode === "text" && refine.parsedFromText) {
            finalItems = refine.parsedFromText.items || [];
          }

          if (finalItems && finalItems.length > 0) {
            const normalized = normalizeItems(finalItems, placeholderImg);
            return res.status(200).json({ items: normalized });
          }
          // se refinamento falhar, devolve rawItems marcados como estimados
          const normalizedEstimated = normalizeItems(rawItems, placeholderImg).map((i) => ({ ...i, analysis: (i.analysis || "") + " (estimado)" }));
          return res.status(200).json({ items: normalizedEstimated });
        } else {
          console.error("[buscar] refineWithOpenAI falhou:", refine);
          const normalizedEstimated = normalizeItems(rawItems, placeholderImg).map((i) => ({ ...i, analysis: (i.analysis || "") + " (estimado)" }));
          return res.status(200).json({ items: normalizedEstimated });
        }
      }
    } catch (e) {
      console.error("[buscar] erro no fallback Bing:", e);
    }
  }

  // 4) Fallback final: pedir ao OpenAI (sem web) para gerar até 3 anúncios plausíveis (marcados como estimados)
  try {
    console.log("[buscar] etapa=fallback-simulated (openai)");
    const userPrompt = `Gere até 3 anúncios plausíveis para "${produto}" em "${cidade}" (HOJE/ONTEM). Retorne APENAS JSON no formato: {"items":[{ "title":"","price":"","location":"","date":"","analysis":"","link":"","image_url":"" }]}. Marque "analysis" com a palavra "(estimado)".`;
    const fallback = await refineWithOpenAI(apiKey, systemPromptForRefine, userPrompt, jsonSchema);
    if (!fallback.ok) {
      console.error("[buscar] fallback-simulated failed:", fallback);
      return res.status(500).json({ error: "Nenhuma estratégia de busca funcionou", details: fallback.resp || fallback });
    }
    // extrair items do fallback
    let finalItems = [];
    if (fallback.mode === "json_schema" && fallback.resp.parsed) {
      if (fallback.resp.parsed.items) finalItems = fallback.resp.parsed.items;
      else if (Array.isArray(fallback.resp.parsed.output) && fallback.resp.parsed.output[0]?.items) finalItems = fallback.resp.parsed.output[0].items;
    } else if (fallback.mode === "text" && fallback.parsedFromText) {
      finalItems = fallback.parsedFromText.items || [];
    }

    const normalized = normalizeItems(finalItems, placeholderImg);
    // se vazio, retorna array vazio
    return res.status(200).json({ items: normalized });
  } catch (e) {
    console.error("[buscar] erro final inesperado:", e);
    return res.status(500).json({ error: "Erro interno final", details: String(e) });
  } finally {
    console.log("[buscar] done in ms:", Date.now() - startTs);
  }
}
