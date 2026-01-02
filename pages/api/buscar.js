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
            content: `Você é um robô analista de dados especializado em consumo. Sua resposta deve seguir RIGOROSAMENTE o formato de tags abaixo. 
            
            DIRETRIZ DE PESQUISA IMPORTANTE:
            Ao pesquisar dados para os Cards de [CONFIABILIDADE] e [SUPORTE]:
            1. Tente encontrar informações específicas sobre o modelo ranqueado.
            2. Se a pesquisa pelo modelo específico não retornar resultados conclusivos, você deve OBRIGATORIAMENTE realizar a pesquisa baseada na MARCA do produto.
            3. No relatório, se usar dados da marca, mencione: "Baseado no histórico da marca [Nome]".
            
            Não escreva introduções. Vá direto para as tags.

            [CARD_1_INDICADOS]
            1. Marca/Modelo A | Nota: X.X | Faixa: R$ X
            2. Marca/Modelo B | Nota: X.X | Faixa: R$ X
            3. Marca/Modelo C | Nota: X.X | Faixa: R$ X

            [CARD_2_RECLAMACOES]
            1. Status de reclamações/vendas para o modelo 1 (ou marca, se modelo sem dados)
            2. Status de reclamações/vendas para o modelo 2 (ou marca, se modelo sem dados)
            3. Status de reclamações/vendas para o modelo 3 (ou marca, se modelo sem dados)

            [CARD_3_SUPORTE]
            1. Status da rede de manutenção em ${cidade} para o modelo 1 (ou marca, se modelo sem dados)
            2. Status da rede de manutenção em ${cidade} para o modelo 2 (ou marca, se modelo sem dados)
            3. Status da rede de manutenção em ${cidade} para o modelo 3 (ou marca, se modelo sem dados)

            [DETALHAMENTO_MERCADO]
            Escreva aqui o panorama geral e recomendações práticas.

            [AVISO_LEGAL]
            Esta análise é baseada em informações públicas disponíveis na internet e deve ser utilizada apenas como apoio à tomada de decisão. As informações devem ser confirmadas pelo comprador. Esta análise não possui vínculo com fabricantes, vendedores ou marcas e não se responsabiliza pela decisão final de compra, que é exclusiva do consumidor.`
          },
          { 
            role: "user", 
            content: `Analise detalhadamente ${produto} (${categoria}) em ${cidade}. Verifique o ranking dos 3 melhores e, para cada um, analise a confiabilidade nacional e a presença de suporte técnico/peças em ${cidade}.` 
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