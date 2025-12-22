import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { produto, cidade } = req.body || {};

    if (!produto || !cidade) {
      return res.status(400).json({
        error: "Parâmetros obrigatórios ausentes (produto ou cidade)",
      });
    }

    // ⚠️ Prompt seguro (SEM template string quebrável)
    const prompt =
      "Você é um analista de mercado especializado em encontrar boas oportunidades locais.\n\n" +
      "Produto: " + produto + "\n" +
      "Região: " + cidade + "\n\n" +
      "Tarefas:\n" +
      "1. Estimar o preço médio praticado na região.\n" +
      "2. Identificar boas oportunidades de compra abaixo ou p
 - Título d
