export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

// 1️⃣ BANCO DE DADOS DE CLIENTES PRIORITÁRIOS (Belo Horizonte)
const CLIENTES_ACHOU = [
  {
    tipo: 'pharmacy', 
    termoMatch: 'farmácia', 
    nome: "Drogaria Teste de Indicação",
    endereco: "Rua Alessandra Salum Teste, 181",
    bairro: "Burits",
    cidade_estado: "Belo Horizonte - MG",
    status: "Aberto agora",
    telefone: "(31) 98823-4548",
    distancia: "0.2 km", 
    motivo: "Este estabelecimento é um parceiro premium no seu bairro com atendimento garantido."
  }
];

export default async function handler(req, res) {
  // --- BLOQUEIO GEOGRÁFICO ---
  // A Vercel identifica o país de origem via cabeçalho.
  const country = req.headers['x-vercel-ip-country'] || 'BR';
  
  // Ignora o bloqueio se estiver em ambiente de desenvolvimento local
  if (process.env.NODE_ENV !== 'development' && country !== 'BR') {
    return res.status(403).json({ 
      error: "Acesso restrito ao território brasileiro.",
      message: "Este aplicativo está disponível apenas no Brasil." 
    });
  }

  if (req.method !== "POST") return res.status(405).end();

  const { busca, localizacao } = req.body;
  const GOOGLE_KEY = process.env.GOOGLEMAPS_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!GOOGLE_KEY) return res.status(500).json({ error: "GOOGLEMAPS_KEY não configurada" });

  try {
    const coords = localizacao.replace(/\s/g, '');
    const [lat, lng] = coords.split(",");
    const termoBusca = busca.toLowerCase();

    // 2️⃣ IDENTIFICAR O BAIRRO DO USUÁRIO (Geocoding Reverso)
    const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`;
    const geoResp = await fetch(geoUrl);
    const geoData = await geoResp.json();
    
    let bairroUsuario = "";
    if (geoData.results && geoData.results.length > 0) {
      const addressComponents = geoData.results[0].address_components;
      const neighborhood = addressComponents.find(c => 
        c.types.includes("sublocality") || c.types.includes("neighborhood")
      );
      if (neighborhood) bairroUsuario = neighborhood.long_name;
    }

    // 3️⃣ LÓGICA DE PRIORIZAÇÃO (CHECK CLIENTE)
    const clienteMatch = CLIENTES_ACHOU.find(c => 
      (termoBusca.includes(c.termoMatch) || termoBusca === c.tipo) && 
      bairroUsuario.toLowerCase() === c.bairro.toLowerCase()
    );

    if (clienteMatch) {
      return res.status(200).json({
        resultado: JSON.stringify({
          nome: clienteMatch.nome,
          endereco: `${clienteMatch.endereco} - ${clienteMatch.bairro}, ${clienteMatch.cidade_estado}`,
          status: clienteMatch.status,
          distancia: clienteMatch.distancia,
          telefone: clienteMatch.telefone,
          motivo: clienteMatch.motivo
        })
      });
    }

    // 4️⃣ BUSCA EXTERNA NO GOOGLE MAPS
    const tiposGoogle = {
      'farmácia': 'pharmacy',
      'restaurante': 'restaurant',
      'mercado': 'supermarket',
      'supermercado': 'supermarket',
      'padaria': 'bakery',
      'posto de gasolina': 'gas_station'
    };

    const typeSelected = tiposGoogle[termoBusca] || '';
    let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&rankby=distance&opennow=true&key=${GOOGLE_KEY}`;

    if (typeSelected) {
      nearbyUrl += `&type=${typeSelected}`;
    } else {
      const refinedKeyword = termoBusca === 'borracharia' ? 'borracharia pneu' : busca;
      nearbyUrl += `&keyword=${encodeURIComponent(refinedKeyword)}`;
    }

    const nearbyResp = await fetch(nearbyUrl);
    const nearbyData = await nearbyResp.json();

    if (!nearbyData.results || nearbyData.results.length === 0) {
      return res.status(200).json({
        resultado: JSON.stringify({
          nome: "Nenhum local encontrado",
          endereco: "Não informado",
          status: "Fechado",
          distancia: "—",
          telefone: "Não informado",
          motivo: "Nenhum estabelecimento aberto foi encontrado exatamente agora perto de você."
        })
      });
    }

    const melhor = nearbyData.results[0];
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${melhor.place_id}&fields=name,formatted_address,formatted_phone_number,geometry&key=${GOOGLE_KEY}`;
    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();
    const place = detailsData.result || {};

    const distKm = calcularDistancia(
      parseFloat(lat),
      parseFloat(lng),
      place.geometry?.location?.lat,
      place.geometry?.location?.lng
    );

    let motivo = "Este é o local aberto mais próximo identificado pelo GPS.";

    // 5️⃣ CONSULTA AO CÉREBRO (AI) PARA O MOTIVO
    if (OPENAI_KEY) {
      try {
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              { role: "system", content: "Você é um assistente de busca local. Responda em uma frase curta por que este local é a melhor escolha baseando-se no fato de estar aberto agora e ser o mais próximo." },
              { role: "user", content: `Local: ${place.name}, Distância: ${distKm}km. O usuário buscou por: ${busca}.` }
            ]
          })
        });
        const aiData = await aiResp.json();
        motivo = aiData.choices?.[0]?.message?.content || motivo;
      } catch (_) {
        // Fallback silencioso caso a AI falhe
      }
    }

    return res.status(200).json({
      resultado: JSON.stringify({
        nome: place.name || "Não informado",
        endereco: place.formatted_address || "Não informado",
        status: "Aberto agora",
        distancia: distKm ? `${distKm} km` : "Não informado",
        telefone: place.formatted_phone_number || "Não informado",
        motivo
      })
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}

// Função Auxiliar: Cálculo de Haversine para distância real entre pontos
function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return null;
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}