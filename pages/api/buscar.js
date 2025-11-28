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
  return rawItems.map((it) => ({
    title: it.title || "Sem título",
    price: it.price || "",
    location: it.location || "",
    date: it.date || "",
    analysis: it.analysis || "",
    link: it.link || "#",
    img: "/placeholder-120x90.png",
  }));
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
        { role: "user", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente. Retorne JSON apenas com um array "items" (title, price, location, date, analysis, link).` }
      ],
      temperature: 0,
      max_output_tokens: 1500
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
