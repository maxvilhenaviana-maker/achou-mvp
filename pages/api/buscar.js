import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { busca, localizacao } = req.body;

  if (!busca || !localizacao) {
    return res.status(400).json({ error: 'Dados incompletos' });
  }

  const GOOGLEMAPS_KEY = process.env.GOOGLEMAPS_KEY;
  const [lat, lng] = localizacao.split(',').map(v => v.trim());

  // 🔎 Mapeamento inteligente de tipos
  const typeMap = {
    farmácia: 'pharmacy',
    farmacia: 'pharmacy',
    restaurante: 'restaurant',
    mercado: 'supermarket',
    padaria: 'bakery',
    posto: 'gas_station'
  };

  const buscaLower = busca.toLowerCase();
  const placeType = Object.keys(typeMap).find(k => buscaLower.includes(k));

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');

  url.searchParams.append('location', `${lat},${lng}`);
  url.searchParams.append('rankby', 'distance');
  url.searchParams.append('keyword', busca);
  url.searchParams.append('key', GOOGLEMAPS_KEY);

  if (placeType) {
    url.searchParams.append('type', typeMap[placeType]);
  }

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return res.status(200).json({ resultado: null });
    }

    // 📏 Filtro REAL por distância (máx 1.500m)
    const resultadosFiltrados = data.results.filter(p => {
      if (!p.geometry?.location) return false;

      const dLat = (p.geometry.location.lat - lat) * 111000;
      const dLng = (p.geometry.location.lng - lng) * 111000;
      const distancia = Math.sqrt(dLat ** 2 + dLng ** 2);

      return distancia <= 1500;
    });

    const melhor = resultadosFiltrados[0] || data.results[0];

    const resultadoFinal = {
      nome: melhor.name,
      endereco: melhor.vicinity,
      rating: melhor.rating || '—',
      aberto: melhor.opening_hours?.open_now ?? null,
      mapsUrl: `https://www.google.com/maps/place/?q=place_id:${melhor.place_id}`
    };

    return res.status(200).json({ resultado: resultadoFinal });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao consultar Google Places' });
  }
}
