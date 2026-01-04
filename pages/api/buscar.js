// Arquivo: api/buscar.js (Versão Otimizada para Search Preview)

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { busca, localizacao } = req.body;
  const apiKey = process.env.OPENAI_API_KEY;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview", // Seu modelo com busca ativa
        messages: [
          { 
            role: "system", 
            content: `Você é um buscador local ultra-preciso para o app achou.net.br.
            
            Sua missão:
            1. Use sua ferramenta de busca para encontrar o estabelecimento REAL mais próximo das coordenadas fornecidas pelo usuário.
            2. Verifique obrigatoriamente sites como Google Maps, Yelp ou sites oficiais para confirmar se o local está ABERTO agora.
            3. Obtenha o endereço exato, telefone e calcule a distância aproximada.
            4. PROIBIDO INVENTAR: Se não encontrar dados reais na internet para esse local exato, responda que não encontrou.
            
            Retorne ESTRITAMENTE este JSON:
            {
              "nome": "Nome Real do Local",
              "endereco": "Rua, Número, Bairro, Cidade",
              "status": "Aberto Agora / Fechado no momento",
              "distancia": "X metros ou km",
              "telefone": "(XX) XXXX-XXXX",
              "motivo": "Explique brevemente por que este é o melhor resultado (ex: o mais próximo ou único aberto)."
            }`
          },
          { 
            role: "user", 
            content: `BUSCA REAL: Encontre ${busca} perto das coordenadas ${localizacao}. 
            Importante: Identifique em qual cidade/bairro essas coordenadas estão antes de buscar.` 
          }
        ],
        temperature: 0.2 // Baixamos a temperatura para diminuir a "criatividade" (alucinação)
      }),
    });

    const data = await response.json();
    let conteudo = data.choices[0].message.content;
    
    // Limpeza de Markdown
    conteudo = conteudo.replace(/```json/g, "").replace(/```/g, "").trim();

    return res.status(200).json({ resultado: conteudo });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno" });
  }
}