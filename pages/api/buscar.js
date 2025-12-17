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
            content: `Você é um Especialista em Compras e Caçador de Ofertas implacável.
            Sua tarefa é encontrar as 3 melhores oportunidades reais de "${produto}" em "${cidade}".

            REGRAS CRÍTICAS DE FILTRO:
            1. PROIBIDO: Não retorne NADA que mencione "defeito", "estragado", "para conserto", "para retirar peças", "quebrado" ou "não liga".
            2. RECENTES PRIMEIRO: Priorize anúncios publicados HOJE ou ONTEM.
            3. MELHOR PREÇO: Entre produtos em bom estado e recentes, escolha sempre os 3 de menor preço.
            4. VERIFICAÇÃO: Compare pelo menos 10 anúncios antes de selecionar os 3 finais.

            Retorne estritamente um JSON no formato: 
            {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Procure anúncios de ${produto} em ${cidade}. Ignore sucata/defeitos e selecione os 3 melhores preços de itens recentes.` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    let items = [];
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      items = (parsed.items || []).map(it => ({
        ...it,
        img: "/placeholder-120x90.png",
        // Adicionamos uma tag visual de análise para o usuário
        analysis: `✨ Oportunidade: ${it.analysis}`
      }));

      // Double-check de segurança no código: remover qualquer item que a IA deixou passar com "defeito"
      items = items.filter(it => 
        !it.title.toLowerCase().includes("defeito") && 
        !it.analysis.toLowerCase().includes("defeito") &&
        !it.title.toLowerCase().includes("conserto")
      );
    }

    return res.status(200).json({ items: items.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}