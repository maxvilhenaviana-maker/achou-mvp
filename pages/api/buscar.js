export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(apiKey, model, messages) {
  const r = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  });
  return r.json();
}

function extractJSON(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  return JSON.parse(m[0]);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

  try {
    /* CAMADA 1 */
    const l1 = await callOpenAI(apiKey, "gpt-5-nano", [
      {
        role: "system",
        content:
          'Colete anúncios de "' + produto + '" em ' + cidade +
          '. Retorne APENAS JSON: { "items":[{ "title","price","location","date","link","full_text","quality"}] } ' +
          'quality deve ser bom, medio ou suspeito. Marque suspeito SOMENTE se houver defeito explícito ou golpe.'
      },
      { role: "user", content: "Buscar anúncios" }
    ]);

    const j1 = extractJSON(l1.choices[0].message.content);
    if (!j1 || !j1.items) {
      return res.status(500).json({ error: "Falha camada 1" });
    }

    const cleanItems = j1.items.filter(
      i => i.quality === "bom" || i.quality === "medio"
    );

    if (cleanItems.length === 0) {
      return res.status(200).json({ items: [], precoMedio: 0 });
    }

    /* CAMADA 2 */
    const l2 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content:
          'Calcule preço médio regional. Retorne APENAS JSON: { "market_average": number }'
      },
      { role: "user", content: JSON.stringify(cleanItems) }
    ]);

    const j2 = extractJSON(l2.choices[0].message.content);
    if (!j2) {
      return res.status(500).json({ error: "Falha camada 2" });
    }

    const mediaRegional = j2.market_average || 0;

    /* CAMADA 3 */
    const l3 = await callOpenAI(apiKey, "gpt-5-mini", [
      {
        role: "system",
        content:
          'Escolha as 3 melhores oportunidades. Retorne APENAS JSON: { "items":[{ "title","price","location","date","analysis","link","full_text"}] }'
      },
      { role: "user", content: JSON.stringify(cleanItems) }
    ]);

    const j3 = extractJSON(l3.choices[0].message.content);
    if (!j3 || !j3.items) {
      return res.status(500).json({ error: "Falha camada 3" });
    }

    const itemsFinal = j3.items.map(it => {
      const p = String(it.price).replace(/[R$\s.]/g, "").replace(",", ".");
      const priceNum = parseFloat(p) || 999999;
      const isMain = it.location
        .toLowerCase()
        .includes(cidade.toLowerCase().split(" ")[0]);

      return {
        ...it,
        price_num: priceNum,
        is_main_city: isMain,
        img: "/placeholder-120x90.png",
        analysis: it.analysis.startsWith("✨")
          ? it.analysis
          : "✨ " + it.analysis
      };
    }).sort((a, b) => {
      if (a.price_num !== b.price_num) return a.price_num - b.price_num;
      if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
      return 0;
    });

    return res.status(200).json({
      items: itemsFinal.slice(0, 3),
      precoMedio: Math.round(mediaRegional)
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Erro interno", details: e.message });
  }
}
 = laye
