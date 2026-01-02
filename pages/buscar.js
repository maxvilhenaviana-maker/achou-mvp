export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY; // Lendo da Vercel
  const { produto, cidade, categoria } = req.body || {};

  if (!produto || !cidade || !categoria) {
    return res.status(400).json({ error: "Dados insuficientes para a análise." });
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
            content: `Atue como um analista de decisão de compra especialista no mercado brasileiro. 
            Seu objetivo é eleger os 3 melhores produtos de "${produto}" em "${cidade}" (Categoria: ${categoria}).

            LÓGICA DE RANKING INTEGRADA:
            A ordem do CARD 1 deve ser o resultado do cruzamento de: Preço (30%), Baixo índice de reclamação (40%) e Suporte Local em ${cidade} (30%).
            Os CARDS 2 e 3 DEVEM seguir a mesma ordem dos itens do CARD 1 para justificar a posição.

            ESTRUTURA DE RESPOSTA (OBRIGATÓRIA):

            [CARD_1_INDICADOS]
            (Ordene do 1º ao 3º. Formato: "Marca/Modelo | Nota: X.X | Faixa: R$ X a R$ Y")

            [CARD_2_RECLAMACOES]
            (Mesmos 3 modelos. Descreva a relação reclamação/venda e a natureza das queixas).

            [CARD_3_SUPORTE]
            (Mesmos 3 modelos. Descreva a presença de assistência em ${cidade} e facilidade de peças).

            [DETALHAMENTO_MERCADO]
            (Panorama geral nacional e recomendações práticas).

            [AVISO_LEGAL]
            “Esta análise é baseada em informações públicas disponíveis na internet e deve ser utilizada apenas como apoio à tomada de decisão. As informações devem ser confirmadas pelo comprador. Esta análise não possui vínculo com fabricantes, vendedores ou marcas e não se responsabiliza pela decisão final de compra, que é exclusiva do consumidor.”`
          },
          { 
            role: "user", 
            content: `Realize a análise integrada com notas para ${produto} em ${cidade}.` 
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    return res.status(200).json({ relatorio: data.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}