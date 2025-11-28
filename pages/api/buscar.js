import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Parâmetro 'query' é obrigatório." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 🔥 IMPORTANTE: uso correto DO NOVO ENDPOINT /responses
    const response = await client.responses.create({
      model: "gpt-4.1",   

      // --- texto em formato JSON (substitui response_format) ---
      text: { format: "json" },

      // --- sua instrução ---
      input: `Pesquise na web informações bem recentes sobre: "${query}".  
              Retorne apenas um JSON LIMPO no seguinte formato:
              {
                "titulo": "",
                "resumo": "",
                "links": []
              }`,

      // --- habilita busca na web ---
      web: {
        search: {
          enable: true,
        },
      },
    });

    // A resposta vem em `output[0].content[0].text`
    const text = response.output_text;

    let jsonData;
    try {
      jsonData = JSON.parse(text);
    } catch (err) {
      return res.status(500).json({
        error: "Falha ao converter resposta em JSON.",
        textoOriginal: text,
      });
    }

    return res.status(200).json(jsonData);

  } catch (error) {
    console.error("Erro OpenAI:", error);

    return res.status(500).json({
      error: "Erro OpenAI",
      details: error,
    });
  }
}
