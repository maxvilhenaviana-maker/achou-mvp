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
            content: `Você é um Caçador de Ofertas em ${cidade}.
            Encontre 3 anúncios Reais e Diferentes de ${produto}.
            REGRAS: Ignore itens estragados ou para peças.
            Retorne um JSON no formato: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `3 melhores ofertas de ${produto} em ${cidade} hoje.` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let items = parsed.items || [];

      // 1. Tratamento de Dados (sem deletar itens por erro de preço)
      items = items.map(it => {
        // Limpa o preço: remove "R$", espaços e pontos de milhar, troca vírgula por ponto
        let cleanPrice = it.price.replace(/[R$\s.]/g, '').replace(',', '.');
        let priceNum = parseFloat(cleanPrice) || 0;

        return {
          ...it,
          price_num: priceNum,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      // 2. Ordenação por Preço (Menor para Maior)
      // Usamos uma lógica que lida com zeros (colocando-os no final se necessário)
      items.sort((a, b) => {
        if (a.price_num === 0) return 1;
        if (b.price_num === 0) return -1;
        return a.price_num - b.price_num;
      });

      return res.status(200).json({ items: items.slice(0, 3) });
    }

    return res.status(200).json({ items: [] });

  } catch (err) {
    console.error("Erro no processamento:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}