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
            Sua missão é encontrar anúncios REAIS, DIFERENTES e ÚNICOS.

            FILTROS OBRIGATÓRIOS:
            1. LOCALIZAÇÃO: Apenas anúncios em ${cidade} ou região metropolitana imediata. PROIBIDO outras cidades ou países.
            2. ESTADO: PROIBIDO itens com "defeito", "quebrado", "estragado", "sem prato" ou "para conserto".
            3. DIVERSIDADE: Cada item deve ser um anúncio diferente. Não repita o mesmo item.
            4. FRESCURA: Priorize anúncios publicados recentemente (HOJE ou ONTEM).

            Retorne estritamente um JSON no formato: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre as melhores ofertas distintas de ${produto} em ${cidade}.` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    let itemsFinal = [];
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const rawItems = parsed.items || [];

      // --- 1. LIMPEZA, FILTRAGEM E CONVERSÃO NUMÉRICA ---
      const seenTitles = new Set();
      const seenLinks = new Set();
      
      const filtrados = rawItems.filter(it => {
        const titleLower = it.title.toLowerCase();
        const analysisLower = it.analysis.toLowerCase();
        const locationLower = it.location.toLowerCase();
        const linkLower = it.link.toLowerCase();
        
        // Remove duplicados (Título ou Link)
        if (seenTitles.has(titleLower) || seenLinks.has(linkLower)) return false;
        
        // Filtro rígido de defeitos
        const temDefeito = ["defeito", "quebrado", "conserto", "estragado", "peças", "sem prato", "sucata"].some(word => 
          titleLower.includes(word) || analysisLower.includes(word)
        );
        if (temDefeito) return false;

        // Filtro de Localização (Garante que é na cidade certa)
        const cidadeAlvo = cidade.toLowerCase().split(' ')[0];
        if (!locationLower.includes(cidadeAlvo)) return false;

        seenTitles.add(titleLower);
        seenLinks.add(linkLower);
        return true;
      });

      // --- 2. PREPARAÇÃO PARA ORDENAÇÃO ---
      itemsFinal = filtrados.map(it => {
        // Extrai apenas números do preço para permitir ordenação matemática (ex: "R$ 180,00" -> 180)
        const priceNum = parseFloat(it.price.replace(/[^\d,]/g, '').replace(',', '.')) || 999999;
        return {
          ...it,
          price_num: priceNum,
          img: "/placeholder-120x90.png",
          analysis: `✨ Oportunidade Real: ${it.analysis}`
        };
      });

      // --- 3. ORDENAÇÃO: MENOR PREÇO PARA O MAIOR ---
      itemsFinal.sort((a, b) => a.price_num - b.price_num);
    }

    // Retorna os 3 melhores após ordenar e filtrar
    return res.status(200).json({ items: itemsFinal.slice(0, 3) });

  } catch (err) {
    console.error("Erro no Servidor:", err);
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}