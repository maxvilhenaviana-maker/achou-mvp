export const config = {
  api: {
    bodyParser: true,
  },
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade, categoria } = req.body || {};

  if (!produto || !cidade || !categoria) {
    return res.status(400).json({ error: "Dados insuficientes." });
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [
          { 
            role: "system", 
            content: `Você é um robô analista de dados. Sua resposta deve seguir RIGOROSAMENTE o formato de tags abaixo. Não escreva introduções. Vá direto para as tags.

            [CARD_1_INDICADOS]
            1. Marca/Modelo A | Nota: X.X | Faixa: R$ X
            2. Marca/Modelo B | Nota: X.X | Faixa: R$ X
            3. Marca/Modelo C | Nota: X.X | Faixa: R$ X

            [CARD_2_RECLAMACOES]
            1. Status de reclamações/vendas para o modelo 1
            2. Status de reclamações/vendas para o modelo 2
            3. Status de reclamações/vendas para o modelo 3

            [CARD_3_SUPORTE]
            1. Status da rede de manutenção em ${cidade} para o modelo 1
            2. Status da rede de manutenção em ${cidade} para o modelo 2
            3. Status da rede de manutenção em ${cidade} para o modelo 3

            [DETALHAMENTO_MERCADO]
            Escreva aqui o panorama geral e recomendações práticas.

            [AVISO_LEGAL]
            Esta análise é baseada em informações públicas e deve ser utilizada apenas como apoio à tomada de decisão. Não nos responsabilizamos pela compra final.`
          },
          { 
            role: "user", 
            content: `Analise ${produto} (${categoria}) em ${cidade}.` 
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    return res.status(200).json({ relatorio: data.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}