export const config = { api: { bodyParser: true }, runtime: "nodejs" };

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
Você é um ANALISTA INDEPENDENTE DE MERCADO especializado em APOIO À TOMADA DE DECISÃO DE COMPRA.
Você possui acesso à internet para pesquisa de informações públicas e atuais.

REGRAS:
- NÃO invente dados.
- Rankings devem considerar preço, rede de manutenção e reclamações proporcionais.
- Se faltar dado, declare explicitamente.

CONTEXTO:
Produto: ${produto}
Cidade: ${cidade}
Categoria: ${categoria}

FORMATO:

CARD 1 — MELHORES OPÇÕES (Top 3)
CARD 2 — FAIXA DE PREÇO (mín / médio / máx em R$)
CARD 3 — MAIORES ÍNDICES PROPORCIONAIS DE RECLAMAÇÕES

Depois:
• Recomendações universais
• Recomendações específicas (${categoria})

Finalize OBRIGATORIAMENTE com o aviso legal abaixo, SEM ALTERAÇÕES:

“Esta análise é baseada em informações públicas disponíveis na internet e em estimativas de mercado, devendo ser utilizada apenas como apoio à tomada de decisão. Os dados apresentados podem variar conforme região, período e condições específicas do produto. O Achou.net.br não possui vínculo com fabricantes, vendedores ou plataformas citadas e não se responsabiliza pela decisão final de compra, que é de responsabilidade exclusiva do consumidor.”
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
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.25,
        max_tokens: 900
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        error: "Falha ao consultar o modelo OpenAI",
        details: errorText
      });
    }

    const data = await response.json();
    const analysis = data?.choices?.[0]?.message?.content;

    if (!analysis) {
      return res.status(500).json({
        error: "Resposta vazia ou inválida do modelo."
      });
    }

    return res.status(200).json({ analysis });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno inesperado",
      details: err.message
    });
  }
}
