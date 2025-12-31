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

⚠️ REGRAS OBRIGATÓRIAS:
- NÃO invente dados.
- NÃO presuma valores.
- Se algum dado não estiver disponível, DECLARE a limitação.
- Rankings devem seguir CRITÉRIOS EXPLÍCITOS.
- Reclamações devem ser analisadas SEMPRE de forma PROPORCIONAL ao volume estimado de vendas dos últimos 12 meses.

════════════════════════════════════
CONTEXTO DA ANÁLISE
Produto: ${produto}
Cidade: ${cidade}
Categoria: ${categoria}

════════════════════════════════════
FORMATO DE RESPOSTA (OBRIGATÓRIO)

🔹 CARD 1 — ✅ MELHORES OPÇÕES (Top 3)
Classifique considerando:
1) Melhor custo-benefício (preço médio)
2) Rede de manutenção na cidade
3) MENOR índice proporcional de reclamações (reclamações ÷ vendas estimadas)

Para cada item informe:
• Modelo
• Motivo objetivo da posição no ranking

🔹 CARD 2 — 💰 FAIXA DE PREÇO (VALORES)
Informe obrigatoriamente:
• Preço mínimo (R$)
• Preço médio (R$)
• Preço máximo (R$)
• Fontes públicas utilizadas (ex.: OLX, NaPista, Webmotors)
• Observação curta sobre variação de preço

🔹 CARD 3 — ⚠️ MAIORES ÍNDICES PROPORCIONAIS DE RECLAMAÇÃO
Liste os 3 modelos com:
• Maior proporção estimada de reclamações por volume de vendas (últimos 12 meses)
• Tipo de problema mais recorrente
Se não houver dados suficientes, DECLARE explicitamente.

════════════════════════════════════
ℹ️ INFORMAÇÕES COMPLEMENTARES (EM TÓPICOS)

A) REGRAS UNIVERSAIS (sempre incluir):
• Avaliar a faixa de preço real praticada na cidade
• Priorizar produtos com ampla rede de manutenção local
• Evitar produtos com alto índice proporcional de reclamações
• Confirmar todas as informações diretamente com o vendedor ou fabricante

B) RECOMENDAÇÕES ESPECÍFICAS
Adapte conforme:
• Produto analisado
• Categoria (${categoria})

Exemplos:
- Se USADO: histórico, desgaste, procedência
- Se NOVO: garantia, revisões, custo de manutenção

════════════════════════════════════
🔒 AVISO IMPORTANTE AO CONSUMIDOR (OBRIGATÓRIO — COPIAR SEM ALTERAÇÕES):

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
        messages: [
          { role: "system", content: systemPrompt }
        ],
        temperature: 0.25
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      return res.status(500).json({
        error: "Não foi possível gerar a análise."
      });
    }

    return res.status(200).json({ analysis });

  } catch (err) {
    return res.status(500).json({
      error: "Erro interno na geração da análise",
      details: err.message
    });
  }
}
