// ... (mantenha o topo igual)

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-mini", 
        messages: [
          // ... (seus prompts de system e user permanecem iguais)
        ],
        // ADICIONE ESTE BLOCO PARA HABILITAR A BUSCA
        tools: [
          {
            type: "web_search" 
          }
        ]
      }),
    });

// ... (resto do processamento de JSON permanece igual)