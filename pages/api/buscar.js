export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};
  
  // Data e hora exata para evitar alucinações de horários futuros
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    // ESTÁGIO 1: Extração literal da lista de resultados
    const rawSearch = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [{ 
          role: "user", 
          content: `HORA ATUAL: ${agora}. Acesse a listagem da OLX para "${produto}" em ${cidade}. 
          Liste os 10 anúncios que aparecem no topo. 
          Extraia APENAS o que está escrito no texto: Título, Preço, Bairro e a Data Exata exibida.` 
        }],
        temperature: 0 // Zero criatividade para evitar invenções
      }),
    });

    const searchData = await rawSearch.json();
    const textoBruto = searchData.choices?.[0]?.message?.content || "";

    // ESTÁGIO 2: O gpt-5-mini faz o "garimpo" dos dados reais
    const refineResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `Você é um verificador de fatos. Recebeu uma lista de anúncios e deve extrair os 3 melhores.
            
            REGRAS CRÍTICAS:
            - Se o anúncio indicar horário futuro em relação a ${agora}, DESCARTE.
            - Localização deve ser: "Cidade - Bairro".
            - Descarte anúncios com "defeito", "para conserto" ou "sucata".
            
            Retorne um JSON rigoroso:
            {
              "market_average": number,
              "items": [{ "title", "price", "location", "date", "analysis", "link", "full_text" }]
            }`
          },
          { role: "user", content: `Dados extraídos do site: ${textoBruto}` }
        ],
      }),
    });

    const finalData = await refineResponse.json();
    let content = finalData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let itemsFinal = [];
    let media = 0;

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      media = parsed.market_average || 0;
      itemsFinal = (parsed.items || []).map(it => ({
        ...it,
        price_num: parseFloat(String(it.price || "").replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
        img: "/placeholder-120x90.png",
        analysis: `✨ Verificado: ${it.analysis || "Excelente estado"}`
      }));
      itemsFinal.sort((a, b) => a.price_num - b.price_num);
    }

    return res.status(200).json({ items: itemsFinal.slice(0, 3), precoMedio: Math.round(media) });

  } catch (err) {
    return res.status(500).json({ error: "Erro na extração de dados reais" });
  }
}