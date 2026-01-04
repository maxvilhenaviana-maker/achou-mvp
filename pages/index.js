import { useState, useEffect } from 'react';
import ResultCard from '../components/ResultCard';

const CATEGORIAS = [
  { id: 'Farmácia', icon: '💊' },
  { id: 'Restaurante', icon: '🍴' },
  { id: 'Mercado', icon: '🛒' },
  { id: 'Padaria', icon: '🍞' },
  { id: 'Posto', icon: '⛽' },
  { id: 'Lazer', icon: '🌳' }
];

export default function Home() {
  const [buscaLivre, setBuscaLivre] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [detectando, setDetectando] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      setDetectando(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalizacao(`${pos.coords.latitude}, ${pos.coords.longitude}`);
          setDetectando(false);
        },
        () => setDetectando(false),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleSearch(termo) {
    const query = termo || buscaLivre;
    if (!query) return;
    
    setLoading(true);
    setResultado(null);
    
    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          busca: query, 
          localizacao: localizacao || "minha localização atual" 
        })
      });
      const json = await resp.json();
      setResultado(json.resultado);
    } catch (err) {
      alert('Erro na conexão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img src="/logo-512.png" style={{ width: '60px', borderRadius: '12px' }} alt="Logo" />
        <h1 style={{ margin: '10px 0 0', fontSize: '1.6rem', fontWeight: '800' }}>achou.net.br</h1>
        <p style={{ fontSize: '12px', color: detectando ? '#ff9f43' : '#28d07e' }}>
          {detectando ? '🛰️ Localizando...' : '📍 Radar Ativo'}
        </p>
      </header>

      <div className="grid-buttons">
        {CATEGORIAS.map(cat => (
          <button key={cat.id} className="btn-cat" onClick={() => handleSearch(cat.id)}>
            <span style={{ fontSize: '24px' }}>{cat.icon}</span>
            <span style={{ fontSize: '11px', fontWeight: '700' }}>{cat.id}</span>
          </button>
        ))}
      </div>

      <div className="search-bar">
        <input 
          className="input-free"
          placeholder="Outra busca..." 
          value={buscaLivre}
          onChange={e => setBuscaLivre(e.target.value)}
        />
        <button className="btn-go" onClick={() => handleSearch()}>🔍</button>
      </div>

      {loading && <div className="loader">Buscando o mais próximo...</div>}
      
      {resultado && <ResultCard content={resultado} />}

      <style jsx>{`
        .container { max-width: 450px; margin: 0 auto; padding: 20px; }
        .grid-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .btn-cat { 
          background: white; border: 1px solid #eee; padding: 15px 5px; border-radius: 15px;
          display: flex; flex-direction: column; align-items: center; cursor: pointer;
        }
        .search-bar { display: flex; margin-top: 15px; gap: 8px; }
        .input-free { flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #ddd; outline: none; }
        .btn-go { background: #0F2133; border: none; border-radius: 10px; padding: 0 15px; color: white; cursor: pointer; }
        .loader { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
      `}</style>
    </div>
  );
}