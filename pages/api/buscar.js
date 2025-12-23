export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    // ESTÁGIO 1: O "Minerador" busca resultados REAIS e INDIVIDUAIS
    const searchResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [{ 
          role: "user", 
          content: `Acesse a OLX e Mercado Livre. Liste 10 anúncios INDIVIDUAIS e RECENTES de ${produto} em ${cidade}. 
          Para cada um, extraia: Título, Preço, Bairro exato, Data da postagem e Link.` 
        }]
      }),
    });

    const searchData = await searchResponse.json();
    const rawContent = searchData.choices?.[0]?.message?.content || "";

    // ESTÁGIO 2: O "Estrategista" (gpt-5-mini) aplica o filtro implacável
    const refineResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em análise de mercado em ${cidade}.
            Analise os anúncios brutos fornecidos e selecione APENAS os 3 melhores.

            CRITÉRIOS OBRIGATÓRIOS:
            - Localização: Deve conter o BAIRRO de ${cidade}.
            - Data: Deve ser a data real da postagem informada no anúncio.
            - Exclusão: Delete qualquer item que pareça anúncio genérico, loja com "várias unidades", leilão ou sucata.
            - Cálculo: Baseie o "market_average" apenas em itens em bom estado.

            Retorne estritamente JSON:
            {
              "market_average": number,
              "items": [
                { "title", "price", "location", "date", "analysis", "link", "full_text" }
              ]
            }`
          },
          { role: "user", content: `Dados da busca: ${rawContent}` }
        ],
      }),
    });

    const refineData = await refineResponse.json();
    const content = refineData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let itemsFinal = [];
    let mediaRegional = 0;

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      mediaRegional = parsed.market_average || 0;
      itemsFinal = (parsed.items || []).map(it => ({
        ...it,
        price_num: parseFloat(String(it.price || "").replace(/[R$\s.]/g, '').replace(',', '.')) || 999999,
        img: "/placeholder-120x90.png",
        analysis: String(it.analysis || "").startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
      }));

      itemsFinal.sort((a, b) => a.price_num - b.price_num);
    }

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3), 
      precoMedio: Math.round(mediaRegional) 
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}