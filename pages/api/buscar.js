// pages/api/buscar.js

export default async function handler(req, res) {
  try {
    const { termo, local } = req.body;

    // Verificação básica
    if (!termo || !local) {
      return res.status(400).json({ error: "Parâmetros inválidos." });
    }

    // ===== OPENAI SETUP =====
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY não configurada no Vercel." });
    }

    // Import dinâmico do SDK novo da OpenAI
    const OpenAI = (await import("openai")).default;

    const openai = new OpenAI({
      apiKey
    });

    // ===== TESTE DE INTERNET REAL =====
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: `
            Faça uma busca REAL na internet (web browsing habilitado).
            Pergunta de teste:
            → Existem microondas à venda em Belo Horizonte agora?

            Responda:
            - SIM ou NÃO
            - E traga pelo menos 1 link REAL encontrado.
          `
        }
      ],
      tools: {
        web: { enabled: true }
      },
      max_output_tokens: 300
    });

    // ===== TRATAMENTO =====
    let texto = "";

    if (response.output_text) {
      texto = response.output_text;
    } else if (response.output && response.output[0]?.content[0]?.text) {
      texto = response.output[0].content[0].text;
    } else {
      texto = JSON.stringify(response, null, 2);
    }

    // Retorno final
    return res.status(200).json({
      ok: true,
      teste: true,
      termo,
      local,
      resultado: texto
    });

  } catch (error) {
    console.error("Erro no buscar.js:", error);

    return res.status(500).json({
      error: "Erro durante o teste com a OpenAI.",
      details: error?.response?.data || error.message || error
    });
  }
}
