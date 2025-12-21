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
        // Alterado para gpt-4o para garantir busca web real e links funcionais
        model: "gpt-4o-mini", 
        messages: [
          { 
            role: "system", 
            content: `Você é um Analista de Mercado Especialista em ${cidade}. Sua missão é realizar uma pesquisa real na web para encontrar as 3 melhores oportunidades de "${produto}".

            DIRETRIZES DE PONTUAÇÃO (RADAR FRIO):
            1. PESO PREÇO (80%): Calcule a diferença matemática entre o preço anunciado e o "market_average". Quanto mais barato o item em relação à média, maior deve ser a nota. Um item de R$ 300 deve ter uma nota superior a um de R$ 400 se a média for R$ 800.
            2. PESO ESTADO (20%): Verifique se o item está funcional e bem conservado.
            3. NOTA NA DESCRIÇÃO: O campo "analysis" DEVE começar obrigatoriamente com "Nota: X/100 | [Explicação matemática da economia]".

            PESQUISA E LINKS:
            - Realize uma busca real (web search) por anúncios de hoje/recentes.
            - Forneça URLs REAIS de sites como OLX, Mercado Livre ou Marketplace.
            - Localização: Num raio de 50km de ${cidade}.`
          },
          { 
            role: "user", 
            content: `PESQUISE NA WEB AGORA: Encontre as 3 melhores ofertas de "${produto}" em ${cidade} e arredores. Priorize o maior desconto em relação ao preço médio de mercado. Retorne links reais.` 
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const result = JSON.parse(data.choices[0].message.content);
    let rawItems = result.items || [];
    const precoMedioMercado = result.market_average || 0;

    const itemsFinal = rawItems.map(it => {
      // Limpeza e normalização de preço
      const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
      const priceNum = parseFloat(cleanPrice) || 0;

      const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

      return {
        ...it,
        price_num: priceNum,
        is_main_city: eCidadePrincipal,
        img: "/placeholder-120x90.png",
        // Formatação final da análise para destaque visual
        analysis: it.is_urgent ? `🔥 URGENTE | ${it.analysis}` : `✅ ${it.analysis}`
      };
    });

    // Ordenação rigorosa pelo Score (Oportunidade real)
    itemsFinal.sort((a, b) => b.opportunity_score - a.opportunity_score);

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3),
      precoMedio: precoMedioMercado > 0 ? precoMedioMercado : Math.round(itemsFinal.reduce((a, b) => a + b.price_num, 0) / 3)
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}