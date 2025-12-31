export const config = {
  api: { bodyParser: true },
  runtime: "nodejs"
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade, categoria } = req.body || {};

  if (!produto || !cidade || !categoria) {
    return res.status(400).json({
      error: "Produto, cidade e categoria são obrigatórios"
    });
  }

  const systemPrompt = `
Você é um ANALISTA INDEPENDENTE DE MERCADO especializado em APOIO À DECISÃO DE COMPRA.
Utilize APENAS informações públicas e pesquisas online reais.
Se não houver dados confiáveis, declare explicitamente a limitação.
NÃO invente números, rankings ou marcas.

CONTEXTO:
Produto: ${produto}
Cidade: ${cidade}
Categoria: ${categoria}

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO, SEM TEXTO FORA DO JSON.

FORMATO OBRIGATÓRIO:

{
  "cards": {
    "melhores_opcoes": [
      {
        "nome": "",
        "justificativa": ""
      }
    ],
    "faixa_preco": {
      "min": number,
      "max": number,
      "fontes": []
    },
    "mais_reclamacoes": [
      {
        "nome": "",
        "motivo": ""
      }
    ]
  },
  "recomendacoes": [
    ""
  ],
  "complementar": [
    ""
  ],
  "disclaimer": "texto obrigatório"
}

REGRAS IMPORTANTES:
1. Melhores opções devem considerar: preço médio, rede de manutenção e MENOR índice proporcional de reclamações.
2. Reclamações devem considerar proporção reclamações / volume de vendas nos últimos 12 meses. Se não houver dado público confiável, DECLARE.
3. A faixa de preço DEVE ser numérica (mínimo e máximo).
4. As recomendações devem ser ESPECÍFICAS para o produto e para a categoria (${categoria}).
5. O texto de disclaimer abaixo é OBRIGATÓRIO e IMUTÁVEL:

“Esta análise é baseada em informações públicas disponíveis na internet e deve ser utilizada apenas como apoio à tomada de decisão. As informações devem ser confirmadas pelo comprador. Esta análise não possui vínculo com fabricantes, vendedores ou marcas e não se responsabiliza pela decisão final de compra, que é exclusiva do consumidor.”
`;

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.2,
        max_tokens: 900
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(500).json({
        error: "Falha na comunicação com o modelo",
        details: txt
      });
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content;

    if (!rawContent) {
      return res.status(500).json({
        error: "Resposta vazia do modelo"
      });
    }

    // Extração defensiva do JSON
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({
        error: "Resposta inválida do modelo",
        raw: rawContent
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno ao gerar análise",
      details: err.message
    });
  }
}
