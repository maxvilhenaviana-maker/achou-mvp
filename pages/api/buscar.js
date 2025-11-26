// AUMENTO DO TIMEOUT PARA 60 SEGUNDOS (Mantido para segurança do Vercel)
export const config = {
maxDuration: 60,
};

export default async function handler(req, res) {
if (req.method !== 'POST') return res.status(405).end();

const apiKey = process.env.GEMINI_ACHOU_KEY;

if (!apiKey) {
console.error('API Key não configurada. Verifique GEMINI_ACHOU_KEY nas variáveis de ambiente.');
return res.status(500).json({ error: 'Chave da API do Gemini não encontrada na configuração do servidor.' });
}

const { produto, cidade, raio } = req.body;
if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios' });

// Usamos a versão preview que suporta melhor o JSON Schema e Tool Use
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

// PROMPT FINAL OTIMIZADO PARA REDUÇÃO DO TEMPO DE GERAÇÃO
const systemPrompt = `
Você é um agente de busca de oportunidades de ouro no mercado de usados do Brasil.
Seu objetivo é encontrar anúncios que representem a MELHOR OPORTUNIDADE de preço.

Regras de busca (USE A FERRAMENTA DE BUSCA):
1. A busca deve ser insensível a maiúsculas e minúsculas e deve ser ampla o suficiente para encontrar o produto na região.
2. Acesse OLX, Desapega, Mercado Livre ou equivalentes, usando a ferramenta de busca fornecida.
3. **CRITÉRIO DE OPORTUNIDADE (PRIORIDADE MÁXIMA):** Traga apenas anúncios que, em sua análise, foram publicados HOJE ou ONTEM e que o preço esteja abaixo do valor de mercado para aquele produto/condição.
4. Para cada achado, retorne um objeto na lista 'items' com as chaves: title, price (apenas o valor com R$, ex: R$ 500), location, date (data de publicação), analysis (análise breve, 1-2 frases sobre o achado e porque é uma oportunidade), link (URL do anúncio), e img (URL da imagem principal).
5. Retorne APENAS o JSON. Se NENHUM RESULTADO FOR ENCONTRADO, retorne estritamente: {"items": []}
`;

const userPrompt = `
Produto que estou procurando: ${produto}
Cidade/Região de busca: ${cidade}
Raio de busca (km): ${raio || 40}

Execute a varredura agora e retorne apenas o JSON.
`;

// Schema para forçar a saída de um Array de Objetos JSON (Funcionalidade que funcionou no teste)
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
// FERRAMENTA DE BUSCA REATIVADA
tools: [{ "google_search": {} }],
generationConfig: {
temperature: 0.0,
maxOutputTokens: 1024,
// FORÇA A SAÍDA JSON
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
console.error("Resposta da API vazia ou sem texto de candidato.");
return res.status(500).json({ error: 'Resposta da API vazia ou inválida.' });
}

let parsedData;

try {
// O parse agora é mais simples e confiável devido ao responseMimeType
parsedData = JSON.parse(jsonText);
} catch (e) {
console.error("Falha ao fazer parse do JSON retornado:", e);
// Retorna o texto bruto para depuração no frontend
return res.status(200).json({ error: 'Formato de resposta inválido da API. (Raw)', raw: jsonText });
}


const items = parsedData?.items || [];

// Garante que o retorno é sempre um array
return res.status(200).json({ items: Array.isArray(items) ? items : [] });

} catch (err) {
console.error('Erro de Fetch/Rede na API:', err);
return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
}
}
