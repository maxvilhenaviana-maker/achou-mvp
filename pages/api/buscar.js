export const config = { api: { bodyParser: true }, runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENAI_API_KEY ausente" });

  const { produto, cidade, raio } = req.body || {};
  if (!produto || !cidade)
    return res
      .status(400)
      .json({ error: "produto e cidade são obrigatórios" });

  const systemPrompt = `
Você é um buscador profissional de anúncios reais publicados HOJE ou ONTEM.
Use web search para consultar OLX, Mercado Livre e Desapega.
Nunca invente dados.
Retorne APENAS um JSON:
{
  "items":[
     { "title":"", "price":"", "location":"", "date":"", "analysis":"", "link":"", "image_url":"" }
  ]
}
Se nada for encontrado, retorne {"items":[]}.
`;

  const userPrompt = `
Produto: ${produto}
Cidade/Região: ${cidade}
Raio: ${raio || 40} km
Busque anúncios HOJE ou ONTEM.
`;

  const requestBody = {
    model: "gpt-4.1",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "busca_web",
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
                  image_url: { type: "string" }
                },
                required: ["title", "price", "location", "date", "link"]
              }
            }
          },
          required: ["items"]
        }
      },
      tools: [
        {
          type: "web",
          web: {
            bing_query: [
              {
                q: `${produto} ${cidade} anúncio hoje`,
                recency: 2,
                domains: ["olx.com.br", "mercadolivre.com.br", "desapega.app"]
              }
            ],
            n_tokens: 4096
          }
        }
      ]
    },
    temperature: 0
  };

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Erro OpenAI:", data);
      return res.status(500).json({ error: "Erro OpenAI", details: data });
    }

    const items = data.output?.[0]?.items ?? [];
    return res.status(200).json({ items });
  } catch (err) {
    console.error("Erro geral:", err);
    return res.status(500).json({ error: "Erro interno", details: String(err) });
  }
}
