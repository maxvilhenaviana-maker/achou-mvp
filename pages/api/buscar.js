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

            REGRAS DE LOCALIZAÇÃO:
            - Busque em ${cidade} E TAMBÉM nas cidades da região metropolitana.
            - No campo "location", escreva sempre o nome da cidade e o bairro.

            CRITÉRIOS DE EXCLUSÃO (PROIBIDO — REGRA ABSOLUTA):
            - Itens com defeitos, sucata, conserto ou leilão.
            - Itens de sites de leilão, mesmo sem a palavra "leilão".

            CRITÉRIOS DE SELEÇÃO:
            1. Menor preço em bom estado.
            2. Preferir cidade principal.
            3. Preferir anúncios mais recentes.

            PESQUISA DE MERCADO:
            - Calcule o preço médio regional e informe em "market_average".

            IMPORTANTE:
            - No campo "full_text", traga o TEXTO COMPLETO ORIGINAL do anúncio,
              exatamente como publicado, sem resumo ou reescrita.

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
            content: `Encontre os 3 melhores anúncios de ${produto} em ${cidade} e região metropolitana.` 
          }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    let itemsFinal = [];
    let mediaRegional = 0;
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawItems = parsed.items || [];
      mediaRegional = parsed.market_average || 0;

      itemsFinal = rawItems.map(it => {
        const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;
        const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      itemsFinal.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
        return 0;
      });
    }

    const finalItems = itemsFinal.slice(0, 3);
    const media = Math.round(mediaRegional);

    return res.status(200).json({ 
      items: finalItems,
      precoMedio: media
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}

}