import { NextResponse } from 'next/server';
// [NOVO] Importação do cliente Neon para salvar no banco
import { neon } from '@neondatabase/serverless';

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
    bairro: "Burits", // Mantido "Burits" propositalmente
    cidade_estado: "Belo Horizonte - MG",
    status: "Aberto agora",
    horario: "22:00", // Horário estático para o cliente teste
    telefone: "(31) 98823-4548",
    distancia: "0.2 km", 
    motivo: "Este estabelecimento é um parceiro premium no seu bairro com atendimento garantido."
  }
];

export default async function handler(req, res) {
  // [NOVO] Inicializa a conexão com o banco usando a variável da Vercel
  const sql = neon(process.env.DATABASE_URL);

  // --- BLOQUEIO GEOGRÁFICO ---
  const country = req.headers['x-vercel-ip-country'] || 'BR';
  if (process.env.NODE_ENV !== 'development' && country !== 'BR') {
    return res.status(403).json({ 
      error: "Acesso restrito ao território brasileiro.",
      message: "Este aplicativo está disponível apenas no Brasil." 
    });
  }

  if (req.method !== "POST") return res.status(405).end();

  const { busca, localizacao, excluir = [], endereco, modo } = req.body;
  const GOOGLE_KEY = process.env.GOOGLEMAPS_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!GOOGLE_KEY) return res.status(500).json({ error: "GOOGLEMAPS_KEY não configurada" });

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
        // Extrai Cidade
        const cityComp = components.find(c => c.types.includes("administrative_area_level_2")) ||
                         components.find(c => c.types.includes("locality"));
        if (cityComp) cidade = cityComp.long_name;

        // Extrai Estado
        const stateComp = components.find(c => c.types.includes("administrative_area_level_1"));
        if (stateComp) estado = stateComp.short_name;

        // Extrai País
        const countryComp = components.find(c => c.types.includes("country"));
        if (countryComp) pais = countryComp.long_name;
      }

      return res.status(200).json({ cidade, estado, pais });
    } catch (e) {
      return res.status(500).json({ error: "Erro ao reverter geolocalização" });
    }
  }
  // -------------------------------------------------------------

  // Variáveis principais de coordenadas
  let lat = null;
  let lng = null;

  try {
    // --- LÓGICA DE DEFINIÇÃO DO PONTO DE BUSCA ---
    
    // CASO 1: BUSCA POR ENDEREÇO MANUAL (Prioridade se enviado)
    if (endereco && endereco.trim().length > 0) {
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${GOOGLE_KEY}`;
        const geocodeResp = await fetch(geocodeUrl);
        const geocodeData = await geocodeResp.json();

        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          lat = geocodeData.results[0].geometry.location.lat;
          lng = geocodeData.results[0].geometry.location.lng;
        } else {
          return res.status(200).json({
             resultado: JSON.stringify({
               nome: "Localização não encontrada",
               endereco: "Verifique os dados (Bairro, Cidade, Estado)",
               status: "Erro",
               motivo: "Não conseguimos localizar o endereço exato. Verifique se a Cidade e o Estado estão corretos.",
               horario: "",
               distancia: "",
               telefone: ""
             })
          });
        }
      } catch (errGeoCode) {
         console.error("Erro no geocoding manual:", errGeoCode);
         return res.status(500).json({ error: "Erro ao processar endereço manual" });
      }
    } 
    // CASO 2: BUSCA POR GPS (Padrão)
    else {
      const coords = localizacao.replace(/\s/g, '');
      const splitCoords = coords.split(",");
      lat = splitCoords[0];
      lng = splitCoords[1];
    }

    const termoBusca = busca.toLowerCase();
    
    // [EDITADO] Variáveis para armazenar local para o Log do Banco de Dados
    let bairroUsuario = "Desconhecido";
    let cidadeLog = "Desconhecido"; // [NOVO]
    let paisLog = "Brasil";         // [NOVO]

    // 2️⃣ IDENTIFICAR O BAIRRO/CIDADE DO PONTO DE BUSCA (Seja GPS ou Manual)
    try {
      const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_KEY}`;
      const geoResp = await fetch(geoUrl);
      const geoData = await geoResp.json();

      if (geoData.results && geoData.results.length > 0) {
        const components = geoData.results[0].address_components;
        
        // Bairro
        const neighborhood = components.find(c => 
          c.types.includes("sublocality") || c.types.includes("neighborhood")
        );
        if (neighborhood) bairroUsuario = neighborhood.long_name;

        // [NOVO] Captura Cidade para o Banco de Dados
        const cityComp = components.find(c => c.types.includes("administrative_area_level_2")) ||
                         components.find(c => c.types.includes("locality"));
        if (cityComp) cidadeLog = cityComp.long_name;

        // [NOVO] Captura País para o Banco de Dados
        const countryComp = components.find(c => c.types.includes("country"));
        if (countryComp) paisLog = countryComp.long_name;
      }
    } catch (errGeo) {
      console.error("Erro ao identificar bairro:", errGeo);
    }

    // Função Auxiliar para Salvar no Banco (Evita repetição de código)
    const salvarMetrica = async (nomeEstabelecimento) => {
      try {
        await sql`
          INSERT INTO log_buscas_achou 
          (origem_bairro, origem_cidade, origem_pais, tipo_estabelecimento, nome_estabelecimento, modo_busca)
          VALUES (
            ${bairroUsuario}, 
            ${cidadeLog}, 
            ${paisLog}, 
            ${termoBusca}, 
            ${nomeEstabelecimento},
            ${endereco ? 'Manual' : 'GPS'}
          )
        `;
      } catch (dbError) {
        console.error("Erro ao salvar no Neon DB:", dbError);
        // Não quebra a aplicação se o log falhar
      }
    };

    // 3️⃣ LÓGICA DE PRIORIZAÇÃO (CHECK CLIENTE)
    const clienteMatch = CLIENTES_ACHOU.find(c => 
      (termoBusca.includes(c.termoMatch) || termoBusca === c.tipo) && 
      bairroUsuario.toLowerCase() === c.bairro.toLowerCase() &&
      !excluir.includes(c.nome)
    );

    if (clienteMatch) {
      // [NOVO] Salva métrica do cliente prioritário
      await salvarMetrica(clienteMatch.nome);

      return res.status(200).json({
        resultado: JSON.stringify({
          nome: clienteMatch.nome,
          endereco: `${clienteMatch.endereco} - ${clienteMatch.bairro}, ${clienteMatch.cidade_estado}`,
          status: clienteMatch.status,
          horario: clienteMatch.horario,
          distancia: clienteMatch.distancia,
          telefone: clienteMatch.telefone,
          motivo: clienteMatch.motivo,
          bairro_usuario: bairroUsuario
        })
      });
    }

    // 4️⃣ BUSCA EXTERNA NO GOOGLE MAPS
    const tiposGoogle = {
      'farmácia': 'pharmacy',
      'farmacia': 'pharmacy',
      'restaurante': 'restaurant',
      'mercado': 'supermarket',
      'supermercado': 'supermarket',
      'padaria': 'bakery',
      'posto de gasolina': 'gas_station',
      'lazer': 'park'
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

    // --- LÓGICA DE FILTRAGEM INTELIGENTE ---
    listaResultados = listaResultados.filter(place => {
      const nome = place.name.toLowerCase();
      const types = (place.types || []).join(' ').toLowerCase();

      // FILTRO 1: Se buscou FARMÁCIA, proibir VETERINÁRIA
      if (termoBusca.includes('farmácia') || termoBusca.includes('farmacia')) {
        const termosVet = ['veterin', 'pet ', 'petshop', 'animal', 'bicho', 'agro'];
        if (termosVet.some(t => nome.includes(t)) || types.includes('veterinary_care')) {
          return false;
        }
      }

      // FILTRO 2: Se buscou MERCADO, proibir CONSULTORIAS/ESCRITÓRIOS
      if (termoBusca.includes('mercado') || termoBusca.includes('supermercado')) {
        const termosCorp = [
          'consult', 'admin', 'advoca', 'contabil', 'imobili', 
          'engenharia', 'marketing', 'associad', 'grupo', 'finance'
        ];
        if (termosCorp.some(t => nome.includes(t))) {
          return false;
        }
      }
      return true;
    });
    // ------------------------------------------------

    const melhor = listaResultados.find(place => !excluir.includes(place.name));

    if (!melhor) {
      // [NOVO] Salva métrica mesmo se não achou nada, para saber demanda reprimida
      await salvarMetrica("Nenhum local encontrado");

      return res.status(200).json({
        resultado: JSON.stringify({
          nome: "Nenhum local adequado encontrado",
          endereco: "Não informado",
          status: "Fechado ou Esgotado",
          horario: "-",
          distancia: "—",
          telefone: "Não informado",
          motivo: "Não encontramos estabelecimentos abertos correspondentes à categoria exata perto deste local.",
          bairro_usuario: bairroUsuario
        })
      });
    }

    // Pega detalhes do lugar encontrado
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${melhor.place_id}&fields=name,formatted_address,formatted_phone_number,geometry,opening_hours&key=${GOOGLE_KEY}`;
    const detailsResp = await fetch(detailsUrl);
    const detailsData = await detailsResp.json();
    const place = detailsData.result || {};

    const distKm = calcularDistancia(
      parseFloat(lat),
      parseFloat(lng),
      place.geometry?.location?.lat,
      place.geometry?.location?.lng
    );

    // --- LÓGICA PARA EXTRAIR HORÁRIO DE FECHAMENTO ---
    let horarioFechamento = "Consulte";
    try {
      if (place.opening_hours && place.opening_hours.periods) {
        const now = new Date();
        now.setHours(now.getHours() - 3); 
        const todayDay = now.getDay(); 

        const period = place.opening_hours.periods.find(p => p.open && p.open.day === todayDay);
        if (period && period.close) {
          const rawTime = period.close.time;
          const h = rawTime.substring(0, 2);
          const m = rawTime.substring(2, 4);
          horarioFechamento = `${h}:${m}`;
        } else if (place.opening_hours.open_now && !period) {
          horarioFechamento = "24h";
        }
      }
    } catch (e) {
      horarioFechamento = "Consulte";
    }
    // ------------------------------------------------

    let motivo = "Este é o local aberto mais próximo identificado.";
    
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
              { role: "system", content: "Você é um assistente de busca local. Responda em uma frase curta por que este local é a melhor escolha baseando-se no fato de estar aberto agora e ser próximo." },
              { role: "user", content: `Local: ${place.name}, Distância: ${distKm}km. O usuário buscou por: ${busca}.` }
            ]
          })
        });
        const aiData = await aiResp.json();
        motivo = aiData.choices?.[0]?.message?.content || motivo;
      } catch (_) { }
    }

    // [NOVO] Salva a métrica final no banco Neon
    await salvarMetrica(place.name || "Não informado");

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
    console.error(err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  if (!lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}
