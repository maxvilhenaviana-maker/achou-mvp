export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(apiKey, model, messages) {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages
    }),
  });

  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

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
Você coleta anúncios de "${produto}" na região de ${cidade}.
Normalize e limpe os dados.

Tarefas:
- Normalizar título
- Extrair preço, estado e localização
- Detectar duplicidade
- Classificar qualidade: bom | medio | suspeito

REGRAS:
- Retorne APENAS JSON puro
- Não use markdown
- Não escreva texto fora do JSON

Formato:
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
}
        `
      },
      {
        role: "user",
        content: `Colete anúncios de ${produto} em ${cidade} e região metropolitana.`
      }
    ]);

    if (layer1.error) {
      return res.status(500).json({ error: layer1.error.message });
    }

    const raw1 = layer1.choices[0].message.content;
    const match1 = raw1.match(/\{[\s\S]*\}/);

    if (!match1) {
      console.error("Camada 1 sem JSON:", raw1);
      return res.status(500).json({ error: "Falha na camada 1" });
    }

    const parsedLayer1 = JSON.parse(match1[0]);
    const cleanItems = (parsedLayer1.items || []).filter(
      item => item.quality !== "suspeito"
    );

    if (cleanItems.length === 0) {
      return res.status(200).json({ items: [], precoMedio: 0 });
    }

    /* =====================================================
       🔹 CAMADA 2 — PREÇO MÉDIO REGIONAL (gpt-5-mini)
    ===================================================== */
    const layer2 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content: `
Calcule o preço médio regional ponderado.
Ignore outliers extremos.

REGRAS:
- Retorne APENAS JSON puro
- Não use markdown

Formato:
{ "market_average": number }
        `
      },
      {
        role: "user",
        content: JSON.stringify(cleanItems)
      }
    ]);

    if (layer2.error) {
      return res.status(500).json({ error: layer2.error.message });
    }

    const raw2 = layer2.choices[0].message.content;
    const match2 = raw2.match(/\{[\s\S]*\}/);

    if (!match2) {
      console.error("Camada 2 sem JSON:", raw2);
      return res.status(500).json({ error: "Falha na camada 2" });
    }

    const mediaRegional = JSON.parse(match2[0]).market_average || 0;

    /* =====================================================
       🔹 CAMADA 3 — TOP 3 OPORTUNIDADES (gpt-5-mini)
    ===================================================== */
    const layer3 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content: `
Você é um Caçador de Ofertas implacável na região de ${cidade}.

CRITÉRIOS:
1. Menor preço em bom estado
2. Preferir cidade principal
3. Preferir anúncios recentes

REGRAS:
- Retorne APENAS JSON puro
- Não use markdown
- Gere análise curta, clara e objetiva

Formato:
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
}
        `
      },
      {
        role: "user",
        content: JSON.stringify(cleanItems)
      }
    ]);

    if (layer3.error) {
      return res.status(500).json({ error: layer3.error.message });
    }

    const raw3 = layer3.choices[0].message.content;
    const match3 = raw3.match(/\{[\s\S]*\}/);

    if (!match3) {
      console.error("Camada 3 sem JSON:", raw3);
      return res.status(500).json({ error: "Falha na camada 3" });
    }

    const parsed = JSON.parse(match3[0]);
    const rawItems = parsed.items || [];

    /* =====================================================
       🔹 PÓS-PROCESSAMENTO (SEU CÓDIGO ORIGINAL)
    ===================================================== */
    let itemsFinal = rawItems.map(it => {
      const cleanPrice = String(it.price)
        .replace(/[R$\s.]/g, '')
        .replace(',', '.');

      const priceNum = parseFloat(cleanPrice) || 999999;
      const eCidadePrincipal = it.location
        .toLowerCase()
        .includes(cidade.toLowerCase().split(' ')[0]);

      return {
        ...it,
        price_num: priceNum,
        is_main_city: eCidadePrincipal,
        img: "/placeholder-120x90.png",
        analysis: it.analysis.startsWith("✨")
          ? it.analysis
          : `✨ ${it.analysis}`
      };
    });

    itemsFinal.sort((a, b) => {
      if (a.price_num !== b.price_num) {
        return a.price_num - b.price_num;
      }
      if (a.is_main_city !== b.is_main_city) {
        return a.is_main_city ? -1 : 1;
      }
      return 0;
    });

    return res.status(200).json({
      items: itemsFinal.slice(0, 3),
      precoMedio: Math.round(mediaRegional)
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Erro interno",
      details: err.message
    });
  }
}
