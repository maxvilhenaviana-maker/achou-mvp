import { useState, useEffect } from 'react';
import ResultCard from '../components/ResultCard';
import Head from 'next/head';

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
  const [gpsAtivo, setGpsAtivo] = useState(false);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalizacao(`${pos.coords.latitude}, ${pos.coords.longitude}`);
          setGpsAtivo(true);
        },
        (err) => console.error("GPS Error", err),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleSearch(termo) {
    const query = termo || buscaLivre;
    if (!query) return alert("O que você procura?");
    
    setLoading(true);
    setResultado(null);
    
    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          busca: query, 
          localizacao: localizacao || "centro da cidade" 
        })
      });
      
      const json = await resp.json();
      if(json.resultado) {
        setResultado(json.resultado);
      } else {
        alert("Não foi possível encontrar resultados.");
      }
    } catch (err) {
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-wrapper">
      <Head>
        <title>Achou.net.br</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="header">
        <div className="logo-area">
          <img src="/logo-512.png" alt="Achou" className="logo-img" />
          <div>
            <h1 className="app-name">achou.net.br</h1>
            <p className="gps-status">
              {gpsAtivo ? '🟢 GPS Ativado' : '⚪ Aguardando GPS...'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid-menu">
        {CATEGORIAS.map(cat => (
          <button key={cat.id} className="btn-icon" onClick={() => handleSearch(cat.id)} disabled={loading}>
            <span className="emoji">{cat.icon}</span>
            <span className="label">{cat.id}</span>
          </button>
        ))}
      </div>

      <div className="search-bar">
        <input 
          value={buscaLivre} 
          onChange={e => setBuscaLivre(e.target.value)} 
          placeholder="O que você precisa agora?"
          className="search-input"
        />
        <button onClick={() => handleSearch()} className="search-btn" disabled={loading}>
          🔍
        </button>
      </div>

      {loading && (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Localizando a melhor opção...</p>
        </div>
      )}

      {resultado && <ResultCard content={resultado} />}

      <style jsx>{`
        .main-wrapper {
          max-width: 480px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          background-color: #F8F9FB;
        }

        .header { margin-bottom: 25px; }
        .logo-area { display: flex; align-items: center; gap: 12px; justify-content: center; }
        .logo-img { width: 48px; height: 48px; border-radius: 10px; }
        .app-name { margin: 0; font-size: 1.4rem; color: #0F2133; font-weight: 800; letter-spacing: -0.5px; }
        .gps-status { margin: 0; font-size: 0.75rem; color: #666; font-weight: 500; }

        .grid-menu {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .btn-icon {
          background: white;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 16px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: transform 0.1s, background 0.1s;
        }
        .btn-icon:active { transform: scale(0.96); background: #F7FAFC; }
        
        .emoji { font-size: 1.8rem; margin-bottom: 4px; }
        .label { font-size: 0.75rem; font-weight: 700; color: #4A5568; text-transform: uppercase; }

        .search-bar { display: flex; gap: 8px; }
        .search-input {
          flex: 1;
          padding: 14px;
          border: 1px solid #CBD5E0;
          border-radius: 10px;
          font-size: 1rem;
          outline: none;
        }
        .search-input:focus { border-color: #0F2133; }
        
        .search-btn {
          background: #0F2133;
          color: white;
          border: none;
          border-radius: 10px;
          width: 50px;
          font-size: 1.2rem;
          cursor: pointer;
        }

        .loading-area { text-align: center; margin-top: 30px; color: #718096; font-weight: 500; }
        .spinner {
          width: 24px; height: 24px;
          border: 3px solid #E2E8F0;
          border-top-color: #28D07E;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}