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

    // Remove espaços em branco das coordenadas para evitar erros na URL

    const coords = localizacao.replace(/\s/g, '');

    const [lat, lng] = coords.split(",");



    // 1️⃣ Mapeamento de termos para tipos oficiais do Google (Garante precisão no bairro)

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



    // 2️⃣ Google Places — Nearby Search

    // Usamos rankby=distance para garantir o mais próximo fisicamente

    let nearbyUrl = 

      `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +

      `?location=${lat},${lng}` +

      `&rankby=distance` + 

      `&opennow=true` +

      `&key=${GOOGLE_KEY}`;



    // Se for uma categoria fixa, usamos 'type'. Se for busca livre ou Borracharia, refinamos a keyword.

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

          motivo: "Nenhum estabelecimento aberto foi encontrado exatamente agora perto de você."

        })

      });

    }



    const melhor = nearbyData.results[0];



    // 3️⃣ Place Details — Para pegar telefone e endereço formatado

    const detailsUrl =

      `https://maps.googleapis.com/maps/api/place/details/json` +

      `?place_id=${melhor.place_id}` +

      `&fields=name,formatted_address,formatted_phone_number,geometry` +

      `&key=${GOOGLE_KEY}`;



    const detailsResp = await fetch(detailsUrl);

    const detailsData = await detailsResp.json();

    const place = detailsData.result || {};



    // 4️⃣ Cálculo de distância real

    const distKm = calcularDistancia(

      parseFloat(lat),

      parseFloat(lng),

      place.geometry?.location?.lat,

      place.geometry?.location?.lng

    );



    let motivo = "Este é o local aberto mais próximo identificado pelo GPS.";



    // 5️⃣ OpenAI para a frase de contexto

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

                content: "Você é um assistente de busca local de utilidade. Responda em uma frase curta e direta por que este local é a melhor escolha agora."

              },

              {

                role: "user",

                content: `Local: ${place.name}, Distância: ${distKm}km. O usuário buscou por: ${busca}.`

              }

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