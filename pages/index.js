import { useState, useEffect } from 'react';
import Head from 'next/head';

// --- COMPONENTE: ResultCard ---
function ResultCard({ content }) {
  let local = {};
  try {
    local = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    local = {
      nome: "Erro",
      endereco: "Tente novamente",
      status: "Erro",
      motivo: "Erro na leitura",
      telefone: "",
      distancia: ""
    };
  }

  const copyToClipboard = () => {
    if (local.endereco) {
      navigator.clipboard.writeText(local.endereco);
      alert("📋 Endereço copiado para o GPS!");
    }
  };

  const shareWA = () => {
    const text = encodeURIComponent(
      `*${local.nome}*\n📍 ${local.endereco}\n🕒 ${local.status}\n📞 ${local.telefone}\n\nEncontrado via achou.net.br`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="card-container">
      <div className="card-header">
        <h2 className="card-title">{local.nome}</h2>
        <span className={`status-badge ${local.status?.toLowerCase().includes('fechado') ? 'fechado' : 'aberto'}`}>
          {local.status}
        </span>
      </div>

      <p className="card-reason">{local.motivo}</p>

      <div className="buttons-row">
        <button onClick={copyToClipboard} className="btn-card btn-dark">
          📋 Copiar Endereço
        </button>
        <button onClick={shareWA} className="btn-card btn-green">
          📱 WhatsApp
        </button>
      </div>

      <div className="details-box">
        <div className="detail-row">📍 {local.endereco}</div>
        <div className="detail-row">📏 {local.distancia}</div>
        <div className="detail-row">📞 {local.telefone}</div>
      </div>

      <style jsx>{`
        .card-container {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-top: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1px solid #f0f0f0;
          animation: slideUp 0.4s ease;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 10px;
        }
        .card-title {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #0F2133;
        }
        .status-badge {
          font-size: 0.7rem;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .aberto { background: #E6FFFA; color: #28D07E; }
        .fechado { background: #FFF5F5; color: #F56565; }
        .card-reason {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 20px;
        }
        .buttons-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        .btn-card {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }
        .btn-dark { background: #0F2133; color: white; }
        .btn-green { background: #25D366; color: white; }
        .details-box {
          background: #F8F9FB;
          border-radius: 8px;
          padding: 15px;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// --- CATEGORIAS ---
const CATEGORIAS = [
  { id: 'Farmácia', icon: '💊' },
  { id: 'Restaurante', icon: '🍴' },
  { id: 'Mercado', icon: '🛒' },
  { id: 'Padaria', icon: '🍞' },
  { id: 'Posto de gasolina', icon: '⛽' },
  { id: 'Borracharia', icon: '🛞' }
];

// --- PÁGINA PRINCIPAL ---
export default function Home() {
  const [buscaLivre, setBuscaLivre] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocalizacao(`${pos.coords.latitude},${pos.coords.longitude}`);
        setGpsAtivo(true);
      },
      () => setGpsAtivo(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  async function handleSearch(termo) {
    const query = termo || buscaLivre;
    if (!query) return alert('O que você precisa agora?');

    setLoading(true);
    setResultado(null);

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busca: query,
          localizacao: localizacao || '0,0'
        })
      });

      const json = await resp.json();
      if (json.resultado) setResultado(json.resultado);
      else alert('Nenhum resultado próximo encontrado.');
    } catch {
      alert('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-wrapper">
      <Head>
        <title>Achou! - Radar Local</title>
      </Head>

      <header className="header">
        <div className="logo-area">
          <img src="/logo-512.png" className="logo-img" />
          <div>
            <h1 className="app-name">achou.net.br</h1>
            <h2 className="app-subtitle">Encontrar perto de mim:</h2>
            <p className="gps-status">
              {gpsAtivo ? '🟢 Localização Ativada' : '⚪ Aguardando GPS...'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid-menu">
        {CATEGORIAS.map(cat => (
          <button key={cat.id} onClick={() => handleSearch(cat.id)}>
            {cat.icon} {cat.id}
          </button>
        ))}
      </div>

      <input
        value={buscaLivre}
        onChange={e => setBuscaLivre(e.target.value)}
        placeholder="O que você precisa agora?"
      />

      {loading && <p>Buscando o mais próximo de você...</p>}
      {resultado && <ResultCard content={resultado} />}
    </div>
  );
}
