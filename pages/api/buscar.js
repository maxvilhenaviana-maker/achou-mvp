export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};
  const dataHoje = new Date().toLocaleDateString('pt-BR');

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
            content: `Você é um radar de oportunidades de ouro (barganhas). Hoje é ${dataHoje}.
            Busque anúncios de "${produto}" em "${cidade}" e arredores.

            REGRAS DE OURO:
            1. DIVERSIDADE: É proibido retornar o mesmo anúncio ou itens com preços iguais. Ache 3 ofertas DISTINTAS.
            2. FOCO EM DESAPEGO: Priorize itens usados/seminovos (OLX, Facebook, Mercado Livre) onde o preço é muito abaixo do novo.
            3. SCORE REALISTA: 
               - Nota 90-100: Apenas para preços realmente abaixo da média.
               - Nota 50: Preço normal de mercado.
               - Se o preço for ruim, dê nota baixa.
            4. LINKS: Traga apenas links funcionais e reais.

            Retorne estritamente JSON:
            {
              "market_average": 0,
              "items": [
                {"title": "", "price": "", "location": "", "analysis": "", "score": 0, "link": ""}
              ]
            }` 
          },
          { role: "user", content: `Quero 3 oportunidades reais e diferentes de ${produto} em ${cidade}. Ignore preços de lojas grandes se estiverem caros.` }
        ],
        // 'temperature' removida para evitar erro de incompatibilidade com este modelo
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "Falha na estrutura de dados da IA." });
    
    const parsed = JSON.parse(jsonMatch[0]);
    let rawItems = parsed.items || [];

    // --- FILTRO ANTIDUPLICIDADE NO CÓDIGO ---
    const seen = new Set();
    const uniqueItems = [];

    for (const item of rawItems) {
      // Cria uma chave única baseada no título e preço para evitar clones
      const uniqueKey = `${item.title}-${item.price}`.toLowerCase().replace(/\s/g, '');
      
      if (!seen.has(uniqueKey) && uniqueItems.length < 3) {
        seen.add(uniqueKey);
        
        const priceNum = parseFloat(String(item.price).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
        
        uniqueItems.push({
          ...item,
          price_num: priceNum,
          img: "/placeholder-120x90.png",
          // Garante que a nota e o motivo estejam claros
          analysis: `Nota: ${item.score}/100. ${item.analysis}`
        });
      }
    }

    // Ordena pela melhor nota
    uniqueItems.sort((a, b) => b.score - a.score);

    return res.status(200).json({ 
      items: uniqueItems,
      precoMedio: parsed.market_average || 0
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno no servidor", details: err.message });
  }
}