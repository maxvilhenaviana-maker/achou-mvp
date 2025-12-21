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
        model: "gpt-4o-mini", // Use o modelo de sua preferência (o -search é excelente para web)
        messages: [
          { 
            role: "system", 
            content: `Você é um Analista de Mercado Especialista e Caçador de Ofertas em ${cidade}.
            Sua missão é realizar um "Deep Scan" em anúncios de "${produto}" e encontrar as 3 melhores oportunidades reais.

            DIRETRIZES DE FILTRAGEM AVANÇADA:
            1. ANALISE O ESTADO: Ignore itens com defeitos, trincas ou "para retirada de peças".
            2. SCORE DE OPORTUNIDADE (0-100): Calcule um score baseado no preço (abaixo da média), localização (facilidade de busca) e conservação.
            3. DETECTOR DE URGÊNCIA: Identifique se o vendedor está com pressa (ex: termos como "mudança", "preciso vender hoje", "estudo proposta"). Isso aumenta o score.
            4. PREÇO MÉDIO LOCAL: Estime o preço médio de mercado para este item específico na região de ${cidade}.

            REGRAS DE LOCALIZAÇÃO:
            - Busque em ${cidade} e cidades metropolitanas num raio de 50km.
            - No campo "location", coloque: "Bairro, Cidade/UF".

            Retorne ESTRITAMENTE um JSON neste formato:
            {
              "market_average": 0,
              "items": [
                {
                  "title": "",
                  "price": "",
                  "location": "",
                  "date": "",
                  "analysis": "Explicação curta do porquê é uma das 3 melhores (use emojis)",
                  "opportunity_score": 0,
                  "is_urgent": false,
                  "link": ""
                }
              ]
            }` 
          },
          { 
            role: "user", 
            content: `Encontre as 3 melhores oportunidades para comprar "${produto}" em ${cidade} e arredores hoje. Verifique anúncios recentes.` 
          }
        ],
        response_format: { type: "json_object" } // Garante que a resposta venha como JSON puro
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const result = JSON.parse(data.choices[0].message.content);
    let rawItems = result.items || [];
    const precoMedioMercado = result.market_average || 0;

    const itemsFinal = rawItems.map(it => {
      // Limpeza de Preço para cálculos
      const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
      const priceNum = parseFloat(cleanPrice) || 0;

      // Identifica cidade principal para desempate visual
      const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

      return {
        ...it,
        price_num: priceNum,
        is_main_city: eCidadePrincipal,
        img: "/placeholder-120x90.png", // Em produção, você tentaria extrair a URL da imagem real
        analysis: it.is_urgent ? `🔥 URGENTE: ${it.analysis}` : `✅ ${it.analysis}`
      };
    });

    // Ordenação Final: Score de Oportunidade (do maior para o menor)
    itemsFinal.sort((a, b) => b.opportunity_score - a.opportunity_score);

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3),
      precoMedio: precoMedioMercado > 0 ? precoMedioMercado : Math.round(itemsFinal.reduce((a, b) => a + b.price_num, 0) / 3)
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}