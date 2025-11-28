export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY não configurada.');
    return res.status(500).json({ error: 'Chave da OpenAI ausente.' });
  }

  const { produto, cidade, raio } = req.body;
  if (!produto || !cidade) {
    return res.status(400).json({ error: 'Produto e cidade são obrigatórios.' });
  }

  const systemPrompt = `
Você é um agente de busca especializado em encontrar oportunidades de ouro no mercado de usados.
Use Web Search para buscar OLX, Desapega, Mercado Livre e similares.

Regras:
1. Traga apenas anúncios que estejam claramente abaixo do valor de mercado, e não invente anúncios.
2. Pare e retorne imediatamente após encontrar as 3 melhores oportunidades reais.
3. Cada item deve ter: title, price, location, date, analysis, link.
4. Responda SOMENTE com JSON no formato:
{"items":[...]}
5. Se não houver resultados: {"items":[]}
  `;

  const userPrompt = `
Produto: ${produto}
Cidade: ${cidade}
Raio: ${raio || 40} km

Execute a busca e retorne apenas o JSON.
`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "web_search",
            web_search: {
              bing_query: [
                {
                  q: `${produto} usados ${cidade}`,
                  recency: 2,
                  domains: ["olx.com.br", "mercadolivre.com.br", "desapega.app"]
                }
              ]
            }
          }
        ],
        max_output_tokens: 1024
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("OpenAI error", response.status, txt);
      return res.status(response.status).json({ error: "Erro na API OpenAI", details: txt });
    }

    const json = await response.json();
    const text = json.output_text;

    let cleaned = text.replace(/```json|```/g, "").trim();
    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.status(200).json({
        error: "Falha ao interpretar resposta JSON.",
        raw: text
      });
    }

    return res.status(200).json({
      items: Array.isArray(parsed.items) ? parsed.items : []
    });

  } catch (err) {
    console.error("Erro geral:", err);
    return res.status(500).json({ error: "Erro interno.", details: String(err) });
  }
}
