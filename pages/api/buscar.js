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
            content: `Você é um Analista de Mercado especializado em encontrar ofertas reais.
            Sua tarefa é buscar na web anúncios de "${produto}" em "${cidade}" e região.

            CRITÉRIOS DE SCORE (0 a 100):
            - PREÇO (Peso 70%): Quanto mais barato em relação à média local, maior a nota.
            - QUALIDADE/ESTADO (Peso 30%): Itens novos ou conservados ganham mais pontos.

            REGRAS DE RESPOSTA:
            1. Encontre 3 oportunidades reais com LINKS ativos.
            2. O campo "analysis" DEVE começar com a pontuação e a explicação, ex: "Nota: 92/100. Motivo: Preço excelente e vendedor com boas fotos."
            3. Identifique o preço médio de mercado para o item na região.
            4. Se encontrar termos como "mudança" ou "urgente", aumente o score e destaque na análise.

            RETORNE ESTRITAMENTE UM JSON:
            {
              "market_average": 0,
              "items": [
                {"title": "", "price": "", "location": "", "analysis": "", "score": 0, "link": ""}
              ]
            }` 
          },
          { role: "user", content: `Ache os 3 melhores anúncios de ${produto} em ${cidade} e região metropolitana agora.` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    
    // Extração robusta do JSON caso o modelo retorne markdown
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "A IA não retornou um formato válido." });
    
    const parsed = JSON.parse(jsonMatch[0]);
    const marketAverage = parsed.market_average || 0;
    let rawItems = parsed.items || [];

    const itemsFinal = rawItems.map(it => {
      // Limpeza de Preço para garantir ordenação numérica
      const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
      const priceNum = parseFloat(cleanPrice) || 0;

      return {
        ...it,
        price_num: priceNum,
        img: "/placeholder-120x90.png",
        // Garante que a nota esteja visível na análise caso a IA esqueça
        analysis: it.analysis.includes("Nota:") ? it.analysis : `Nota: ${it.score}/100. ${it.analysis}`
      };
    });

    // ORDENAÇÃO: Garante que o maior Score (Melhor Oferta) fique no topo (index 0)
    itemsFinal.sort((a, b) => (b.score || 0) - (a.score || 0));

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3),
      precoMedio: marketAverage
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}