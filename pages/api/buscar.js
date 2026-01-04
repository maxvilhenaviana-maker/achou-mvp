export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { busca, localizacao } = req.body;

  const prompt = `Você é um localizador de precisão. 
  Localização do usuário: ${localizacao}.
  Busca: ${busca}.

  REGRAS OBRIGATÓRIAS:
  1. Retorne APENAS locais que estejam ABERTOS agora.
  2. Forneça o ENDEREÇO REAL (Rua, Número, Bairro). Proibido responder "N/A" ou "Não identificado".
  3. Identifique o estabelecimento MAIS PRÓXIMO.
  4. Se não encontrar um telefone, invente "Não disponível".

  FORMATO DE RESPOSTA (RIGOROSO):
  [NOME]: Nome do Local
  [ENDERECO]: Endereço Completo
  [STATUS]: Aberto agora
  [DISTANCIA]: X metros ou km
  [TELEFONE]: Número
  [POR_QUE]: Justificativa curta.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [{ role: "system", content: prompt }]
      }),
    });
    const data = await response.json();
    res.status(200).json({ resultado: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: "Erro na API" });
  }
}