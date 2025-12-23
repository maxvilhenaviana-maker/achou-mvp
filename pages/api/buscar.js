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
        model: "gpt-5-mini", 
        // Adicionamos 'reasoning' ou garantimos que o prompt exija a pesquisa
        messages: [
          { 
            role: "system", 
            content: `Você é um Caçador de Ofertas profissional. 
            IMPORTANTE: Você DEVE realizar uma busca em tempo real na internet para encontrar anúncios atuais.
            
            Sua meta é encontrar 3 oportunidades de ouro de "${produto}" em ${cidade} e região.

            REGRAS:
            - Busque especificamente em sites de classificados (OLX, Mercado Livre, etc).
            - Exclua: leilão, sucata, defeito.
            - Retorne APENAS o JSON no formato:
            {
              "market_average": number,
              "items": [
                { "title", "price", "location", "date", "analysis", "link", "full_text" }
              ]
            }`
          },
          { 
            role: "user", 
            content: `Pesquise agora e encontre 3 anúncios reais de ${produto} em ${cidade} e região metropolitana.` 
          }
        ],
        // Dependendo da disponibilidade na sua conta, alguns modelos exigem este parâmetro para busca:
        // tools: [{ type: "web_search" }] 
      }),
    });

    const data = await response.json();
    
    // Log para debug (aparecerá no terminal da Vercel)
    console.log("Resposta OpenAI:", JSON.stringify(data));

    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    
    // Melhoria no Regex para capturar o JSON mesmo com markdown ```json ... ```
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let itemsFinal = [];
    let mediaRegional = 0;
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawItems = parsed.items || [];
      mediaRegional = parsed.market_average || 0;

      itemsFinal = rawItems.map(it => {
        // Limpeza de preço mais robusta
        const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 0;
        const eCidadePrincipal = it.location?.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: !!eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: it.analysis?.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      // Só ordena se houver itens
      if (itemsFinal.length > 0) {
        itemsFinal.sort((a, b) => a.price_num - b.price_num);
      }
    }

    // Se após todo o processo a lista estiver vazia
    if (itemsFinal.length === 0) {
      console.warn("Nenhum item processado do conteúdo:", content);
    }

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3),
      precoMedio: Math.round(mediaRegional)
    });

  } catch (err) {
    console.error("Erro no Handler:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}