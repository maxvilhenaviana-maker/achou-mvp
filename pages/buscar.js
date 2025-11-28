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
    const errMsg = (r.body?.error?.message || "").toLowerCase();
    if (errMsg.includes("tools") || errMsg.includes("web") || errMsg.includes("unsupported") || errMsg.includes("unknown parameter")) {
      return { webAvailable: false, details: r.body };
    }
    return { webAvailable: false, details: r.body };
  } catch (e) {
    return { webAvailable: false, details: String(e) };
  }
}

async function searchBing(query, bingKey) {
  const url = "https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query) + "&count=10";
  const resp = await fetch(url, {
    headers: { "Ocp-Apim-Subscription-Key": bingKey },
  });
  if (!resp.ok) {
    const txt = a
