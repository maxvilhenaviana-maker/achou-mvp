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
            content: `Você é um Caçador de Ofertas implacável em ${cidade}.
            Sua meta é encontrar 3 oportunidades de ouro de "${produto}".

            CRITÉRIOS DE EXCLUSÃO (PROIBIDO):
            - Itens com furo, ferrugem, amassados ou defeitos técnicos.
            - Anúncios de "conserto", "retirada de peças" ou "sucata".
            - Itens localizados fora de ${cidade} ou região próxima.

            CRITÉRIOS DE SELEÇÃO:
            1. Encontre pelo menos 8 anúncios e compare-os.
            2. Selecione os 3 que tiverem o menor preço, MAS que estejam em BOM ESTADO e sejam RECENTES.
            3. Se houver empate de preço, priorize o anúncio mais novo.

            Retorne estritamente um JSON: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre os 3 melhores anúncios de ${produto} em ${cidade}. Não aceite itens com defeito ou ferrugem.` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    let itemsFinal = [];
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawItems = parsed.items || [];

      // 1. Limpeza e Extração Numérica para Ordenação
      itemsFinal = rawItems.map(it => {
        // Limpa o preço para garantir que o sort funcione
        const cleanPrice = it.price.replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;

        return {
          ...it,
          price_num: priceNum,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      // 2. Ordenação Final por Preço (Garante o menor valor no topo)
      itemsFinal.sort((a, b) => a.price_num - b.price_num);
    }

    // Retorna os 3 melhores (já ordenados)
    return res.status(200).json({ items: itemsFinal.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}