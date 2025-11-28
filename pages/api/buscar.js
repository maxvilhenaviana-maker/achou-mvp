// pages/api/buscar.js

export default async function handler(req, res) {
  try {
    const { termo } = await req.body;

    if (!termo || termo.trim() === "") {
      return res.status(400).json({ error: "Termo de busca vazio." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Chave OPENAI_API_KEY não configurada." });
    }

    // Prompt enviado ao modelo
    const systemPrompt = `
Você é um motor de busca especializado em encontrar ofertas, produtos e serviços.
Retorne sempre no formato JSON com a estrutura:

{
  "resultado": [
    {
      "titulo": "...",
      "preco": "...",
      "local": "...",
      "link": "..."
    }
  ]
}

Caso não encontre nada, devolva um JSON com "resultado": [].
    `;

    const userPrompt = `Buscar: ${termo}. Gere apenas JSON válido.`;

    // --- Chamada correta para a API nova /v1/responses ---
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],

        // Formato novo correto — substitui completamente "text.format"
        response_format: { type: "json_object" },

        temperature: 0.0,
        max_output_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      return res.status(500).json({
        error: "Erro OpenAI",
        details: errBody,
      });
    }

    const data = await response.json();

    // Novo formato de retorno da API:
    // data.output[0].content[0].text
    const texto = data.output?.[0]?.content?.[0]?.text;

    if (!texto) {
      return res.status(500).json({
        error: "Falha ao interpretar retorno da OpenAI.",
        detalhes: data,
      });
    }

    // Certificar que é JSON válido
    let jsonFinal;
    try {
      jsonFinal = JSON.parse(texto);
    } catch (e) {
      return res.status(500).json({
        error: "OpenAI retornou JSON inválido.",
        textoRecebido: texto,
      });
    }

    res.status(200).json(jsonFinal);
  } catch (e) {
    console.error("Erro geral:", e);
    res.status(500).json({
      error: "Erro inesperado no servidor",
      detalhes: e.message,
    });
  }
}
