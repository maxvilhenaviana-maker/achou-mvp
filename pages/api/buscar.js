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
            content: `Você é um radar de preços baixos em ${cidade}. Sua única missão é encontrar as PECHINCHAS reais de "${produto}".

            DIRETRIZES DE VALOR:
            1. FOCO NO MENOR PREÇO: Vasculhe a internet por anúncios com valores abaixo da média de mercado.
            2. QUALIDADE MÍNIMA: Ignore sucatas, leilões, itens com ferrugem ou defeitos.
            3. GEOGRAFIA: Busque em ${cidade} e cidades vizinhas (Contagem, Betim, etc).
            4. FRESCURA: Priorize o que foi postado HOJE.

            Retorne apenas o JSON puro: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Quais os 3 menores preços de ${produto} em bom estado em ${cidade} e região hoje?` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let itemsFinal = [];
    
    if (jsonMatch) {
      try {
        const cleanJson = jsonMatch[0].replace(/\n/g, " ").replace(/\r/g, " ");
        const parsed = JSON.parse(cleanJson);
        let rawItems = parsed.items || [];

        itemsFinal = rawItems.map(it => {
          // Extração numérica rigorosa para garantir a ordenação por preço
          const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
          const priceNum = parseFloat(cleanPrice) || 999999;
          
          // Critério de desempate: é da cidade principal?
          const isMain = String(it.location).toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

          return {
            ...it,
            price_num: priceNum,
            is_main_city: isMain,
            img: "/placeholder-120x90.png",
            analysis: String(it.analysis).startsWith("✨") ? it.analysis : `✨ Oportunidade: ${it.analysis}`
          };
        });

        // ORDENAÇÃO MATEMÁTICA: O menor preço REAL ganha o topo.
        itemsFinal.sort((a, b) => {
          if (a.price_num !== b.price_num) return a.price_num - b.price_num;
          if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
          return 0;
        });

      } catch (e) {
        return res.status(200).json({ items: [] });
      }
    }

    return res.status(200).json({ items: itemsFinal.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}