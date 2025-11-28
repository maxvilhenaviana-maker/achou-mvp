import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function buscar(query) {
  try {
    console.log("=======================================");
    console.log("🔥 INICIANDO BUSCA");
    console.log("Query recebida:", query);

    const body = {
      model: "gpt-4.1",
      messages: [
        {
          role: "user",
          content: `Busque informações sobre: ${query}`
        }
      ]
      // ❗ NADA de "tools" aqui — vamos primeiro ver se seu código ainda envia algo escondido
    };

    console.log("\n➡️ Corpo ENVIADO para API:");
    console.log(JSON.stringify(body, null, 2));

    console.log("=======================================\n");

    const resposta = await client.chat.completions.create(body);

    console.log("🔥 RESPOSTA BRUTA DA API:");
    console.log(JSON.stringify(resposta, null, 2));

    return resposta;
  } catch (erro) {
    console.log("\n=======================================");
    console.error("❌ Erro capturado no try/catch:");
    console.error(JSON.stringify(erro, null, 2));
    console.log("=======================================\n");
  }
}

buscar(process.argv[2]);
