export const config = { api: { bodyParser: true }, runtime: "nodejs" };

// CORREÇÃO: Endpoint correto da API de Chat
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(body, apiKey) {
  const resp = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  
  return await resp.json();
}

function normalizeItems(rawItems) {
  if (!rawItems || !Array.isArray(rawItems)) return [];

  const itemsWithPrice = rawItems
    .map((it) => {
      const priceStr = String(it.price || "");
      const priceNum = parseFloat(priceStr.replace(/[^\d,]/g, "").replace(",", ".")) || null;

      return {
        title: it.title || "Sem título",
        price: priceStr,
        price_num: priceNum,
        location: it.location || "",
        date: it.date || "",
        analysis: it.analysis || "",
        link: it.link || "#",
        img: "/placeholder-120x90.png",
      };
    })
    .filter((it) => it.price_num !== null)
    // ORDENAÇÃO: Garante que os mais baratos apareçam primeiro no seu app
    .sort((a, b) => a.price_num - b.price_num);

  const prices = itemsWithPrice.map(it => it.price_num);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  return itemsWithPrice.map(it => ({
    ...it,
    analysis: `${it.analysis} (Média de mercado: R$${avgPrice.toFixed(2)})`
  }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    const requestBody = {
      model: "gpt-4o-mini", // O modelo mais barato
      messages: [
        { 
          role: "system", 
          content: `Você é um 'Caçador de Ofertas' profissional. Sua missão é varrer a internet (OLX, Mercado Livre, Facebook) em busca de anúncios em ${cidade}. 
          CRITÉRIO DE SELEÇÃO:
          1. Encontre pelo menos 10 anúncios.
          2. Compare os preços entre eles.
          3. Filtre e retorne APENAS os 3 que tiverem o menor preço, mas que estejam em bom estado.
          4. Ignore anúncios que sejam apenas 'peças' ou 'conserto' a menos que solicitado.
          Retorne estritamente um JSON no formato: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}`
        },
        { role: "user", content: `Encontre as 3 melhores oportunidades de "${produto}" em "${cidade}" hoje.` }
      ],
      // Habilita a busca na internet
      tools: [{ type: "web_search" }], 
      temperature: 0.2 // Menor temperatura = mais precisão nos dados
    };

    const data = await callOpenAI(requestBody, apiKey);
    
    // Extração do JSON da resposta da IA
    let items = [];
    const content = data.choices?.[0]?.message?.content;
    
    if (content) {
      const jsonMatch = content.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        items = parsed.items || [];
      }
    }

    const normalized = normalizeItems(items);
    return res.status(200).json({ items: normalized.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Erro ao processar busca", details: err.message });
  }
}