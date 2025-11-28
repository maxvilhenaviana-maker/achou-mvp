// /pages/api/buscar.js
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { termo, local } = req.body;

    if (!termo || !local) {
      return res.status(400).json({ error: "Dados insuficientes" });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Requisição na API nova, com acesso WEB habilitado
    const resposta = await openai.responses.create({
      model: "gpt-4.1",
      input: `
        Pesquise na internet anúncios REAIS e RECENTES do item "${termo}"
        na cidade "${local}".
        Liste pelo menos 3 resultados verdadeiros com:
        - título
        - preço
        - link
        - data aproximada do anúncio
      `
    });

    res.status(200).json({ resultado: resposta.output_text });
  } catch (erro) {
    console.error("ERRO AO BUSCAR:", erro);
    res.status(500).json({
      error: "Erro ao consultar OpenAI",
      details: erro.response ? erro.response.data : erro.message
    });
  }
}
