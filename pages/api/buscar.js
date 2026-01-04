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
            content: `Você é o motor de busca do achou.net.br. 
            Sua tarefa é encontrar o estabelecimento mais próximo e de melhor custo-benefício.
            Use a localização fornecida (pode ser coordenadas ou nome de cidade).
            
            Retorne APENAS:
            [NOME]: Nome do local
            [ENDERECO]: Endereço completo (Rua, nº, Bairro)
            [STATUS]: Aberto agora (informe até que horas) ou Fechado
            [DISTANCIA]: Distância estimada em km ou metros
            [TELEFONE]: Telefone (se disponível)
            [POR_QUE]: Uma breve justificativa da escolha.`
          },
          { role: "user", content: `Procure por ${busca} em ${localizacao}. Foque no mais próximo.` }
        ]
      }),
    });

    const data = await response.json();
    return res.status(200).json({ resultado: data.choices[0].message.content });
  } catch (err) {
    return res.status(500).json({ error: "Erro na API" });
  }
}