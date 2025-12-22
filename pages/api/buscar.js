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
            - Busque em ${cidade} E TAMBÉM nas cidades da região metropolitana (ex: se for BH, busque em Contagem, Betim, Nova Lima, etc).
            - No campo "location", escreva sempre o nome da cidade e o bairro.

            CRITÉRIOS DE EXCLUSÃO (PROIBIDO — REGRA ABSOLUTA):
            - Itens com furo, ferrugem, amassados ou defeitos técnicos.
            - Anúncios de "conserto", "retirada de peças" ou "sucata".
            - QUALQUER item de leilão, judicial ou extrajudicial.
            - QUALQUER anúncio originado de sites, plataformas ou marketplaces de leilão, 
              mesmo que o texto do anúncio NÃO contenha a palavra "leilão".
            - Se houver QUALQUER indício de que o site funciona no modelo de leilão, 
              o item DEVE ser descartado imediatamente e NÃO pode aparecer na resposta.

            CRITÉRIOS DE SELEÇÃO E DESEMPATE:
            1. Prioridade total para o MENOR PREÇO em bom estado.
            2. Em caso de empate no preço, escolha o anúncio que estiver dentro de ${cidade} em vez das cidades vizinhas.
            3. Se o preço e a cidade forem iguais, priorize o mais recente.

            PESQUISA DE MERCADO:
            - Analise o preço médio praticado para "${produto}" em toda a região de ${cidade} e arredores, considerando diversos anúncios (não apenas os 3 selecionados).
            - Forneça esse valor médio regional no campo "market_average".

            Retorne estritamente um JSON: {"market_average": number, "items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { 
            role: "user", 
            content: `Encontre os 3 melhores anúncios de ${produto} em ${cidade} e região metropolitana. 
            Não aceite itens com defeito, ferrugem ou provenientes de leilão ou sites de leilão.` 
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
        // 1. Limpeza de Preço
        const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;

        // 2. Identifica se o item é da cidade principal para o desempate
        const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      // --- LÓGICA DE ORDENAÇÃO PADRÃO (SEU CÓDIGO) ---
      itemsFinal.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
        return 0;
      });
    }

    const finalItems = itemsFinal.slice(0, 3);

    // --- CÁLCULO DO PREÇO MÉDIO (Alterado para refletir a Região) ---
    // Agora utilizamos a média regional fornecida pela análise da IA
    const media = Math.round(mediaRegional);

    return res.status(200).json({ 
      items: finalItems,
      precoMedio: media
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}
