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
            content: `Você é um Caçador de Ofertas profissional em ${cidade}.
            Sua missão é encontrar 3 anúncios REAIS, DIFERENTES e ÚNICOS.

            FILTROS OBRIGATÓRIOS:
            1. LOCALIZAÇÃO: Apenas anúncios em ${cidade} ou região metropolitana imediata. PROIBIDO outras cidades ou países.
            2. ESTADO: PROIBIDO itens com "defeito", "quebrado", "estragado", "sem prato" ou "para conserto".
            3. DIVERSIDADE: Cada um dos 3 itens deve ser um anúncio diferente. Não repita o mesmo item.
            4. FRESCURA: Priorize anúncios publicados HOJE ou ONTEM.

            Retorne estritamente um JSON: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre 3 ofertas distintas de ${produto} em ${cidade}.` }
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
      const rawItems = parsed.items || [];

      // --- LÓGICA DE LIMPEZA E DESDUPLICAÇÃO ---
      const seenTitles = new Set();
      
      items = rawItems.filter(it => {
        const titleLower = it.title.toLowerCase();
        const analysisLower = it.analysis.toLowerCase();
        const locationLower = it.location.toLowerCase();
        
        // 1. Remove duplicados (mesmo título ou título muito similar)
        if (seenTitles.has(titleLower)) return false;
        seenTitles.add(titleLower);

        // 2. Filtro rígido de palavras proibidas (defeitos)
        const temDefeito = ["defeito", "quebrado", "conserto", "estragado", "peças", "sem prato"].some(word => 
          titleLower.includes(word) || analysisLower.includes(word)
        );
        if (temDefeito) return false;

        // 3. Garante que a cidade está na localização (evita Açores/Portugal)
        const cidadeAlvo = cidade.toLowerCase().split(' ')[0]; // pega o primeiro nome da cidade
        if (!locationLower.includes(cidadeAlvo)) return false;

        return true;
      });
    }

    // Retorna os 3 primeiros que passaram nos filtros
    return res.status(200).json({ items: items.slice(0, 3).map(it => ({
      ...it,
      img: "/placeholder-120x90.png",
      analysis: `✨ Oportunidade Real: ${it.analysis}`
    }))});

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}