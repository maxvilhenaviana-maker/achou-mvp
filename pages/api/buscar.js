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
        // Voltando para o 4o que suporta a ferramenta de navegação estável
        model: "gpt-4o", 
        messages: [
          { 
            role: "system", 
            content: `Você é um Caçador de Ofertas implacável na região de ${cidade}.
            Sua meta é encontrar 3 oportunidades de ouro de "${produto}".

            REGRAS DE LOCALIZAÇÃO:
            - Busque em ${cidade} E TAMBÉM nas cidades da região metropolitana.
            - No campo "location", escreva sempre o nome da cidade e o bairro.

            CRITÉRIOS DE EXCLUSÃO:
            - Proibido: Itens com defeitos, sucata, conserto ou leilão.

            IMPORTANTE:
            Retorne estritamente um JSON:
            {
              "market_average": number,
              "items": [
                {
                  "title",
                  "price",
                  "location",
                  "date",
                  "analysis",
                  "link",
                  "full_text"
                }
              ]
            }`
          },
          { 
            role: "user", 
            content: `Use a navegação web para encontrar os 3 melhores anúncios de ${produto} em ${cidade} e região metropolitana.` 
          }
        ],
        // Ativa a capacidade de pesquisa do modelo
        tools: [{ type: "web_search" }] 
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let itemsFinal = [];
    let mediaRegional = 0;
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawItems = parsed.items || [];
      mediaRegional = parsed.market_average || 0;

      itemsFinal = rawItems.map(it => {
        const cleanPrice = String(it.price || "").replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;
        const loc = String(it.location || "").toLowerCase();
        const eCidadePrincipal = loc.includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: String(it.analysis || "").startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      itemsFinal.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        return a.is_main_city ? -1 : 1;
      });
    }

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3),
      precoMedio: Math.round(mediaRegional)
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}