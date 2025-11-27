import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { termo } = req.body;

    if (!termo) {
      return res.status(400).json({ erro: "Nenhum termo enviado." });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web" }],
      input: `
        Pesquise na web sobre: "${termo}".
        Traga resultados recentes, confiáveis, organizados, com:
        - título
        - resumo
        - link
      `
    });

    const texto = response.output_text;
    return res.status(200).json({ resultado: texto });

  } catch (error) {
    console.error("Erro na API OpenAI:", error);
    return res.status(500).json({
      erro: "Erro ao consultar o modelo GPT-4.1 com navegação web."
    });
  }
}
