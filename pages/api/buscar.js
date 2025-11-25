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

Regras de busca (USE A FERRAMENTA DE BUSCA):
1. Acesse OLX, Desapega, Mercado Livre ou equivalentes, usando a ferramenta de busca fornecida.
2. Traga apenas anúncios publicados HOJE ou ONTEM na região informada.
3. Selecione apenas anúncios com preço abaixo do valor de mercado.
4. Para cada anúncio, retorne: title (título), price (apenas o valor numérico, sem R$), location (localização), date (data de publicação), analysis (análise breve, 1-2 frases sobre o achado), link (URL do anúncio), img (URL da imagem principal).
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
maxOutputTokens: 1024, // Aumentado para dar mais espaço ao modelo
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

// Se jsonText estiver vazio (Resposta vazia ou inválida), retorna erro 500
if (!jsonText) {
console.error("Resposta da API vazia ou sem texto de candidato.");
return res.status(500).json({ error: 'Resposta da API vazia ou inválida.' });
}

let items = [];
let rawText = jsonText;

// Tenta fazer o parse do JSON
try {
const parsed = JSON.parse(jsonText);
items = parsed.items || parsed;
} catch (e) {
// Se falhar o parse, tenta encontrar o JSON usando regex (caso o modelo inclua texto extra)
const match = jsonText.match(/\{[\s\S]*\}/);
if (match) {
try {
const p2 = JSON.parse(match[0]);
items = p2.items || p2;
rawText = match[0];
} catch (e2) {
// Falha ao extrair JSON válido, retorna o texto bruto como 'raw'
console.error('Erro ao tentar extrair JSON com regex:', e2);
return res.status(200).json({ error: 'Formato de resposta inválido da API. (Raw)', raw: rawText });
}
} else {
// Não encontrou nenhum JSON, retorna o texto bruto como 'raw'
return res.status(200).json({ error: 'Resposta não contém JSON.', raw: rawText });
}
}

// Retorna os itens extraídos
return res.status(200).json({ items: Array.isArray(items) ? items : [] });

} catch (err) {
// Captura erros de rede/fetch que resultam em "Erro na API do Gemini"
console.error('Erro de Fetch/Rede na API:', err);
return res.status(500).json({ error: 'Erro de comunicação com o servidor API.', details: String(err) });
}
}