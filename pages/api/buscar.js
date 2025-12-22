import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { termo, localizacao } = req.body;

    if (!termo || !localizacao) {
      return res.status(400).json({
        error: "Parâmetros obrigatórios ausentes (termo ou localizacao)",
      });
    }

    /**
     * PROMPT – análise de mercado
     */
    const prompt = `
Você é um especialista em análise de mercado local.

Produto: ${termo}
Região: ${localizacao}

Tarefas:
1. Estimar o preço médio praticado na região.
2. Apontar se o preço tende a estar acima, abaixo ou na média do mercado.
3. Indicar 3 boas oportunidades de compra (descritas de forma genérica).
4. Gerar uma análise curta e objetiva para um app de comparação de preços.

Formato de saída (JSON válido):
{
  "preco_medio": number,
  "tendencia": "acima" | "abaixo" | "na média",
  "melhores_oportunidades": [
    { "descricao": string }
  ],
  "analise": string
}
`;

    /**
     * CHAMADA AO MODELO
     */
    const completion = await client.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "Responda exclusivamente em JSON válido.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices[0].message.content;

    /**
     * Garante que o retorno seja JSON
     */
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (jsonError) {
      return res.status(500).json({
        error: "Erro ao interpretar resposta do modelo",
        raw_response: raw,
      });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Erro na API buscar:", e);
    return res.status(500).json({
      error: "Erro interno",
      details: e.message,
    });
  }
}
