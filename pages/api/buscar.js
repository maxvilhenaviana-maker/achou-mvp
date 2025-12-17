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
            content: `Você é um Especialista em Inteligência de Mercado em ${cidade}.
            Sua missão é tripla:
            1. Calcular o PREÇO MÉDIO real de mercado para "${produto}" em bom estado na região.
            2. Encontrar as 3 MELHORES oportunidades (menor preço) ignorando defeitos, ferrugem e leilões.
            3. Analisar anúncios de ${cidade} e região metropolitana.

            Regras de Saída:
            - precoMedio: Apenas o valor numérico (ex: 450).
            - items: Lista com os 3 melhores achados.

            Retorne estritamente um JSON: 
            {"precoMedio": 0, "items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Qual o preço médio e os 3 melhores anúncios de ${produto} em ${cidade} e região?` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/s);
    
    let finalResponse = { precoMedio: 0, items: [] };
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      finalResponse.precoMedio = parsed.precoMedio || 0;
      let rawItems = parsed.items || [];

      let processedItems = rawItems.map(it => {
        const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;
        const eCidadePrincipal = String(it.location).toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      // Ordenação rigorosa por preço
      processedItems.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
        return 0;
      });

      finalResponse.items = processedItems.slice(0, 3);
    }

    return res.status(200).json(finalResponse);

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}