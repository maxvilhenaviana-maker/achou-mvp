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

// !!! MUDANÇA CRÍTICA: USANDO MODELO PRO MAIS ROBUSTO PARA TOOL USE !!!
const MODEL_NAME = 'gemini-2.5-pro-preview-09-2025';

// PROMPT ORIGINAL COMPLEXO REINTRODUZIDO
const systemPrompt = `
Você é um agente de busca de oportunidades de ouro no mercado de usados do Brasil.
Seu objetivo é encontrar anúncios que representem a MELHOR OPORTUNIDADE de preço.

Regras de busca (USE A FERRAMENTA DE BUSCA):
1. A busca deve ser ampla o suficiente para encontrar o produto na região (OLX, Desapega, Mercado Livre, etc.).
2. **CRITÉRIO DE OPORTUNIDADE (PRIORIDADE MÁXIMA):** Traga apenas anúncios que, em sua análise, foram publicados **HOJE ou ONTEM** e que o preço esteja nitidamente **abaixo do valor de mercado** para aquele produto/condição.
3. Para cada achado, retorne um objeto na lista 'items' com as chaves: title, price (o valor formatado), location, date (data de publicação), analysis (análise breve, 1-2 frases sobre o achado e porque é uma oportunidade), link (URL do anúncio), e img (URL da imagem principal).
4. Retorne APENAS o JSON no bloco de código Markdown. Se NENHUM RESULTADO FOR ENCONTRADO, retorne estritamente: \`\`\`json\n{"items": []}\n\`\`\`
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

// O bloco de parsing mais robusto
const tryParseJson = (text) => {
let cleanedText = text.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();

try {
const parsed = JSON.parse(cleanedText);
return parsed;
} catch (e) {
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
return res.status(200).json({ error: 'Formato de resposta inválido da API. (Raw)', raw: jsonText });
}

return res.status(200).json({ items: Array.isArray(items) ? items : [] });

} catch (err) {
console.error('Erro de Fetch/Rede na API:', err);
return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
}
}