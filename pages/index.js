import { useState, useEffect } from 'react';
import ResultCard from '../components/ResultCard';

const CATEGORIAS = [
  { id: 'Farmácia', icon: '💊' }, { id: 'Restaurante', icon: '🍴' },
  { id: 'Mercado', icon: '🛒' }, { id: 'Padaria', icon: '🍞' },
  { id: 'Posto', icon: '⛽' }, { id: 'Lazer', icon: '🌳' }
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
        body: JSON.stringify({ busca: query, localizacao })
      });
      const json = await resp.json();
      setResultado(json.resultado);
    } catch (err) {
      alert('Erro na busca.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="main-header">
        <img src="/logo-512.png" className="logo" alt="Logo" />
        <div className="header-text">
          <h1>achou.net.br</h1>
          <p className={detectando ? 'status-off' : 'status-on'}>
            {detectando ? '🛰️ Localizando...' : '📍 Radar Ativo'}
          </p>
        </div>
      </header>

      <div className="grid-buttons">
        {CATEGORIAS.map(cat => (
          <button key={cat.id} className="btn-cat" onClick={() => handleSearch(cat.id)}>
            <span className="icon">{cat.icon}</span>
            <span className="label">{cat.id}</span>
          </button>
        ))}
      </div>

      <div className="search-row">
        <input 
          className="input-free" 
          placeholder="O que você precisa agora?" 
          value={buscaLivre}
          onChange={e => setBuscaLivre(e.target.value)}
        />
        <button className="btn-go" onClick={() => handleSearch()}>🔍</button>
      </div>

      {loading && <div className="loader">Buscando o mais próximo aberto...</div>}
      {resultado && <ResultCard content={resultado} />}

      <style jsx>{`
        .container { max-width: 500px; margin: 0 auto; padding: 20px; font-family: sans-serif; }
        .main-header { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; justify-content: center; }
        .logo { width: 50px; height: 50px; border-radius: 10px; }
        .header-text h1 { margin: 0; font-size: 1.5rem; color: #0f2133; }
        .header-text p { margin: 0; font-size: 12px; font-weight: bold; }
        .status-on { color: #28d07e; }
        .status-off { color: #ff9f43; }
        .grid-buttons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .btn-cat { background: #fff; border: 1px solid #eee; padding: 15px 5px; border-radius: 15px; cursor: pointer; display: flex; flex-direction: column; align-items: center; }
        .btn-cat .icon { font-size: 24px; }
        .btn-cat .label { font-size: 11px; font-weight: bold; margin-top: 5px; text-transform: uppercase; color: #444; }
        .search-row { display: flex; gap: 8px; }
        .input-free { flex: 1; padding: 15px; border-radius: 12px; border: 1px solid #ddd; outline: none; }
        .btn-go { background: #0f2133; border: none; border-radius: 12px; padding: 0 20px; color: white; cursor: pointer; }
        .loader { text-align: center; margin-top: 30px; color: #666; font-weight: bold; }
      `}</style>
    </div>
  );
}