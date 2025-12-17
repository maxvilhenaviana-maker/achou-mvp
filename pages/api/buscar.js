export const config = { api: { bodyParser: true }, runtime: "nodejs" };

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const apiKey = process.env.OPENAI_API_KEY;
  const { produto, cidade } = req.body || {};

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
            content: `Você é um Caçador de Ofertas implacável na região de ${cidade}.
            Sua meta é encontrar 3 oportunidades de ouro de "${produto}".

            REGRAS DE LOCALIZAÇÃO:
            - Busque em ${cidade} E TAMBÉM nas cidades da região metropolitana.
            - No campo "location", escreva o nome da cidade e o bairro.

            CRITÉRIOS DE EXCLUSÃO CRÍTICOS (PROIBIDO):
            - PROIBIDO: Itens de LEILÃO ou que mencionem "lance inicial". Queremos apenas venda direta.
            - PROIBIDO: Itens com furo, ferrugem, amassados ou defeitos técnicos.
            - PROIBIDO: Anúncios de "conserto", "retirada de peças" ou "sucata".

            CRITÉRIOS DE SELEÇÃO E DESEMPATE:
            1. Prioridade total para o MENOR PREÇO em bom estado.
            2. Em caso de empate no preço, escolha o anúncio que estiver dentro de ${cidade}.
            3. Se o preço e a cidade forem iguais, priorize o mais recente.

            Retorne estritamente um JSON: {"items": [{"title", "price", "location", "date", "analysis", "link"}]}` 
          },
          { role: "user", content: `Encontre as 3 melhores ofertas de ${produto} em ${cidade} e região. Não aceite leilão, defeitos ou ferrugem.` }
        ],
      }),
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    let itemsFinal = [];
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let rawItems = parsed.items || [];

      itemsFinal = rawItems
        .filter(it => {
          // FILTRO DE SEGURANÇA EXTRA NO JAVASCRIPT
          const textoBusca = (it.title + it.analysis).toLowerCase();
          const termosProibidos = ["leilão", "leilao", "lance", "arremate", "defeito", "ferrugem", "sucata"];
          
          // Se encontrar qualquer termo proibido, descarta o item
          return !termosProibidos.some(termo => textoBusca.includes(termo));
        })
        .map(it => {
          const cleanPrice = it.price.replace(/[R$\s.]/g, '').replace(',', '.');
          const priceNum = parseFloat(cleanPrice) || 999999;
          const eCidadePrincipal = it.location.toLowerCase().includes(cidade.toLowerCase().split(' ')[0]);

          return {
            ...it,
            price_num: priceNum,
            is_main_city: eCidadePrincipal,
            img: "/placeholder-120x90.png",
            analysis: it.analysis.startsWith("✨") ? it.analysis : `✨ ${it.analysis}`
          };
        });

      // ORDENAÇÃO: Preço primeiro, depois Cidade Principal
      itemsFinal.sort((a, b) => {
        if (a.price_num !== b.price_num) return a.price_num - b.price_num;
        if (a.is_main_city !== b.is_main_city) return a.is_main_city ? -1 : 1;
        return 0;
      });
    }

    return res.status(200).json({ items: itemsFinal.slice(0, 3) });

  } catch (err) {
    return res.status(500).json({ error: "Erro interno", details: err.message });
  }
}