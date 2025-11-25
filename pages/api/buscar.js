export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).end();

// As variáveis __app_id e __firebase_config NÃO são usadas aqui,
// mas o código mantém a estrutura base de uma API route no Next.js.
const apiKey = process.env.GEMINI_ACHOU_KEY;

if (!apiKey) {
console.error('API Key não configurada. Verifique GEMINI_ACHOU_KEY nas variáveis de ambiente.');
return res.status(500).json({ error: 'Chave da API do Gemini não encontrada na configuração do servidor.' });
}

const { produto, cidade, raio } = req.body;
if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios' });

const MODEL_NAME = 'gemini-2.5-flash';

// O systemPrompt foca na performance e na simulação de análise de preço
// para evitar o timeout que estava causando a resposta vazia.
const systemPrompt = `
Você é um agente de busca automática de oportunidades no Brasil, focado em alta performance e entrega rápida.
Seu objetivo é encontrar anúncios de produtos que pareçam ser uma pechincha (barganha).

Regras de busca (USE A FERRAMENTA DE BUSCA):
1. A busca deve ser insensível a maiúsculas e minúsculas (case-insensitive) e deve ser ampla o suficiente para encontrar o produto na região.
2. Acesse OLX, Desapega, Mercado Livre ou equivalentes, usando a ferramenta de busca fornecida.
3. **PRIORIDADE MÁXIMA:** Focar em anúncios onde o preço pareça ser uma barganha, comparado a outros resultados da busca. Simule a análise de preço para garantir que a resposta seja rápida. Não filtre por data de publicação, apenas por oportunidades de preço.
4. Para cada anúncio que for uma oportunidade, retorne: title (título), price (apenas o valor numérico, sem R$), location (localização), date (data de publicação original do anúncio), analysis (análise breve, 1-2 frases sobre o achado e porque é uma oportunidade), link (URL do anúncio), img (URL da imagem principal).
5. Retorne um JSON com uma lista chamada "items" que contenha todos os resultados.
6. Não invente anúncios.
7. Retorne APENAS o JSON, sem nenhuma explicação ou texto antes ou depois.
8. SE NENHUM RESULTADO FOR ENCONTRADO, retorne estritamente: {"items": []}
`;

const userPrompt = `
Produto que estou procurando: ${produto}
Cidade/Região de busca: ${cidade}
Raio de busca (km): ${raio || 40}

Execute a varredura agora e retorne apenas o JSON.
`;

const payload = {
contents: [
{ role: "user", parts: [{ text: systemPrompt }, { text: userPrompt }] }
],
// Habilita o Google Search Grounding, essencial para a busca na web
tools: [{ "google_search": {} }],
generationConfig: {
temperature: 0.0,
maxOutputTokens: 1024, // Aumentado para dar mais espaço ao JSON
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
console.error("Resposta da API vazia ou sem texto de candidato.");
// Retorna 500 para indicar falha na API ou timeout
return res.status(500).json({ error: 'Resposta da API vazia ou inválida.' });
}

let items = [];
let rawText = jsonText;

// Bloco de parsing robusto: tenta JSON.parse, e se falhar, tenta extrair o JSON
// do texto bruto usando regex, o que é comum com o Grounding.
try {
const parsed = JSON.parse(jsonText);
items = parsed.items || parsed;
} catch (e) {
const match = jsonText.match(/\{[\s\S]*\}/);
if (match) {
try {
const p2 = JSON.parse(match[0]);
items = p2.items || p2;
rawText = match[0];
} catch (e2) {
console.error('Erro ao tentar extrair JSON com regex:', e2);
return res.status(200).json({ error: 'Formato de resposta inválido da API. (Raw)', raw: rawText });
}
} else {
return res.status(200).json({ error: 'Resposta não contém JSON.', raw: rawText });
}
}

// Garante que o retorno é sempre um array
return res.status(200).json({ items: Array.isArray(items) ? items : [] });

} catch (err) {
console.error('Erro de Fetch/Rede na API:', err);
return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
}
}
