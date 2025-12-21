export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        // IMPORTANTE: Use modelos que suportam pesquisa (como gpt-4o com tools ou similares)
        model: "gpt-4o", 
        messages: [
          { 
            role: "system", 
            content: `Você é um buscador em tempo real. Sua missão é navegar na web para encontrar anúncios REAIS de "${produto}" em "${cidade}".

            CRITÉRIOS DE SCORE (Peso total 100):
            - Preço (70 pontos): Quanto mais abaixo da média de mercado, maior a pontuação.
            - Estado (20 pontos): Itens novos ou impecáveis ganham mais.
            - Localização (10 pontos): Itens na cidade principal ganham mais.

            REGRAS OBRIGATÓRIAS:
            1. LINKS: Retorne apenas links REAIS e ativos (Mercado Livre, OLX, Amazon, etc). Nunca invente uma URL.
            2. PREÇOS: Use valores atualizados da data de hoje. 
            3. ANÁLISE: O campo "analysis" deve começar com a nota, ex: "Nota: 95/100. Motivo: Preço 20% abaixo da média local e item em excelente estado."

            Retorne um JSON:
            {
              "market_average": 0,
              "items": [
                {
                  "title": "",
                  "price": "",
                  "location": "",
                  "analysis": "",
                  "score": 0,
                  "link": ""
                }
              ]
            }` 
          },
          { 
            role: "user", 
            content: `PESQUISE AGORA na internet anúncios de ${produto} em ${cidade} e região. Traga as 3 melhores ofertas de ouro com links reais.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2 // Baixa temperatura para evitar invenções (alucinações)
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const result = JSON.parse(data.choices[0].message.content);
    let itemsFinal = result.items || [];

    // Tratamento e limpeza de dados
    itemsFinal = itemsFinal.map(it => ({
      ...it,
      price_num: parseFloat(String(it.price).replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
      img: "/placeholder-120x90.png"
    }));

    // Garantir ordenação por Score Decrescente (Melhor oferta primeiro)
    itemsFinal.sort((a, b) => b.score - a.score);

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3),
      precoMedio: result.market_average || 0
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}