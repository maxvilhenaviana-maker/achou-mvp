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
            content: `Você é um Caçador de Ofertas implacável na região de ${cidade}.
            Sua meta é encontrar 3 oportunidades de ouro de "${produto}".

            CRITÉRIOS DE EXCLUSÃO (OBRIGATÓRIO):
            - PROIBIDO: Itens de LEILÃO ou "lance inicial". Apenas venda direta.
            - PROIBIDO: Itens com furo, ferrugem ou defeitos.
            - PROIBIDO: Anúncios de "conserto" ou "peças".

            REGRAS DE SELEÇÃO:
            1. Busque em ${cidade} e cidades vizinhas (região metropolitana).
            2. Selecione os 3 menores preços em bom estado.
            3. Em caso de empate de preço, coloque o anúncio de ${cidade} no topo.

            Retorne um JSON: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre 3 ofertas de ${produto} em ${cidade} e região. Ignore leilões e defeitos.` }
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

      // Processamento sem descartar itens (para evitar lista vazia)
      itemsFinal = rawItems.map(it => {
        const cleanPrice = it.price.replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;
        
        // Verifica se é a cidade principal para critério de desempate
        const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      // ORDENAÇÃO: 1º Preço, 2º Cidade Principal
      itemsFinal.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
        return 0;
      });
    }

    return res.status(200).json({ items: itemsFinal.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}