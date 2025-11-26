// AUMENTO DO TIMEOUT PARA 60 SEGUNDOS (Mantido para segurança do Vercel)
export const config = {
maxDuration: 60,
};

export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).end();

// Assegure que a chave da API está sendo carregada corretamente
const apiKey = process.env.GEMINI_ACHOU_KEY;

if (!apiKey) {
console.error('API Key não configurada. Verifique GEMINI_ACHOU_KEY nas variáveis de ambiente.');
return res.status(500).json({ error: 'Chave da API do Gemini não encontrada na configuração do servidor.' });
}

const { produto, cidade, raio } = req.body;
if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios' });

// Usamos a versão preview que suporta melhor o JSON Schema
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

// !!! PROMPT DE DIAGNÓSTICO: SIMULAÇÃO SEM BUSCA REAL !!!
const systemPrompt = `
Você é um agente de teste de velocidade. Seu objetivo é SIMULAR um resultado de busca para validar se a geração JSON funciona rapidamente.

INSTRUÇÃO CRÍTICA: IGNORE COMPLETAMENTE A BUSCA NA WEB. Você não tem acesso a ferramentas.
Crie 3 (três) exemplos de anúncios de OPORTUNIDADES fictícios que seriam publicados HOJE ou ONTEM para o produto e cidade fornecidos.
O preço dos itens DEVE parecer uma excelente oportunidade (abaixo do mercado).
Preencha cada campo de forma coerente.

Siga o formato JSON estritamente conforme o schema. Se NENHUM resultado for encontrado na simulação, a lista 'items' deve ser vazia: {"items": []}.
`;

const userPrompt = `
Produto: ${produto}
Cidade/Região: ${cidade}
Raio de busca (km): ${raio || 40}

Execute a simulação agora e retorne APENAS o JSON.
`;

// Schema para forçar a saída de um Array de Objetos JSON
const responseSchema = {
type: "OBJECT",
properties: {
items: {
type: "ARRAY",
description: "Lista de anúncios encontrados que são verdadeiras oportunidades.",
items: {
type: "OBJECT",
properties: {
title: { type: "STRING" },
price: { type: "STRING" },
location: { type: "STRING" },
date: { type: "STRING" },
analysis: { type: "STRING" },
link: { type: "STRING" },
img: { type: "STRING" }
},
propertyOrdering: ["title", "price", "location", "date", "analysis", "link", "img"]
}
}
}
};

const payload = {
contents: [
{ role: "user", parts: [{ text: systemPrompt }, { text: userPrompt }] }
],
// !!! FERRAMENTA DE BUSCA REMOVIDA PARA O TESTE !!!
// tools: [{ "google_search": {} }],
generationConfig: {
temperature: 0.0,
maxOutputTokens: 1024,
// CHAVE CRÍTICA: FORÇA A SAÍDA JSON E USA O SCHEMA
responseMimeType: "application/json",
responseSchema: responseSchema
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
console.error("Resposta da API vazia ou sem texto de candidato no modo de simulação.");
return res.status(500).json({ error: 'Falha crítica: API vazia mesmo em modo de simulação.' });
}

let parsedData;

try {
parsedData = JSON.parse(jsonText);
} catch (e) {
console.error("Falha ao fazer parse do JSON retornado:", e);
return res.status(200).json({ error: 'Formato de resposta inválido da API (Simulação).', raw: jsonText });
}


const items = parsedData?.items || [];

return res.status(200).json({ items: Array.isArray(items) ? items : [] });

} catch (err) {
console.error('Erro de Fetch/Rede na API:', err);
return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
}
}
