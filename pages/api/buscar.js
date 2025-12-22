export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(apiKey, model, messages) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {

    /* =====================================================
       🔹 CAMADA 1 — COLETA, LIMPEZA E TRIAGEM (gpt-5-nano)
    ===================================================== */
    const layer1 = await callOpenAI(apiKey, "gpt-5-nano", [
      {
        role: "system",
        content: `
        Normalize anúncios de "${produto}" para ${cidade}.
        Tarefas:
        - Normalizar título
        - Extrair preço, estado e localização
        - Detectar duplicidade
        - Classificar: bom | medio | suspeito

        Retorne JSON:
        {
          "items": [
            {
              "title",
              "price",
              "location",
              "date",
              "link",
              "full_text",
              "quality"
            }
          ]
        }`
      },
      {
        role: "user",
        content: `Colete anúncios de ${produto} em ${cidade} e região metropolitana.`
      }
    ]);

    if (layer1.error) return res.status(500).json({ error: layer1.error.message });

    const rawContent1 = layer1.choices[0].message.content;
    const parsedLayer1 = JSON.parse(rawContent1.match(/\{.*\}/s)[0]);
    const cleanItems = (parsedLayer1.items || []).filter(i => i.quality !== "suspeito");

    /* =====================================================
       🔹 CAMADA 2 — PREÇO MÉDIO REGIONAL (gpt-5-mini)
    ===================================================== */
    const layer2 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content: `
        Calcule o preço médio regional ponderado.
        - Ignore outliers extremos
        - Compare com histórico implícito

        Retorne JSON:
        { "market_average": number }
        `
      },
      {
        role: "user",
        content: JSON.stringify(cleanItems)
      }
    ]);

    if (layer2.error) return res.status(500).json({ error: layer2.error.message });

    const mediaRegional = JSON.parse(
      layer2.choices[0].message.content.match(/\{.*\}/s)[0]
    ).market_average || 0;

    /* =====================================================
       🔹 CAMADA 3 — TOP 3 OPORTUNIDADES (gpt-5-mini)
    ===================================================== */
    const layer3 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content: `
        Você é um Caçador de Ofertas implacável na região de ${cidade}.
        Escolha as 3 melhores oportunidades com base em:
        1. Menor preço em bom estado
        2. Preferir cidade principal
        3. Anúncios recentes

        Gere análise curta, clara e objetiva.

        Retorne estritamente JSON:
        {
          "items": [
            {
              "title",
              "price",
              "location",
              "date",
              "analysis",
              "link",
              "full_text"
            }
          ]
        }`
      },
      {
        role: "user",
        content: JSON.stringify(cleanItems)
      }
    ]);

    if (layer3.error) return res.status(500).json({ error: layer3.error.message });

    let content = layer3.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);

    let itemsFinal = [];

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawItems = parsed.items || [];

      itemsFinal = rawItems.map(it => {
        const cleanPrice = String(it.price).replace(/[R$\s.]/g, '').replace(',', '.');
        const priceNum = parseFloat(cleanPrice) || 999999;
        const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

        return {
          ...it,
          price_num: priceNum,
          is_main_city: eCidadePrincipal,
          img: "/placeholder-120x90.png",
          analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
        };
      });

      itemsFinal.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
        return 0;
      });
    }

    const finalItems = itemsFinal.slice(0, 3);
    const media = Math.round(mediaRegional);

    return res.status(200).json({
      items: finalItems,
      precoMedio: media
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}
