export const config = {
  maxDuration: 60, // Aumenta tempo limite para buscas complexas
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { busca, localizacao } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return res.status(500).json({ error: "API Key não configurada" });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Usando modelo estável e rápido
        messages: [
          { 
            role: "system", 
            content: `Você é uma API que retorna APENAS JSON.
            O usuário busca um local próximo.
            
            1. Pesquise e encontre o estabelecimento ABERTO mais próximo.
            2. Se não achar o endereço exato, estime baseado no centro do bairro/cidade.
            3. JAMAIS retorne chaves vazias. Se não tiver info, preencha "Não informado".
            
            Retorne ESTRITAMENTE este JSON (sem markdown, sem \`\`\`json):
            {
              "nome": "Nome do Local",
              "endereco": "Endereço completo",
              "status": "Aberto ou Fechado",
              "distancia": "Ex: 2.5 km",
              "telefone": "(XX) XXXX-XXXX",
              "motivo": "Por que é a melhor opção"
            }`
          },
          { 
            role: "user", 
            content: `Encontre: ${busca}. Localização referência: ${localizacao}. Prioridade: Aberto agora.` 
          }
        ],
        temperature: 0.5
      }),
    });

    const data = await response.json();
    
    // Tratamento de erro da OpenAI
    if (data.error) {
      console.error("OpenAI Error:", data.error);
      return res.status(500).json({ error: "Erro no processamento da IA" });
    }

    let conteudo = data.choices[0].message.content;
    
    // Limpeza caso a IA mande markdown de código
    conteudo = conteudo.replace(/```json/g, "").replace(/```/g, "").trim();

    return res.status(200).json({ resultado: conteudo });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}