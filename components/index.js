import { useState, useEffect } from 'react';
import Head from 'next/head';
import ResultCard from '../components/ResultCard';

const CATEGORIAS = [
  { id: 'Farmácia', icon: '💊' },
  { id: 'Restaurante', icon: '🍴' },
  { id: 'Mercado', icon: '🛒' },
  { id: 'Padaria', icon: '🍞' },
  { id: 'Posto de gasolina', icon: '⛽' },
  { id: 'Lazer', icon: '🌳' }
];

export default function Home() {
  const [buscaLivre, setBuscaLivre] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [gpsNegado, setGpsNegado] = useState(false);

  // 📍 Captura da localização com alta precisão
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    // Detecta status da permissão (importante para iOS)
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((res) => {
        if (res.state === 'denied') {
          setGpsNegado(true);
          setGpsAtivo(false);
        }
      });
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocalizacao(`${lat},${lng}`);
        setGpsAtivo(true);
        setGpsNegado(false);
      },
      (err) => {
        console.error('Erro ao obter GPS:', err);
        setGpsAtivo(false);
        setGpsNegado(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, []);

  function abrirAjustes() {
    window.location.href = 'app-settings:';
  }

  async function handleSearch(termo) {
    const query = termo || buscaLivre;

    if (!query) {
      alert('O que você precisa agora?');
      return;
    }

    if (!gpsAtivo) {
      setGpsNegado(true);
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busca: query,
          localizacao
        })
      });

      const json = await resp.json();

      if (json.resultado) {
        setResultado(json.resultado);
      } else {
        alert('Nenhum resultado encontrado.');
      }
    } catch (err) {
      console.error(err);
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

      {/* 🚨 MODAL DE GPS NEGADO */}
      {gpsNegado && (
        <div className="gps-modal">
          <div className="gps-box">
            <h2>📍 Ative sua localização</h2>
            <p>
              Para encontrar opções <strong>perto de você</strong>, o Achou precisa acessar sua localização.
            </p>
            <p className="hint">
              Ajustes → Privacidade e Segurança → Serviços de Localização → <b>Achou</b><br />
              Selecione <b>“Ao usar o App”</b> e ative <b>Localização Precisa</b>.
            </p>
            <div className="gps-actions">
              <button onClick={abrirAjustes} className="btn btn-dark">
                Abrir Ajustes
              </button>
              <button onClick={() => setGpsNegado(false)} className="btn btn-light">
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="header">
        <div className="logo-area">
          <img src="/logo-512.png" alt="Achou" className="logo-img" />
          <div>
            <h1 className="app-name">achou.net.br</h1>
            <p className="gps-status">
              {gpsAtivo ? '🟢 Localização Ativada' : '⚪ Localização Desativada'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid-menu">
        {CATEGORIAS.map((cat) => (
          <button
            key={cat.id}
            className="btn-icon"
            onClick={() => handleSearch(cat.id)}
            disabled={loading}
          >
            <span className="emoji">{cat.icon}</span>
            <span className="label">{cat.id}</span>
          </button>
        ))}
      </div>

      <div className="search-bar">
        <input
          value={buscaLivre}
          onChange={(e) => setBuscaLivre(e.target.value)}
          placeholder="O que você precisa agora?"
          className="search-input"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={() => handleSearch()}
          className="search-btn"
          disabled={loading}
        >
          🔍
        </button>
      </div>

      {loading && (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Buscando o mais próximo de você...</p>
        </div>
      )}

      {resultado && <ResultCard content={resultado} />}

      <style jsx>{`
        .main-wrapper {
          max-width: 480px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          background-color: #F8F9FB;
        }

        .gps-modal {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .gps-box {
          background: white;
          padding: 24px;
          border-radius: 16px;
          max-width: 340px;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .gps-box h2 {
          margin-top: 0;
          color: #0F2133;
        }

        .hint {
          font-size: 0.8rem;
          color: #555;
          margin-top: 10px;
        }

        .gps-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .btn {
          flex: 1;
          padding: 12px;
          border-radius: 10px;
          font-weight: 600;
          border: none;
        }

        .btn-dark {
          background: #0F2133;
          color: white;
        }

        .btn-light {
          background: #E2E8F0;
          color: #333;
        }
      `}</style>
    </div>
  );
}
