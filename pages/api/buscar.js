export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};
  const dataHoje = new Date().toLocaleDateString('pt-BR');

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
            content: `Você é um radar de oportunidades reais de compra imediata. Hoje é ${dataHoje}.
            Busque ofertas de "${produto}" em "${cidade}" e região.

            FILTRO CRÍTICO (PROIBIDO):
            - É terminantemente PROIBIDO retornar itens de LEILÃO, hasta pública, editais ou sites como (Sodré Santoro, Copart, Milan, etc).
            - Ignore anúncios que mencionem "lance inicial", "lote" ou "alienação judicial".
            - Foque apenas em venda direta (valor final).

            REGRAS DE QUALIDADE:
            1. DIVERSIDADE: Não repita o mesmo anúncio. Ache 3 ofertas de fontes ou vendedores diferentes.
            2. SCORE: Nota 90-100 apenas para barganhas reais (abaixo da média). Preço comum ganha nota 50-60.
            3. ANÁLISE: Comece sempre com "Nota: X/100. [Motivo]".

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
            content: `Ache 3 ofertas de venda direta para ${produto} em ${cidade}. Não traga leilões em nenhuma hipótese.` 
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Erro na estrutura de dados." });
    
    const parsed = JSON.parse(jsonMatch[0]);
    let rawItems = parsed.items || [];

    const seen = new Set();
    const uniqueItems = [];

    for (const item of rawItems) {
      const titleLower = item.title.toLowerCase();
      
      // Filtro de segurança extra no código para palavras de leilão
      const eLeilao = titleLower.includes("leilão") || titleLower.includes("lance") || titleLower.includes("lote");
      const uniqueKey = `${item.title}-${item.price}`.toLowerCase().replace(/\s/g, '');
      
      if (!seen.has(uniqueKey) && !eLeilao && uniqueItems.length < 3) {
        seen.add(uniqueKey);
        
        const priceNum = parseFloat(String(item.price).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        
        uniqueItems.push({
          ...item,
          price_num: priceNum,
          img: "/placeholder-120x90.png",
          analysis: item.analysis.startsWith("Nota:") ? item.analysis : `Nota: ${item.score}/100. ${item.analysis}`
        });
      }
    }

    uniqueItems.sort((a, b) => b.score - a.score);

    return res.status(200).json({ 
      items: uniqueItems,
      precoMedio: parsed.market_average || 0
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}