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
        error: "Parâmetros obrigatórios ausentes (termo ou localizacao)",
      });
    }

    /**
     * Prompt focado em gerar oportunidades,
     * mas depois adaptamos ao contrato do frontend
     */
    const prompt = `
Você é um analista de mercado especializado em encontrar boas oportunidades locais.

Produto: ${produto}
Região: ${cidade}

Tarefas:
1. Estimar o preço médio praticado na região.
2. Identificar boas oportunidades de compra abaixo ou próximas da média.
3. Para cada oportunidade, descreva:
   - Título d
