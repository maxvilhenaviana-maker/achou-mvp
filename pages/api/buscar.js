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
            content: `Você é um Caçador de Ofertas implacável especializado EXCLUSIVAMENTE na região de ${cidade}.
            Sua meta é encontrar 3 oportunidades de ouro de "${produto}".

            REGRAS DE LOCALIZAÇÃO (OBRIGATÓRIO):
            - É PROIBIDO trazer anúncios de outros estados ou cidades fora da região metropolitana de ${cidade}.
            - Foque APENAS em ${cidade} e cidades vizinhas imediatas (Ex: se for BH, aceite apenas Contagem, Betim, Nova Lima, Santa Luzia, Ibirité, Sabará, Vespasiano).
            - Se encontrar um item barato em outro estado, IGNORE-O. O usuário não quer pagar frete ou viajar para buscar.

            CRITÉRIOS DE EXCLUSÃO (PROIBIDO - TOLERÂNCIA ZERO):
            - PROIBIDO: Itens de leilão, editais ou sites de leiloeiros (Sodré Santoro, Copart, Milan, Freitas, etc). 
            - PROIBIDO: Pesquisar em domínios ou títulos que contenham "leilao", "bid", "auction" ou "soldo".
            - Itens com furo, ferrugem, amassados ou defeitos técnicos.
            - Anúncios de "conserto", "retirada de peças" ou "sucata".

            CRITÉRIOS DE SELEÇÃO E DESEMPATE:
            1. Prioridade total para o MENOR PREÇO dentro da região permitida.
            2. Em caso de empate no preço, escolha o anúncio que estiver dentro de ${cidade} em vez das cidades vizinhas.
            3. Se o preço e a cidade forem iguais, priorize o mais recente.

            PESQUISA DE MERCADO:
            - Analise o preço médio praticado para "${produto}" especificamente na região de ${cidade}, considerando diversos anúncios locais.
            - Forneça esse valor médio regional no campo "market_average".

            Retorne estritamente um JSON: {"market_average": number, "items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre 3 anúncios reais de ${produto} LOCALIZADOS EM ${cidade} ou cidades vizinhas. Não aceite leilão e não traga nada de fora da região de ${cidade}.` }
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