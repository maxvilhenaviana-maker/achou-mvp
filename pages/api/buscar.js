// pages/api/buscar.js
export const config = { api: { bodyParser: true }, runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY não configurada no ambiente.');
    return res.status(500).json({ error: 'OPENAI_API_KEY ausente' });
  }

  const { produto, cidade, raio } = req.body || {};
  if (!produto || !cidade) return res.status(400).json({ error: 'produto e cidade são obrigatórios' });

  const systemPrompt = `
Você é um agente de busca automática de oportunidades no Brasil.
Regras:
- Foque em OLX, Desapega, Mercado Livre ou equivalentes.
- Traga apenas anúncios publicados HOJE ou ONTEM na região informada.
- Selecione apenas anúncios com preço abaixo do valor de mercado.
- Para cada anúncio retorne: title, price, location, date, analysis (1-2 frases), link, image_url.
- Retorne SOMENTE um JSON com {"items":[ ... ]}.
- Se nada for encontrado, retorne {"items":[]}.
- Não invente anúncios e não inclua texto fora do JSON.
`;

  const userPrompt = `
Produto: ${produto}
Cidade/Região: ${cidade}
Raio (km): ${raio || 40}

Execute a varredura e retorne apenas o JSON conforme instruído.
`;

  const requestBody = {
    model: "gpt-4.1",
    // Usamos "input" com roles para a Responses API (aceita array ou string; mantemos roles)
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    // Solicita ao modelo que utilize Bing web search (se sua conta/plan permitir)
    web: { search: { use_bing: true } },
    max_output_tokens: 1200,
    temperature: 0.0
  };

  // LOG para depuração no Vercel — remove se quiser esconder
  console.log('--- /api/buscar requestBody ---');
  console.log(JSON.stringify(requestBody, null, 2));

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      // timeout no fetch do Node não é trivial; Vercel já mata a função se exceder runtime
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error('OpenAI API returned non-OK:', resp.status, text);
      // devolve detalhes para o front (úteis para debug; remova detalhes em produção)
      return res.status(resp.status).json({ error: 'Erro OpenAI', details: text });
    }

    // tenta interpretar a resposta da OpenAI
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Falha ao parsear JSON da OpenAI:', e, 'raw:', text);
      return res.status(200).json({ error: 'Resposta inválida da OpenAI', raw: text });
    }

    // Extrair texto útil da resposta (robusto para várias formas de retorno)
    let rawOutputText = "";
    if (json.output_text) {
      rawOutputText = json.output_text;
    } else if (Array.isArray(json.output) && json.output.length > 0) {
      // procurar por content blocks
      for (const out of json.output) {
        if (Array.isArray(out.content)) {
          for (const part of out.content) {
            if (part.type === 'output_text' && part.text) {
              rawOutputText += part.text + "\n";
            } else if (part.type === 'message' && part.role && part.content) {
              // content pode ser array
              if (typeof part.content === 'string') rawOutputText += part.content + "\n";
              else if (Array.isArray(part.content)) {
                for (const c of part.content) {
                  if (c.type === 'output_text') rawOutputText += (c.text || '') + "\n";
                }
              }
            }
          }
        } else if (typeof out === 'string') {
          rawOutputText += out + "\n";
        }
      }
    } else {
      rawOutputText = JSON.stringify(json);
    }

    const cleaned = rawOutputText.replace(/```json|```/g, '').trim();

    // Tenta parsear o JSON que o modelo deve ter retornado
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // tentar extrair primeiro objeto JSON no texto
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (e2) {
          console.error('Falha no parse even after extraction:', e2);
          return res.status(200).json({ raw: cleaned });
        }
      } else {
        console.error('Nenhum JSON encontrado no output do modelo. Raw:', cleaned);
        return res.status(200).json({ raw: cleaned });
      }
    }

    const items = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);
    return res.status(200).json({ items });
  } catch (err) {
    console.error('Erro fetch OpenAI:', err);
    return res.status(500).json({ error: 'Erro interno', details: String(err) });
  }
}
