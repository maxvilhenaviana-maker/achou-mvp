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
  const [localizacao, setLocalizacao] = useState(''); // Pode ser "Cidade/Bairro" ou "Lat/Long"
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [detectando, setDetectando] = useState(false);

  // Geolocalização Automática ao abrir
  useEffect(() => {
    if ("geolocation" in navigator) {
      setDetectando(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocalizacao(`${latitude}, ${longitude}`);
          setDetectando(false);
        },
        (error) => {
          console.error("Erro ao obter localização", error);
          setDetectando(false);
        }
      );
    }
  }, []);

  async function handleSearch(termo) {
    const query = termo || buscaLivre;
    if (!query) { alert('O que você procura?'); return; }
    if (!localizacao) { alert('Aguarde a detecção da sua localização ou digite uma.'); return; }
    
    setLoading(true);
    setResultado(null);
    
    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busca: query, localizacao: localizacao })
      });
      const json = await resp.json();
      setResultado(json.resultado);
    } catch (err) {
      alert('Erro na busca local.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header style={{ textAlign: 'center', marginBottom: '25px' }}>
        <img src="/logo-512.png" style={{ width: '60px' }} alt="Logo" />
        <h1 style={{ margin: '10px 0 5px', fontSize: '1.8rem' }}>achou.net.br</h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
           <span style={{ fontSize: '12px', color: detectando ? '#ff9f43' : '#28d07e' }}>
             {detectando ? '🛰️ Detectando sua posição...' : '📍 Localização Ativa'}
           </span>
        </div>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <input 
          className="input" 
          style={{ width: '100%', padding: '15px', boxSizing: 'border-box', textAlign: 'center', border: '1px dashed #ccc' }}
          placeholder="Sua localização (detectada automaticamente)" 
          value={localizacao.includes(',') ? "Localização por GPS ativa" : localizacao}
          onChange={e => setLocalizacao(e.target.value)}
        />
      </div>

      <div className="grid-botoes">
        {CATEGORIAS.map(cat => (
          <button key={cat.id} className="btn-cat" onClick={() => handleSearch(cat.id)} disabled={loading}>
            <div style={{ fontSize: '28px' }}>{cat.icon}</div>
            <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '5px', textTransform: 'uppercase' }}>{cat.id}</div>
          </button>
        ))}
      </div>

      <div className="searchRow" style={{ marginTop: '20px' }}>
        <input 
          className="input" 
          placeholder="Outra coisa? (ex: borracheiro)" 
          value={buscaLivre}
          onChange={e => setBuscaLivre(e.target.value)}
        />
        <button className="btn-search" onClick={() => handleSearch()} disabled={loading}>
          {loading ? '...' : '🔍'}
        </button>
      </div>

      {loading && (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Consultando radar de proximidade...</p>
        </div>
      )}
      
      {resultado && <ResultCard content={resultado} />}

      <style jsx>{`
        .grid-botoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .btn-cat {
          background: #fff; border: 1px solid #eee; padding: 20px 10px; border-radius: 16px;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }
        .btn-cat:active { transform: translateY(2px); background: #f9f9f9; }
        .searchRow { display: flex; gap: 8px; }
        .btn-search { background: #0F2133; color: white; border: none; border-radius: 12px; width: 60px; font-size: 20px; cursor: pointer; }
        .loader-container { text-align: center; padding: 30px; color: #666; }
        .spinner { 
          border: 4px solid #f3f3f3; border-top: 4px solid #28d07e; border-radius: 50%; 
          width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}