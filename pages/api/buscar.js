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
        // 1. Usamos o modelo que já faz busca nativamente
        model: "gpt-4o-mini-search-preview", 
        messages: [
          { 
            role: "system", 
            content: `Você é um Caçador de Ofertas. Pesquise na internet anúncios reais de ${produto} em ${cidade}. 
            Compare os preços encontrados e selecione APENAS os 3 melhores (menor preço e bom estado).
            Retorne estritamente um JSON: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Quais as 3 melhores ofertas de ${produto} em ${cidade} hoje?` }
        ],
        // 2. REMOVEMOS 'tools' e 'temperature' para evitar o erro 400
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Erro detalhado da OpenAI:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let content = data.choices[0].message.content;
    
    // Limpeza de Markdown (caso a IA coloque ```json ... ```)
    const jsonMatch = content.match(/\{.*\}/s);
    let items = [];
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      items = (parsed.items || []).map(it => ({
        ...it,
        img: "/placeholder-120x90.png",
        analysis: it.analysis || "Oferta encontrada via busca em tempo real."
      }));
    }

    return res.status(200).json({ items: items.slice(0, 3) });

  } catch (err) {
    console.error("Erro no Servidor:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}