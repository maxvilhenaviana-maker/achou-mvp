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

const systemPrompt = `
Você é um agente de busca automática de oportunidades no Brasil.
Seu objetivo é encontrar anúncios de produtos que estejam com preço abaixo do valor de mercado.

Regras de busca:
1. Acesse OLX, Desapega, Mercado Livre ou equivalentes.
2. Traga apenas anúncios publicados HOJE ou ONTEM na região informada.
3. Selecione apenas anúncios com preço abaixo do valor de mercado.
4. Para cada anúncio, retorne: title (título), price (apenas o valor numérico, sem R$), location (localização), date (data de publicação), analysis (análise breve, 1-2 frases sobre o achado), link (URL do anúncio), img (URL da imagem principal).
5. Retorne um JSON com uma lista chamada "items" que contenha todos os resultados.
6. Não invente anúncios.
7. Retorne APENAS o JSON.
8. **SE NENHUM RESULTADO FOR ENCONTRADO, retorne estritamente: {"items": []}**
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
generationConfig: {
temperature: 0.0,
maxOutputTokens: 800,
responseMimeType: "application/json",
responseSchema: {
type: "OBJECT",
properties: {
items: {
type: "ARRAY",
items: {
type: "OBJECT",
properties: {
title: { type: "STRING" },
price: { type: "NUMBER" },
location: { type: "STRING" },
date: { type: "STRING" },
analysis: { type: "STRING" },
link: { type: "STRING" },
img: { type: "STRING" },
},
required: ["title", "price", "location", "date", "analysis", "link", "img"]
}
}
}
}
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
return res.status(500).json({ error: 'Resposta da API vazia ou inválida.' });
}

let parsed;
try {
parsed = JSON.parse(jsonText);
} catch (e) {
console.error('Erro ao fazer parse do JSON:', jsonText, e);
// Se falhar o parse, retorna o texto bruto para que o usuário veja
return res.status(500).json({ error: 'Formato de resposta inválido da API.', raw: jsonText });
}

return res.status(200).json({ items: parsed.items || [] });

} catch (err) {
console.error('Erro API', err);
return res.status(500).json({ error: 'Erro interno ao tentar se comunicar com a API.', details: String(err) });
}
}