export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).end();

const apiKey = process.env.GEMINI_ACHOU_KEY;

if (!apiKey) {
console.error('API Key não configurada. Verifique GEMINI_ACHOU_KEY nas variáveis de ambiente.');
return res.status(500).json({ error: 'Chave da API do Gemini não encontrada na configuração do servidor.' });
}

const { produto, cidade, raio } = req.body;
if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios' });

const MODEL_NAME = 'gemini-2.5-flash';

// MUDANÇA CRÍTICA: Removendo o filtro de "oportunidade" para garantir que o JSON seja entregue
const systemPrompt = `
Você é um agente de busca de anúncios online no Brasil, focado em performance.
Seu objetivo é encontrar anúncios de produtos relevantes na região especificada.

Regras de busca (USE A FERRAMENTA DE BUSCA):
1. A busca deve ser insensível a maiúsculas e minúsculas e deve ser ampla o suficiente para encontrar o produto na região.
2. Acesse OLX, Desapega, Mercado Livre ou equivalentes, usando a ferramenta de busca fornecida.
3. **PRIORIDADE MÁXIMA:** Retorne qualquer anúncio relevante para o produto e a cidade, sem aplicar filtros de preço ou data. O foco é apenas encontrar resultados.
4. Para cada anúncio encontrado, retorne: title (título), price (apenas o valor numérico, sem R$), location (localização), date (data de publicação original do anúncio), **description (descrição breve, 1-2 frases sobre o achado e a fonte)**, link (URL do anúncio), img (URL da imagem principal).
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
console.error("Resposta da API vazia ou sem texto de candidato.");
return res.status(500).json({ error: 'Resposta da API vazia ou inválida.' });
}

let items = [];

// O bloco de parsing mais robusto para lidar com formatação Markdown ou texto extra.
const tryParseJson = (text) => {
// 1. Remove marcadores de bloco de código Markdown (```json e ```)
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
items = parsedData.items || parsedData;
} else {
// Se todas as tentativas de parsing falharem, retornamos o erro com o texto bruto para depuração.
return res.status(200).json({ error: 'Formato de resposta inválido da API. (Raw)', raw: jsonText });
}

// Garante que o retorno é sempre um array e renomeia 'description' para 'analysis'
return res.status(200).json({ items: Array.isArray(items) ? items.map(item => ({
...item,
analysis: item.description || item.analysis || 'Informação de anúncio.',
description: undefined // Remove o campo antigo se existir
})) : [] });

} catch (err) {
console.error('Erro de Fetch/Rede na API:', err);
return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
}
}
