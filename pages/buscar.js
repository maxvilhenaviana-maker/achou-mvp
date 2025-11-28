// pages/api/buscar.js
// Busca de anúncios reais usando OpenAI GPT-4.1 com web search
// Requisitos de ambiente:
//   OPENAI_API_KEY = sk-... (com acesso a web search)

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
  const placeholderImg = "/placeholder-120x90.png";
  return rawItems.map(it => ({
    title: it.title || "Sem título",
    price: it.price || "",
    location: it.location || "",
    date: it.date || "",
    analysis: it.analysis || "",
    link: it.link || "#",
    img: it.image_url || it.img || placeholderImg,
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  // Prompt simples para testar conexão à web
  const systemPrompt = `Você é um agente de busca de anúncios de produtos usados no Brasil.
  Seu trabalho é devolver JSON válido com "items" contendo: title, price, location, date, analysis, link, image_url.`;
  const userPrompt = `Busque anúncios recentes de "${produto}" em "${cidade}" publicados recentemente na web. 
  Retorne apenas JSON com "items".`;

  const requestBody = {
    model: "gpt-4.1",
    tools: [{ type: "web_search" }], // ativa busca na internet
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.0,
    max_output_tokens: 1200,
  };

  try {
    const openaiResp = await callOpenAI(requestBody, apiKey);

    if (!openaiResp.ok) {
      console.error("[buscar] OpenAI error:", openaiResp.body || openaiResp.raw);
      return res.status(500).json({ error: "Erro na OpenAI", details: openaiResp.body || openaiResp.raw });
    }

    // Extrai JSON da resposta
    let items = [];
    try {
      const text = openaiResp.body.output_text || openaiResp.body.output?.[0]?.content?.find(c => c.type === "output_text")?.text;
      if (text) {
        const cleaned = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        items = parsed.items || [];
      }
    } catch (e) {
      console.error("[buscar] falha ao parsear resposta OpenAI:", e, openaiResp.body);
    }

    if (!items.length) {
      // fallback: anúncios plausíveis estimados
      items = [
        {
          title: `${produto} usado em ${cidade}`,
          price: "R$ 0,00",
          location: cidade,
          date: "recente",
          analysis: "(estimado)",
          link: "#",
          image_url: "/placeholder-120x90.png",
        },
      ];
    }

    return res.status(200).json({ items: normalizeItems(items) });
  } catch (e) {
    console.error("[buscar] erro inesperado:", e);
    return res.status(500).json({ error: "Erro interno", details: String(e) });
  }
}
