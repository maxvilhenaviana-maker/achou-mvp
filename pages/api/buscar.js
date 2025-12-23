export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    // ESTÁGIO 1: Busca Web com o modelo Search Preview
    const searchResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [
          { 
            role: "user", 
            content: `Encontre os 5 melhores anúncios reais e detalhados de "${produto}" em ${cidade} e região metropolitana. Traga o texto completo de cada um.` 
          }
        ],
      }),
    });

    const searchData = await searchResponse.json();
    if (searchData.error) return res.status(500).json({ error: searchData.error.message });
    const rawContent = searchData.choices[0].message.content;

    // ESTÁGIO 2: Filtragem e Inteligência com gpt-5-mini
    const refineResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `Você é um Caçador de Ofertas implacável. Analise os anúncios brutos fornecidos.
            
            SUA MISSÃO:
            1. Filtrar apenas os 3 melhores de "${produto}" em ${cidade}.
            2. EXCLUIR: leilão, sucata, defeitos ou anúncios falsos.
            3. Calcular o "market_average" real da região.
            
            REGRAS DE FORMATAÇÃO:
            - No campo "full_text", mantenha o texto original completo.
            - No campo "location", use "Cidade - Bairro".
            
            Retorne estritamente um JSON:
            {
              "market_average": number,
              "items": [
                { "title", "price", "location", "date", "analysis", "link", "full_text" }
              ]
            }`
          },
          { role: "user", content: `Dados brutos encontrados: ${rawContent}` }
        ],
      }),
    });

    const refineData = await refineResponse.json();
    let content = refineData.choices[0].message.content;
    
    // Processamento do JSON final
    const jsonMatch = content.match(/\{.*\}/s);
    let itemsFinal = [];
    let mediaRegional = 0;

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      mediaRegional = parsed.market_average || 0;

      itemsFinal = (parsed.items || []).map(it => {
        const cleanPrice = String(it.price || "").replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;
        const eCidadePrincipal = String(it.location || "").toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

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