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
        model: "gpt-4o-mini-search-preview", 
        messages: [
          { 
            role: "system", 
            content: `Você é um avaliador rigoroso. Sua missão é encontrar 3 anúncios REAIS e DIFERENTES de "${produto}" em "${cidade}".

            PROIBIÇÕES CRÍTICAS:
            - Proibido retornar itens repetidos ou o mesmo anúncio 3 vezes.
            - Proibido inventar links. Se não achar 3, retorne apenas o que achou.
            - Proibido dar nota alta para preços comuns. 

            LÓGICA DE SCORE (0-100):
            - Preço < Média: Score 80-100 (Oportunidade de Ouro).
            - Preço = Média: Score 50-60 (Preço justo, não é oportunidade).
            - Preço > Média: Score abaixo de 40 (Fuja disso).

            A "analysis" deve ser honesta. Se o preço for ruim, diga: "Nota X/100. Preço acima da média local, não recomendo."

            Retorne estritamente JSON:
            {
              "market_average": 0,
              "items": [
                {"title": "", "price": "", "location": "", "analysis": "", "score": 0, "link": ""}
              ]
            }` 
          },
          { 
            role: "user", 
            content: `Encontre 3 ofertas distintas para ${produto} em ${cidade}. Compare preços de fontes diferentes. Não repita o mesmo item.` 
          }
        ],
        temperature: 0.1 // Reduzido drasticamente para evitar "criatividade" e repetições
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Erro na resposta da IA." });
    
    const parsed = JSON.parse(jsonMatch[0]);
    let rawItems = parsed.items || [];

    // Filtro de Segurança Anti-Duplicidade no Código
    const uniqueItems = [];
    const titles = new Set();

    rawItems.forEach(it => {
      const cleanTitle = it.title.toLowerCase().trim();
      if (!titles.has(cleanTitle) && uniqueItems.length < 3) {
        titles.add(cleanTitle);
        
        const priceNum = parseFloat(String(it.price).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        
        uniqueItems.push({
          ...it,
          price_num: priceNum,
          img: "/placeholder-120x90.png",
          // Força a exibição da nota na análise
          analysis: `Nota: ${it.score}/100. ${it.analysis.replace(/Nota:?\s?\d+\/\d+\.?\s?/i, '')}`
        });
      }
    });

    // Ordenação garantida: Melhor Score no topo
    uniqueItems.sort((a, b) => b.score - a.score);

    return res.status(200).json({ 
      items: uniqueItems,
      precoMedio: parsed.market_average || 0
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}