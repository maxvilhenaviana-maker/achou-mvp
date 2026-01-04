export const config = {
  api: { bodyParser: true },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { busca, localizacao } = req.body;

  const GOOGLE_KEY = process.env.GOOGLEMAPS_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!GOOGLE_KEY) {
    return res.status(500).json({ error: "GOOGLEMAPS_KEY não configurada" });
  }

  try {
    const [lat, lng] = localizacao.split(",").map(v => v.trim());

    // 1️⃣ Google Places — Nearby Search (ordenado por proximidade)
    const nearbyUrl =
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
      `?location=${lat},${lng}` +
      `&rankby=distance` +
      `&opennow=true` +
      `&keyword=${encodeURIComponent(busca)}` +
      `&key=${GOOGLE_KEY}`;

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
          motivo: "Nenhum estabelecimento aberto foi encontrado nas proximidades."
        })
      });
    }

    const melhor = nearbyData.results[0];

    // 2️⃣ Place Details — telefone e endereço completo
    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${melhor.place_id}` +
      `&fields=name,formatted_address,formatted_phone_number,geometry` +
      `&key=${GOOGLE_KEY}`;

    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();
    const place = detailsData.result || {};

    // 3️⃣ Distância real (Haversine)
    const distKm = calcularDistancia(
      lat,
      lng,
      place.geometry?.location?.lat,
      place.geometry?.location?.lng
    );

    let motivo = "Estabelecimento aberto mais próximo da sua localização.";

    // 4️⃣ OpenAI (opcional – só para explicação)
    if (OPENAI_KEY) {
      try {
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content:
                  "Explique em UMA frase curta por que este local é a melhor opção imediata."
              },
              {
                role: "user",
                content: JSON.stringify({
                  nome: place.name,
                  distancia: `${distKm} km`,
                  status: "Aberto agora"
                })
              }
            ]
          })
        });

        const aiData = await aiResp.json();
        motivo = aiData.choices?.[0]?.message?.content || motivo;
      } catch (_) {}
    }

    // 5️⃣ Retorno final (JSON PURO)
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

/* ===== UTIL ===== */
function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return null;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
}
function toRad(v) {
  return (v * Math.PI) / 180;
}
