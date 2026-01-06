import { useState, useEffect } from 'react';
import Head from 'next/head';

// --- COMPONENTE INTERNO: ResultCard (Consolidado para evitar erro de importação) ---
function ResultCard({ content }) {
  let local = {};
  try {
    local = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e) {
    local = { nome: "Erro", endereco: "Tente novamente", status: "Erro", motivo: "Erro na leitura", telefone: "", distancia: "" };
  }

  const copyToClipboard = () => {
    if (local.endereco) {
      navigator.clipboard.writeText(local.endereco);
      alert("📋 Endereço copiado para o GPS!");
    }
  };

  const shareWA = () => {
    const text = encodeURIComponent(`*${local.nome}*\n📍 ${local.endereco}\n🕒 ${local.status}\n📞 ${local.telefone}\n\nEncontrado via achou.net.br`);
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
        <button onClick={copyToClipboard} className="btn-card btn-dark">📋 Copiar Endereço</button>
        <button onClick={shareWA} className="btn-card btn-green">📱 WhatsApp</button>
      </div>
      <div className="details-box">
        <div className="detail-row"><span>📍</span> {local.endereco}</div>
        <div className="detail-row"><span>📏</span> {local.distancia}</div>
        <div className="detail-row"><span>📞</span> {local.telefone}</div>
      </div>
    </div>
  );
}

// --- COMPONENTE INTERNO: InstallBanner ---
function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="banner">
      <div className="banner-content">
        <span>📲 Adicionar Achou! à tela inicial?</span>
        <button onClick={handleInstall}>Instalar</button>
        <button onClick={() => setIsVisible(false)} className="close">✕</button>
      </div>
    </div>
  );
}

// --- PÁGINA PRINCIPAL ---
const CATEGORIAS = [
  { id: 'Farmácia', icon: '💊' },
  { id: 'Restaurante', icon: '🍴' },
  { id: 'Mercado', icon: '🛒' },
  { id: 'Padaria', icon: '🍞' },
  { id: 'Posto de gasolina', icon: '⛽' },
  { id: 'Borracharia', icon: '🛞' }
];

export default function Home() {
  const [buscaLivre, setBuscaLivre] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
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
        body: JSON.stringify({ busca: query, localizacao: localizacao || '0,0' })
      });
      const json = await resp.json();
      if (json.resultado) setResultado(json.resultado);
      else alert('Nenhum resultado próximo encontrado.');
    } catch (err) {
      alert('Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-wrapper">
      <header className="header">
        <div className="logo-area">
          <img src="/logo-512.png" alt="Achou" className="logo-img" />
          <div>
            <h1 className="app-name">achou.net.br</h1>
            <p className="gps-status">{gpsAtivo ? '🟢 Localização Ativada' : '⚪ Aguardando GPS...'}</p>
          </div>
        </div>
      </header>

      {/* ✅ SUBTÍTULO ADICIONADO — SEM ALTERAR LAYOUT */}
      <p className="subtitle">Encontrar perto de mim:</p>

      <div className="grid-menu">
        {CATEGORIAS.map((cat) => (
          <button key={cat.id} className="btn-icon" onClick={() => handleSearch(cat.id)} disabled={loading}>
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
        <button onClick={() => handleSearch()} className="search-btn" disabled={loading}>🔍</button>
      </div>

      {loading && (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Buscando o mais próximo de você...</p>
        </div>
      )}

      {resultado && <ResultCard content={resultado} />}

      <InstallBanner />

      <style jsx>{`
        .main-wrapper { max-width: 480px; margin: 0 auto; padding: 20px; min-height: 100vh; background-color: #F8F9FB; }
        .logo-area { display: flex; align-items: center; gap: 12px; justify-content: center; }
        .logo-img { width: 48px; height: 48px; border-radius: 10px; }
        .app-name { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0F2133; }
        .gps-status { margin: 0; font-size: 0.75rem; color: #666; }

        /* 🔒 Estilo neutro do subtítulo (não afeta layout) */
        .subtitle {
          text-align: center;
          font-size: 0.85rem;
          font-weight: 600;
          color: #4A5568;
          margin: 10px 0 14px;
        }
      `}</style>
    </div>
  );
}
