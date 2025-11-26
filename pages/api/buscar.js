export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const apiKey = process.env.GEMINI_ACHOU_KEY;

    if (!apiKey) {
        console.error('API Key não configurada. Verifique GEMINI_ACHOU_KEY nas variáveis de ambiente.');
        return res.status(500).json({ error: 'Chave da API do Gemini não encontrada na configuração do servidor.' });
    }

    // Usaremos 'produto' como 'estabelecimento' e 'cidade' como 'cidade/região'
    const { produto, cidade } = req.body;
    if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios para o teste de endereço.' });

    // *** ALTERAÇÃO TEMPORÁRIA: MODELO MANTIDO, MAS FOCO NA CONECTIVIDADE ***
    const MODEL_NAME = 'gemini-2.5-flash';

    // *** ALTERAÇÃO TEMPORÁRIA: PROMPT SIMPLES PARA TESTAR CHAVE/API ***
    // O objetivo agora é encontrar o endereço de um estabelecimento (digitado em 'produto')
    // na cidade informada.

    const userPrompt = `
        Como um motor de busca, localize o endereço completo do estabelecimento chamado "${produto}" na cidade/região de "${cidade}".
        Responda apenas com o nome e o endereço completo do local. Não use a ferramenta de busca.
        Exemplo: "Farmácia Central, Av. Principal, 123, Centro, São Paulo - SP".
    `;

    const payload = {
        contents: [
            { role: "user", parts: [{ text: userPrompt }] }
        ],
        // FERRAMENTAS DE BUSCA REMOVIDAS TEMPORARIAMENTE para focar no teste de chave
        generationConfig: {
            temperature: 0.2, // Aumentado um pouco para dar mais flexibilidade na resposta de texto
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
        const addressText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

        // --- LOG DE DEBUG ---
        console.log('--- RESPOSTA DE TESTE DA API ---');
        console.log(addressText);
        console.log('---------------------------------');

        if (!addressText) {
            console.error("Resposta da API vazia ou sem texto de candidato no modo de teste.");
            return res.status(500).json({ error: 'Teste falhou: Resposta da API Gemini vazia. Chave ou conectividade falhou.' });
        }

        // Retorna a resposta de texto simples como uma mensagem de sucesso
        return res.status(200).json({ success: true, message: 'Teste Gemini bem-sucedido!', result: addressText });

    } catch (err) {
        console.error('Erro de Fetch/Rede na API:', err);
        return res.status(500).json({ error: 'Erro de comunicação de rede com a API.', details: String(err) });
    }
}
