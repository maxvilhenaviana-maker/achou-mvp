// AUMENTO DO TIMEOUT PARA 60 SEGUNDOS (Mantido para segurança do Vercel)
export const config = {
    maxDuration: 60,
};

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    // A chave da API deve ser definida no Vercel como uma Variável de Ambiente
    const apiKey = process.env.GEMINI_ACHOU_KEY;

    if (!apiKey) {
        console.error('API Key não configurada. Verifique GEMINI_ACHOU_KEY nas variáveis de ambiente.');
        return res.status(500).json({ error: 'Chave da API do Gemini não encontrada na configuração do servidor.' });
    }

    const { produto, cidade, raio } = req.body;
    if (!produto || !cidade) return res.status(400).json({ error: 'Produto e cidade são obrigatórios' });

    // MODELO FLASH (Modelo mais econômico e rápido para evitar esgotamento de cota)
    const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

    // URL DE PLACEHOLDER PARA LOGO: Referenciando o arquivo na pasta public
    const logoPlaceholderUrl = '/placeholder-120x90.png';

    // !!! INSTRUÇÃO CRÍTICA PARA EVITAR TIMEOUT DE 60s !!!
    const systemPrompt = `
Você é um agente de busca de oportunidades de ouro no mercado de usados do Brasil.
Seu objetivo é encontrar anúncios que representem a MELHOR OPORTUNIDADE de preço no mercado atual.

Regras de busca (USE A FERRAMENTA DE BUSCA):
1. A busca deve ser ampla o suficiente para encontrar o produto na região (OLX, Desapega, Mercado Livre, etc.).
2. **CRITÉRIO DE OPORTUNIDADE:** Traga apenas anúncios que, em sua análise, estejam nitidamente **abaixo do valor de mercado** para aquele produto/condição.
3. **REGRA DE RETORNO RÁPIDO (PARA EVITAR TIMEOUT):** Comece a buscar. Assim que encontrar **3 (três) oportunidades válidas**, retorne o JSON IMEDIATAMENTE e PARE a busca. Não espere a varredura completa.
4. Para cada achado, retorne um objeto na lista 'items' com as chaves: title, price (o valor formatado), location, date (data de publicação, se disponível), analysis (análise breve, 1-2 frases), link (URL) e **img (URL da imagem)**.
5. **IMAGEM PLACEHOLDER:** Se a busca na web não fornecer uma imagem direta para o anúncio, você DEVE usar o seguinte URL como valor para a chave 'img': ${logoPlaceholderUrl}

RESPOSTA EXCLUSIVA: Sua resposta deve conter **APENAS** o bloco de código JSON. Não inclua texto explicativo, introduções, títulos ou qualquer outro caractere fora do bloco \`\`\`json.
**IMPORTANTE (Contingência):** Se NENHUM resultado for encontrado ou o tempo estiver se esgotando, você DEVE retornar estritamente: \`\`\`json\n{"items": []}\n\`\`\` para evitar erros de formatação.
`;

    const userPrompt = `
Produto que estou procurando: ${produto}
Cidade/Região de busca: ${cidade}
Raio de busca (km): ${raio || 40}

Execute a varredura e retorne apenas o JSON, conforme instruído.
`;

    const payload = {
        contents: [
            { role: "user", parts: [{ text: userPrompt }] }
        ],
        // System instruction é enviada fora do contents.
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        // FERRAMENTA DE BUSCA ATIVA
        tools: [{ "google_search": {} }],
        generationConfig: {
            temperature: 0.0,
            maxOutputTokens: 1024,
        }
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const txt = await response.text();
            const errorMessage = `Erro na API do Gemini (HTTP ${response.status}).`;
            console.error('Gemini error', response.status, txt);
            return res.status(response.status).json({ error: errorMessage, details: txt });
        }

        const json = await response.json();
        const jsonText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonText) {
            console.error("Resposta da API vazia ou sem texto de candidato. Possível timeout interno do modelo PRO.");
            return res.status(500).json({ error: 'Resposta da API vazia ou inválida. (Timeout Tool Use PRO?)' });
        }

        let items = [];

        // O bloco de parsing mais robusto para extrair o JSON
        const tryParseJson = (text) => {
            // 1. Remove marcadores de bloco de código Markdown e espaços em branco desnecessários
            let cleanedText = text.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();

            // 2. Tenta fazer o parse do JSON
            try {
                const parsed = JSON.parse(cleanedText);
                return parsed;
            } catch (e) {
                // 3. Se falhar, tenta extrair o primeiro bloco {}
                const match = cleanedText.match(/\{[\s\S]*\}/);
                if (match) {
                    try {
                        return JSON.parse(match[0]);
                    } catch (e2) {
                        return null;
                    }
                }
                return null;
            }
        };

        const parsedData = tryParseJson(jsonText);

        if (parsedData) {
            // Se a estrutura for {items: [...]}, usa items. Se for um array direto, usa o parsedData.
            items = parsedData.items || (Array.isArray(parsedData) ? parsedData : []);
        } else {
            // === ALTERAÇÃO 2 APLICADA AQUI ===
            const customizedErrorMessage = `Não foi possível fazer a pesquisa pela elevada quantidade de ofertas. Especifique melhor a pesquisa (ex.: Tv 32, ao invés de apenas Tv.)`;
            return res.status(200).json({ error: customizedErrorMessage, raw: jsonText });
        }

        return res.status(200).json({ items: Array.isArray(items) ? items : [] });

    } catch (err) {
        console.error('Erro de Fetch/Rede na API:', err);
        return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
    }
}