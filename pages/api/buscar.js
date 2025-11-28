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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY não configurada" });

  const { produto, cidade } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: "Produto e cidade são obrigatórios" });

  // Corpo da requisição para GPT-4.1 com Web Search
  const requestBody = {
    model: "gpt-4.1",
    tools: [{ type: "web_search" }],
    input: [
      { role: "system", content: `Você é um assistente que busca anúncios recentes na web.` },
      { role: "user", content: `Busque anúncios de "${produto}" em "${cidade}", publicados recentemente, e devolva JSON com "items". Retorne apenas JSON.` },
    ],
    temperature: 0.0,
    max_output_tokens: 1200,
  };

  const openaiResp = await callOpenAI(requestBody, apiKey);

  // Imprime tudo no log para depuração
  console.log("[buscar] resposta completa OpenAI:", JSON.stringify(openaiResp, null, 2));

  // Retorna a resposta bruta para o front-end
  return res.status(200).json(openaiResp);
}
