export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade, categoria } = req.body || {};

  if (!produto || !cidade || !categoria) {
    return res.status(400).json({ error: "Produto, cidade e categoria são obrigatórios" });
  }

  const systemPrompt = `
Você é um analista independente de mercado e apoio à decisão de compra.

Você TEM acesso à internet para pesquisa.
Utilize apenas informações públicas, atuais e verificáveis.
Se não houver dados confiáveis, declare explicitamente a limitação.
NÃO invente, estime ou presuma informações.

Contexto:
Produto: ${produto}
Cidade: ${cidade}
Categoria: ${categoria}

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO.
NÃO utilize markdown.
NÃO escreva texto fora da estrutura JSON.
NÃO inclua explicações adicionais.

Estrutura OBRIGATÓRIA:

{
  "cards": {
    "melhores_opcoes": [
      { "modelo": "", "motivo": "", "perfil": "" },
      { "modelo": "", "motivo": "", "perfil": "" },
      { "modelo": "", "motivo": "", "perfil": "" }
    ],
    "faixa_preco": {
      "tendencia": "baixo | médio | alto",
      "onde_pesquisar": ["", "", ""],
      "observacao": ""
    },
    "mais_reclamacoes": [
      { "modelo": "", "problema": "", "fonte": "" },
      { "modelo": "", "problema": "", "fonte": "" },
      { "modelo": "", "problema": "", "fonte": "" }
    ]
  },
  "detalhes": {
    "criterios_avaliacao": [],
    "assistencia_tecnica": [],
    "satisfacao_consumidor": [],
    "recomendacoes_praticas": []
  }
}
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
        ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const raw = data.choices?.[0]?.message?.content;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(500).json({
        error: "Falha ao interpretar resposta da IA",
        raw
      });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno",
      details: err.message
    });
  }
}
}
