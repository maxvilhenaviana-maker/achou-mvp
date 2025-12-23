export const config = { api: { bodyParser: true }, runtime: "nodejs" };
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};
  const agora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    // ESTÁGIO 1: Busca bruta e literal
    const rawSearch = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-search-preview",
        messages: [{ 
          role: "user", 
          content: `Acesse a OLX e extraia os 10 primeiros anúncios de "${produto}" em "${cidade}".
          Para cada um, copie EXATAMENTE: Título, Preço, Bairro (ex: Gutierrez, Santa Terezinha) e Data/Hora.` 
        }],
        temperature: 0
      }),
    });

    const searchData = await rawSearch.json();
    const textoBruto = searchData.choices?.[0]?.message?.content || "";

    // ESTÁGIO 2: gpt-5-mini apenas organiza o que foi encontrado
    const refineResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `Você é um formatador de dados. Converta a lista de anúncios abaixo para JSON. 
            Regra: Se o bairro estiver no texto, coloque-o. Se não, use "Belo Horizonte (Geral)".
            Não descarte anúncios, a menos que sejam claramente sucatas ou peças.`
          },
          { role: "user", content: textoBruto }
        ],
      }),
    });

    const finalData = await refineResponse.json();
    const content = finalData.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    let itemsFinal = [];
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      itemsFinal = (parsed.items || []).map(it => ({
        ...it,
        price_num: parseFloat(String(it.price || "").replace(/[R$\s.]/g, '').replace(',', '.')) || 0,
        img: "/placeholder-120x90.png",
        analysis: `✨ Localizado em: ${it.location}`
      }));
    }

    // Ordenar pelo menor preço para garantir que a oferta de R$ 190 apareça no topo
    itemsFinal.sort((a, b) => a.price_num - b.price_num);

    return res.status(200).json({ 
      items: itemsFinal.slice(0, 3), 
      precoMedio: itemsFinal.length > 0 ? Math.round(itemsFinal.reduce((acc, curr) => acc + curr.price_num, 0) / itemsFinal.length) : 0 
    });

  } catch (err) {
    return res.status(500).json({ error: "Erro na extração" });
  }
}