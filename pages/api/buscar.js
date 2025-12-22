import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    // ✅ CORREÇÃO AQUI — compatível com o frontend atual
    const { produto, cidade } = req.body;

    if (!produto || !cidade) {
      return res.status(400).json({
        error: "Parâmetros obrigatórios ausentes (produto ou cidade)",
      });
    }

    const termo = produto;
    const localizacao = cidade;

    /**
     * PROMPT
     */
    const prompt = `
Você é um especialista em análise de mercado local.

Produto: ${termo}
Região: ${localizacao}

Tarefas:
1. Estimar o preço médio praticado na região.
2. Apontar se o preço tende a estar acima, abaixo ou na média do mercado.
3. Indicar 3 boas oportunidades de compra.
4. Gerar uma análise curta, clara e confiável.

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

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
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
