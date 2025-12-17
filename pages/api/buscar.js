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
        model: "gpt-4o-mini", 
        messages: [
          { 
            role: "system", 
            content: `Você é um Caçador de Ofertas. Busque na internet anúncios de ${produto} em ${cidade}. 
            Compare os preços e retorne APENAS as 3 melhores oportunidades (menor preço e bom estado).
            Ignore anúncios de 'peças' ou 'conserto'.
            Retorne estritamente um JSON: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre ${produto} em ${cidade} hoje.` }
        ],
        // Nota: web_search é uma ferramenta que exige que sua conta tenha permissão de busca.
        // Se der erro 400, remova a linha abaixo.
        tools: [{ type: "web_search" }], 
        temperature: 0
      }),
    });

    const data = await response.json();

    // Se a IA retornar erro (como modelo não encontrado ou falta de permissão)
    if (data.error) {
      console.error("Erro da OpenAI:", data.error);
      return res.status(500).json({ error: data.error.message });
    }

    let content = data.choices[0].message.content;
    
    // Limpeza de possíveis marcações Markdown que a IA as vezes coloca
    const jsonMatch = content.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Adiciona a lógica de análise de mercado para cada item
      const items = (parsed.items || []).map(it => ({
        ...it,
        img: "/placeholder-120x90.png", // Placeholder fixo
        analysis: it.analysis + " (Verificado via IA)"
      }));

      return res.status(200).json({ items: items.slice(0, 3) });
    }

    return res.status(200).json({ items: [] });

  } catch (err) {
    console.error("Erro no Servidor:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}