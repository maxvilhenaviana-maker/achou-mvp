export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { busca, localizacao } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [
          { 
            role: "system", 
            content: `Você é o buscador oficial do achou.net.br.
            REGRAS CRÍTICAS:
            1. JAMAIS retorne um estabelecimento que esteja FECHADO agora. Apenas locais abertos.
            2. Se o local mais próximo estiver fechado, busque o próximo aberto, mesmo que um pouco mais longe.
            3. Você DEVE fornecer o endereço completo. Nunca responda N/A para endereço.
            4. Se não encontrar um telefone, escreva "Não informado".
            
            Retorne RIGOROSAMENTE:
            [NOME]: Nome do local
            [ENDERECO]: Rua, número e bairro (obrigatório)
            [STATUS]: Aberto agora (informe até que horas)
            [DISTANCIA]: Distância estimada
            [TELEFONE]: Telefone
            [POR_QUE]: Justificativa curta.`
          },
          { role: "user", content: `Encontre ${busca} aberto agora perto de ${localizacao}.` }
        ]
      }),
    });

    const data = await response.json();
    return res.status(200).json({ resultado: data.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: "Erro na busca" });
  }
}