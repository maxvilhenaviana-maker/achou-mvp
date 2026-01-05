export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { busca, localizacao } = req.body;
  const GOOGLE_KEY = process.env.GOOGLEMAPS_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!GOOGLE_KEY) return res.status(500).json({ error: "GOOGLEMAPS_KEY ausente" });

  try {
    const coords = localizacao.replace(/\s/g, '');
    const [lat, lng] = coords.split(",");

    const tiposGoogle = {
      'farmácia': 'pharmacy',
      'restaurante': 'restaurant',
      'mercado': 'supermarket',
      'supermercado': 'supermarket',
      'padaria': 'bakery',
      'posto de gasolina': 'gas_station'
    };

    const termoBusca = busca.toLowerCase();
    const typeSelected = tiposGoogle[termoBusca] || '';

    let nearbyUrl = 
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&rankby=distance` + 
      `&opennow=true` +
      `&key=${GOOGLE_KEY}`;

    if (typeSelected) {
      nearbyUrl += `&type=${typeSelected}`;
    } else {
      // Se for Borracharia, adicionamos "pneu" para filtrar serviços de rodas e pneus apenas
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
          motivo: "Nenhum serviço de pneus e rodas aberto foi encontrado agora perto de você."
        })
      });
    }

    const melhor = nearbyData.results[0];
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${melhor.place_id}&fields=name,formatted_address,formatted_phone_number,geometry&key=${GOOGLE_KEY}`;
    
    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();
    const place = detailsData.result || {};

    const distKm = calcularDistancia(parseFloat(lat), parseFloat(lng), place.geometry?.location?.lat, place.geometry?.location?.lng);

    let motivo = "Especialista em pneus e rodas, aberto e próximo de você.";

    if (OPENAI_KEY) {
      try {
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              { role: "system", content: "Você é um assistente de busca local focado em utilidade. Se a busca for borracharia, foque apenas em pneus e rodas. Explique em uma frase curta por que este é o melhor local agora." },
              { role: "user", content: `Local: ${place.name}, Distância: ${distKm}km. Foco: Pneus e Rodas.` }
            ]
          })
        });
        const aiData = await aiResp.json();
        motivo = aiData.choices?.[0]?.message?.content || motivo;
      } catch (_) {}
    }

    return res.status(200).json({
      resultado: JSON.stringify({
        nome: place.name || "Não informado",
        endereco: place.formatted_address || "Não informado",
        status: "Aberto agora",
        distancia: distKm ? `${distKm} km` : "—",
        telefone: place.formatted_phone_number || "Não informado",
        motivo
      })
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro interno" });
  }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}