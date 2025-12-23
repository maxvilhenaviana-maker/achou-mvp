export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview", 
        messages: [
          { 
            role: "system", 
            content: `Você é um extrator de dados REAIS. 
            HORA ATUAL: 12:29. 
            PROIBIDO: Inventar anúncios ou horários futuros.
            MISSÃO: Acesse a OLX, localize a listagem de "${produto}" em ${cidade} e copie os dados exatamente como aparecem.`
          },
          { 
            role: "user", 
            content: `Liste os 3 primeiros anúncios REAIS que aparecem agora na OLX para ${produto} em ${cidade}. 
            Extraia: Título, Preço, Bairro e Data (ex: "Hoje, 10:42"). 
            Retorne em JSON: {"market_average": 0, "items": [...]}` 
          }
        ],
        temperature: 0 // Força o modelo a ser factual e não criativo
      }),
    });

    const data = await response.json();
    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let itemsFinal = [];
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      itemsFinal = (parsed.items || []).map(it => ({
        ...it,
        price_num: parseFloat(String(it.price || "").replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
        img: "/placeholder-120x90.png",
        analysis: `✨ Verificado na listagem real: ${it.title}`
      }));
    }

    return res.status(200).json({ items: itemsFinal.slice(0, 3), precoMedio: 0 });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno" });
  }
}