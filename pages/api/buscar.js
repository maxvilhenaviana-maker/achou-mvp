import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// [CORREÇÃO] Forçar runtime NodeJS para garantir que conexões com banco de dados funcionem corretamente
// e evitem problemas de Edge Runtime com o driver do Neon.
export const runtime = 'nodejs';

export const config = {
  api: {
    bodyParser: true,
  },
  maxDuration: 60,
};

// 1️⃣ BANCO DE DADOS DE CLIENTES PRIORITÁRIOS (Belo Horizonte)
const CLIENTES_ACHOU = [
  {
    tipo: 'Telemedicine', 
    termoMatch: 'Telemedicina', 
    nome: "DELTHA MED - TELEMEDICINA",
    endereco: "www.delthamed.com.br",
    bairro: "Buritis", // Mantido "Burits" propositalmente conforme solicitado
    cidade_estado: "Belo Horizonte - MG",
    status: "Aberto agora",
    horario: "22:00",
    telefone: "(31) 98823-4548",
    distancia: "0.2 km", 
    motivo: "Este estabelecimento é um parceiro premium na sua cidade."
  }
];

export default async function handler(req, res) {
  // [CORREÇÃO] Verificação explicita da variável de ambiente para debug
  if (!process.env.DATABASE_URL) {
    console.error("ERRO CRÍTICO: DATABASE_URL não definida!");
  }
  
  const sql = neon(process.env.DATABASE_URL);

  // --- BLOQUEIO GEOGRÁFICO ---
  const country = req.headers['x-vercel-ip-country'] || 'BR';
  if (process.env.NODE_ENV !== 'development' && country !== 'BR') {
    return res.status(403).json({ 
      error: "Acesso restrito ao território brasileiro.",
      message: "Este aplicativo está disponível apenas no Brasil." 
    });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { busca, localizacao, excluir = [], endereco, modo, campanha } = req.body;
  const GOOGLE_KEY = process.env.GOOGLEMAPS_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!GOOGLE_KEY) {
    return res.status(500).json({ error: "GOOGLEMAPS_KEY não configurada" });
  }

  // --- MODO: REVERSE GEOCODING (Para preencher inputs do front) ---
  if (modo === 'geo_reverse') {
    try {
      const coords = localizacao.replace(/\s/g, '');
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords}&key=${GOOGLE_KEY}`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();

      let cidade = "";
      let estado = "";
      let pais = "Brasil";

      if (geoData.results && geoData.results.length > 0) {
        const components = geoData.results[0].address_components;
        const cityComp = components.find(c => c.types.includes("administrative_area_level_2")) ||
                         components.find(c => c.types.includes("locality"));
        if (cityComp) cidade = cityComp.long_name;

        const stateComp = components.find(c => c.types.includes("administrative_area_level_1"));
        if (stateComp) estado = stateComp.short_name;

        const countryComp = components.find(c => c.types.includes("country"));
        if (countryComp) pais = countryComp.long_name;
      }

      return res.status(200).json({ cidade, estado, pais });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao reverter geolocalização" });
    }
  }

  let lat = null;
  let lng = null;
  
  // Variáveis para Log (Inicializadas para garantir que existam no final)
  let bairroUsuario = "Desconhecido";
  let cidadeLog = "Desconhecido";
  let paisLog = "Brasil";
  const termoBusca = busca.toLowerCase();

  // Função interna para salvar métrica de forma centralizada
  const salvarNoBanco = async (nomeFinal) => {
    try {
      console.log(`Tentando salvar log: ${nomeFinal} em ${bairroUsuario}`);
      await sql`
        INSERT INTO log_buscas_achou 
        (origem_bairro, origem_cidade, origem_pais, tipo_estabelecimento, nome_estabelecimento, busca_bairro, busca_cidade, busca_pais)
        VALUES (
          ${bairroUsuario}, ${cidadeLog}, ${paisLog}, 
          ${termoBusca}, ${nomeFinal}, 
          ${bairroUsuario}, ${cidadeLog}, ${paisLog}
        )
      `;
      console.log("Log salvo com sucesso!");
    } catch (e) {
      console.error("Erro ao gravar no banco:", e);
    }
  };

  try {
    // --- DEFINIÇÃO DO PONTO DE BUSCA ---
    if (endereco && endereco.trim().length > 0) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${GOOGLE_KEY}`;
      const geocodeResp = await fetch(geocodeUrl);
      const geocodeData = await geocodeResp.json();
      
      if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
        lat = geocodeData.results[0].geometry.location.lat;
        lng = geocodeData.results[0].geometry.location.lng;
      } else {
        // Log de erro antes de retornar
        await salvarNoBanco("Erro Localização Manual");
        return res.status(200).json({
             resultado: JSON.stringify({
               nome: "Localização não encontrada",
               endereco: "Verifique os dados (Bairro, Cidade, Estado)",
               status: "Erro",
               motivo: "Não conseguimos localizar o endereço exato.",
               horario: "", distancia: "", telefone: ""
             })
        });
      }
    } else {
      const coords = localizacao.replace(/\s/g, '');
      const splitCoords = coords.split(",");
      lat = splitCoords[0];
      lng = splitCoords[1];
    }

    // 2️⃣ IDENTIFICAR LOCALIZAÇÃO PARA O LOG
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();
      
      if (geoData.results && geoData.results.length > 0) {
        const components = geoData.results[0].address_components;
        const neighborhood = components.find(c => c.types.includes("sublocality") || c.types.includes("neighborhood"));
        if (neighborhood) bairroUsuario = neighborhood.long_name;

        const cityComp = components.find(c => c.types.includes("administrative_area_level_2")) ||
                         components.find(c => c.types.includes("locality"));
        if (cityComp) cidadeLog = cityComp.long_name;

        const countryComp = components.find(c => c.types.includes("country"));
        if (countryComp) paisLog = countryComp.long_name;
      }
    } catch (errGeo) {
      console.error("Erro no Geocoding reverso:", errGeo);
    }

    // 3️⃣ CHECK CLIENTE PRIORITÁRIO
    const clienteMatch = CLIENTES_ACHOU.find(c => 
      (termoBusca.includes(c.termoMatch) || termoBusca === c.tipo) && 
      bairroUsuario.toLowerCase() === c.bairro.toLowerCase() &&
      !excluir.includes(c.nome)
    );
    
    if (clienteMatch) {
      await salvarNoBanco(clienteMatch.nome);
      return res.status(200).json({
        resultado: JSON.stringify({
          ...clienteMatch,
          bairro_usuario: bairroUsuario
        })
      });
    }

    // 4️⃣ BUSCA GOOGLE MAPS
    const tiposGoogle = {
      'farmácia': 'pharmacy', 'farmacia': 'pharmacy',
      'restaurante': 'restaurant', 'mercado': 'supermarket',
      'supermercado': 'supermarket', 'padaria': 'bakery',
      'posto de gasolina': 'gas_station', 'lazer': 'park'
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
    let listaResultados = nearbyData.results || [];

    // Filtros de qualidade
    listaResultados = listaResultados.filter(place => {
      const nome = place.name.toLowerCase();
      const types = (place.types || []).join(' ').toLowerCase();
      if (termoBusca.includes('farmácia') || termoBusca.includes('farmacia')) {
        if (['veterin', 'pet ', 'petshop', 'animal', 'bicho', 'agro'].some(t => nome.includes(t)) || types.includes('veterinary_care')) return false;
      }
      if (termoBusca.includes('mercado') || termoBusca.includes('supermercado')) {
        if (['consult', 'admin', 'advoca', 'contabil', 'imobili', 'engenharia'].some(t => nome.includes(t))) return false;
      }
      return true;
    });

    const melhor = listaResultados.find(place => !excluir.includes(place.name));

    if (!melhor) {
      await salvarNoBanco("Nenhum encontrado");
      return res.status(200).json({
        resultado: JSON.stringify({
          nome: "Nenhum local adequado encontrado",
          endereco: "Não informado",
          status: "Fechado ou Esgotado",
          horario: "-", distancia: "—", telefone: "Não informado",
          // [ALTERAÇÃO 2] Mensagem específica quando não há estabelecimentos abertos
          motivo: "Neste momento este tipo de estabelecimento não está aberto. Tente novamente no horário comercial",
          bairro_usuario: bairroUsuario
        })
      });
    }

    // Detalhes do Lugar
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${melhor.place_id}&fields=name,formatted_address,formatted_phone_number,geometry,opening_hours&key=${GOOGLE_KEY}`;
    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();
    const place = detailsData.result || {};
    
    const distKm = calcularDistancia(parseFloat(lat), parseFloat(lng), place.geometry?.location?.lat, place.geometry?.location?.lng);

    // Horário
    let horarioFechamento = "Consulte";
    try {
      if (place.opening_hours && place.opening_hours.periods) {
        const now = new Date();
        now.setHours(now.getHours() - 3); 
        const todayDay = now.getDay(); 
        const period = place.opening_hours.periods.find(p => p.open && p.open.day === todayDay);
        
        if (period && period.close) {
          horarioFechamento = `${period.close.time.substring(0, 2)}:${period.close.time.substring(2, 4)}`;
        } else if (place.opening_hours.open_now && !period) {
          horarioFechamento = "24h";
        }
      }
    } catch (e) { horarioFechamento = "Consulte"; }

    let motivo = "Este é o local aberto mais próximo identificado.";
    
    // OpenAI para o Motivo com [ALTERAÇÃO 1] de incentivo
    if (OPENAI_KEY) {
      try {
        const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.3,
            messages: [
              { role: "system", content: `Você é um assistente de busca local. Responda em uma frase curta por que este local é a melhor escolha baseando-se no fato de estar aberto agora e ser próximo. Ao final, adicione uma frase curta incentivando a ${campanha === 'sangue' ? 'doação de sangue' : 'doação de órgãos'}.` },
              { role: "user", content: `Local: ${place.name}, Distância: ${distKm}km. O usuário buscou por: ${busca}.` }
            ]
          })
        });
        const aiData = await aiResp.json();
        motivo = aiData.choices?.[0]?.message?.content || motivo;
      } catch (_) { }
    }

    // [SALVAR NO BANCO]
    // Await garantido antes da resposta
    await salvarNoBanco(place.name || "Sem Nome");
    
    return res.status(200).json({
      resultado: JSON.stringify({
        nome: place.name || "Não informado",
        endereco: place.formatted_address || "Não informado",
        status: "Aberto agora",
        horario: horarioFechamento,
        distancia: distKm ? `${distKm} km` : "Não informado",
        telefone: place.formatted_phone_number || "Não informado",
        motivo,
        bairro_usuario: bairroUsuario
      })
    });

  } catch (err) {
    console.error("Erro geral no handler:", err);
    // Tenta salvar o erro no banco se possível
    try {
      await salvarNoBanco(`Erro Interno: ${err.message}`);
    } catch(e) {}
    
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);

}
