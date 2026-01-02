export const config = {
  api: {
    bodyParser: true,
  },
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade, categoria } = req.body || {};

  if (!produto || !cidade || !categoria) {
    return res.status(400).json({ error: "Dados insuficientes." });
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [
          { 
            role: "system", 
            content: `Você é um robô analista de mercado e suporte técnico. Sua resposta deve seguir RIGOROSAMENTE o formato de tags abaixo.

            PROTOCOLO DE PESQUISA (FALLBACK OBRIGATÓRIO):
            1. Para cada um dos 3 modelos escolhidos no [CARD_1_INDICADOS], você deve buscar:
               a) Histórico de reclamações e confiabilidade.
               b) Rede de suporte e peças em ${cidade}.
            2. REGRA DE OURO: Se o modelo específico for muito novo, raro ou não possuir dados suficientes, você deve IMEDIATAMENTE pesquisar e apresentar os dados da MARCA/FABRICANTE.
            3. No texto, deixe claro: "Análise baseada no histórico da marca [Nome]" caso o fallback seja ativado.
            4. Nunca retorne "dados não encontrados". Se o modelo falhar, a marca é a fonte oficial.

            [CARD_1_INDICADOS]
            1. Marca/Modelo A | Nota: X.X | Faixa: R$ X
            2. Marca/Modelo B | Nota: X.X | Faixa: R$ X
            3. Marca/Modelo C | Nota: X.X | Faixa: R$ X

            [CARD_2_RECLAMACOES]
            1. Análise detalhada de confiabilidade do 1º modelo (ou de sua marca).
            2. Análise detalhada de confiabilidade do 2º modelo (ou de sua marca).
            3. Análise detalhada de confiabilidade do 3º modelo (ou de sua marca).

            [CARD_3_SUPORTE]
            1. Rede de atendimento e peças em ${cidade} para o 1º modelo (ou sua marca).
            2. Rede de atendimento e peças em ${cidade} para o 2º modelo (ou sua marca).
            3. Rede de atendimento e peças em ${cidade} para o 3º modelo (ou sua marca).

            [DETALHAMENTO_MERCADO]
            Panorama geral e dicas para o comprador de ${produto} em ${cidade}.

            [AVISO_LEGAL]
            Esta análise é baseada em informações públicas e deve ser utilizada apenas como apoio à tomada de decisão. As informações devem ser confirmadas pelo comprador.`
          },
          { 
            role: "user", 
            content: `Execute a análise de ${produto} (${categoria}) em ${cidade}. Lembre-se: se o modelo for novo ou sem histórico, use os dados da marca para garantir que os Cards 2 e 3 estejam completos.` 
          }
        ]
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    return res.status(200).json({ relatorio: data.choices[0].message.content });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}