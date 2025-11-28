// pages/api/buscar.js
export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_BASE = "https://api.openai.com/v1/responses";

// Função para chamar a API OpenAI
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

// Normaliza itens recebidos da OpenAI
function normalizeItems(rawItems) {
  return rawItems.map((it) => ({
    title: it.title || "Sem título",
    price: it.price || "",
    location: it.location || "",
    date: it.date || "",
    analysis: it.analysis || "",
    link: it.link || "#",
    img: "/placeholder-120x90.png", // placeholder fixo
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
        { role: "system", content: `Você é um assistente que busca anúncios recentes na web.` },
        { role: "user", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e retorne apenas JSON com um array "items", onde cada item tem title, price, location, date, analysis, link.` }
      ],
      temperature: 0,
      max_output_tokens: 1500
    };

    const openaiResp = await callOpenAI(requestBody, apiKey);

    if (!openaiResp.ok) {
      console.error("[buscar] Erro na resposta OpenAI:", openaiResp.body);
      return res.status(500).json({ error: "Erro ao buscar na OpenAI", details: JSON.stringify(openaiResp.body).substring(0, 300) });
    }

    let items = [];

    // Itera sobre todos outputs retornados
    if (openaiResp.body?.output?.length > 0) {
      for (const out of openaiResp.body.output) {

        // Captura JSON em tool_result (legacy)
        if (out.type === "tool_result" && out.tool?.type === "web_search" && out.content?.[0]?.text) {
          try {
            const parsed = JSON.parse(out.content[0].text);
            if (parsed.items) items = items.concat(parsed.items);
          } catch (e) {
            console.error("[buscar] falha ao parsear JSON tool_result:", e);
          }
        }

        // Captura JSON em mensagens tipo assistant (output_text)
        if (out.type === "message" && out.content?.length > 0) {
          for (const c of out.content) {
            if (c.type === "output_text" && c.text) {
              try {
                const parsed = JSON.parse(c.text);
                if (parsed.items) items = items.concat(parsed.items);
              } catch (e) {
                console.error("[buscar] falha ao parsear JSON message.output_text:", e);
              }
            }
          }
        }
      }
    }

    // Normaliza e retorna
    const normalized = normalizeItems(items);
    return res.status(200).json({ items: normalized });

  } catch (err) {
    console.error("[buscar] Erro inesperado:", err);
    return res.status(500).json({ error: "Erro inesperado no servidor", details: String(err) });
  }
}
