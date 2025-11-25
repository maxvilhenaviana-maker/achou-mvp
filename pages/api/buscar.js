export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { produto, cidade, raio } = req.body;
  if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios' });

  const systemPrompt = `
Você é um agente de busca automática de oportunidades no Brasil.
Regras:
- Acesse OLX, Desapega, Mercado Livre ou equivalentes.
- Traga apenas anúncios publicados HOJE ou ONTEM na região informada.
- Selecione apenas anúncios com preço abaixo do valor de mercado.
- Para cada anúncio, retorne: title, price, location, date, analysis breve (1-2 frases), link, image_url.
- Retorne um JSON com uma lista chamada "items".
- Não invente anúncios.
`;

  const userPrompt = `
Produto: ${produto}
Cidade/Região: ${cidade}
Raio (km): ${raio || 40}

Execute a varredura agora e retorne apenas JSON válido conforme instruções do sistema.
`;

  const payload = {
    "messages": [
      { "role": "system", "content": systemPrompt },
      { "role": "user", "content": userPrompt }
    ],
    "temperature": 0.0,
    "maxOutputTokens": 800
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_ACHOU_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const txt = await response.text();
      console.error('Gemini error', response.status, txt);
      return res.status(500).json({ error: 'Erro na API do Gemini', details: txt });
    }

    const json = await response.json();
    const texto = json?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(json);

    let items = [];
    try {
      const parsed = JSON.parse(texto);
      items = parsed.items || parsed;
    } catch (e) {
      const match = texto.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const p2 = JSON.parse(match[0]);
          items = p2.items || p2;
        } catch (e2) {
          return res.status(200).json({ raw: texto });
        }
      } else {
        return res.status(200).json({ raw: texto });
      }
    }

    return res.status(200).json({ items });
  } catch (err) {
    console.error('Erro API', err);
    return res.status(500).json({ error: 'Erro interno', details: String(err) });
  }
}
