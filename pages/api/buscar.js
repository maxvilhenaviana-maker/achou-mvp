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
      max_output_tokens: 16, // corrigido mínimo permitido
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
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const placeholderImg = "/placeholder-120x90.png";
  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  // Detecta se OpenAI Web Search está disponível
  const detect = await detectOpenAIWebSupport(apiKey);

  if (detect.webAvailable) {
    try {
      const requestBody = {
        model: "gpt-4.1",
        tools: [{ type: "web_search" }],
        input: [
          { role: "system", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e devolva JSON com "items".` },
          { role: "user", content: `Produto: ${produto}\nCidade: ${cidade}\nRetorne apenas JSON.` },
        ],
        temperature: 0.0,
        max_output_tokens: 1200,
      };

      const openaiResp = await callOpenAI(requestBody, apiKey);
      if (!openaiResp.ok) {
        console.error("[buscar] Erro na resposta OpenAI:", openaiResp.body);
        return res.status(500).json({ error: "Falha na busca OpenAI", details: openaiResp.body });
      }

      let items = openaiResp.body.items || [];
      const normalized = normalizeItems(items, placeholderImg);
      return res.status(200).json({ items: normalized });

    } catch (err) {
      console.error("[buscar] Falha ao processar OpenAI:", err);
      return res.status(500).json({ error: "Erro ao processar OpenAI", details: String(err) });
    }
  }

  return res.status(500).json({ error: "Busca web não disponível no momento." });
}
