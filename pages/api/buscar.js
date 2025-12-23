export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    // ESTÁGIO 1: O "Varredor" busca a lista REAL de anúncios
    const searchResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [{ 
          role: "user", 
          content: `Acesse sites de classificados (como OLX). Liste EXATAMENTE os 15 anúncios mais recentes de "${produto}" em ${cidade}. 
          Para cada um, extraia obrigatoriamente: Título exato, Preço, Bairro, Data/Hora da postagem e o Link direto.` 
        }]
      }),
    });

    const searchData = await searchResponse.json();
    const rawContent = searchData.choices?.[0]?.message?.content || "";

    // ESTÁGIO 2: O "Analista gpt-5" filtra e seleciona as oportunidades de ouro
    const refineResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `Você é um analista de dados implacável em ${cidade}. 
            Analise a lista bruta de anúncios e selecione os 3 melhores.

            REGRAS ABSOLUTAS:
            - Localização: Deve informar "Cidade - Bairro" (Ex: Belo Horizonte - Gutierrez).
            - Data: Informe o dia e horário exato citado (Ex: Hoje, 10:42).
            - Qualidade: Descarte "várias opções", anúncios de lojas profissionais genéricas ou itens com defeito.
            - Preço Médio: Calcule o "market_average" com base em itens similares em bom estado.

            Retorne estritamente JSON:
            {
              "market_average": number,
              "items": [
                { "title", "price", "location", "date", "analysis", "link", "full_text" }
              ]
            }`
          },
          { role: "user", content: `Dados extraídos: ${rawContent}` }
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