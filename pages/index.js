import { useState, useEffect } from 'react';
import Head from 'next/head';

// --- COMPONENTE INTERNO: ResultCard ---
function ResultCard({ content }) {
  let local = {};
  try {
    local = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e) {
    local = { nome: "Erro", endereco: "Tente novamente", status: "Erro", motivo: "Erro na leitura", telefone: "", distancia: "" };
  }

  const copyToClipboard = () => {
    if (local.endereco && local.endereco !== "Não informado") {
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
      
      {/* BOTÕES DO CARD CORRIGIDOS */}
      <div className="card-buttons-row">
        <button onClick={copyToClipboard} className="btn-action btn-copy">📋 Copiar Endereço</button>
        <button onClick={shareWA} className="btn-action btn-whatsapp">📱 WhatsApp</button>
      </div>

      <div className="details-box">
        <div className="detail-row"><span>📍</span> {local.endereco}</div>
        <div className="detail-row"><span>📏</span> {local.distancia}</div>
        <div className="detail-row"><span>📞</span> {local.telefone}</div>
      </div>
      <style jsx>{`
        .card-container { background: white; border-radius: 16px; padding: 20px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 1px solid #f0f0f0; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 10px; }
        .card-title { margin: 0; font-size: 1.2rem; color: #0F2133; font-weight: 800; }
        .status-badge { font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; font-weight: bold; text-transform: uppercase; }
        .aberto { background: #E6FFFA; color: #28D07E; }
        .fechado { background: #FFF5F5; color: #F56565; }
        .card-reason { font-size: 0.9rem; color: #666; margin-bottom: 20px; line-height: 1.4; }
        
        .card-buttons-row { display: flex; gap: 10px; margin-bottom: 20px; width: 100%; }
        .btn-action { 
          flex: 1; 
          padding: 14px 8px; 
          border: none; 
          border-radius: 10px; 
          font-weight: bold; 
          cursor: pointer; 
          font-size: 0.85rem; 
          color: white;
          display: block;
        }
        .btn-copy { background: #0F2133; }
        .btn-whatsapp { background: #25D366; }
        
        .details-box { background: #F8F9FB; border-radius: 8px; padding: 15px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 10px; }
        .detail-row { display: flex; gap: 10px; color: #333; text-align: left; }
      `}</style>
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
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocalizacao(`${pos.coords.latitude},${pos.coords.longitude}`);
          setGpsAtivo(true);
        },
        () => setGpsAtivo(false),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      alert("Para salvar: no Android use 'Adicionar à tela inicial' no menu do Chrome. No iPhone, use o ícone de 'Compartilhar' e 'Adicionar à Tela de Início'.");
    }
  };

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
      alert('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-wrapper">
      <header className="header">
        <div className="logo-area">
          <img src="/logo-512.png" alt="Achou" className="logo-img" />
          <div className="title-box">
            <h1 className="app-name">achou.net.br</h1>
            <p className="gps-status">{gpsAtivo ? '🟢 GPS Ativo' : '⚪ Buscando GPS...'}</p>
          </div>
        </div>
        
        <button className="btn-install-main" onClick={handleInstallClick}>
          📲 Salvar este App
        </button>
      </header>

      <h2 className="section-title">Encontrar perto de mim:</h2>

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
          placeholder="O que você precisa?"
          className="search-input"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={() => handleSearch()} className="search-btn">🔍</button>
      </div>

      {loading && (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Localizando...</p>
        </div>
      )}

      {resultado && <ResultCard content={resultado} />}
      
      <style jsx>{`
        .main-wrapper { max-width: 480px; margin: 0 auto; padding: 20px; min-height: 100vh; background-color: #F8F9FB; font-family: sans-serif; text-align: center; }
        .header { margin-bottom: 24px; }
        .logo-area { display: flex; align-items: center; gap: 12px; justify-content: center; margin-bottom: 15px; }
        .logo-img { width: 48px; height: 48px; border-radius: 10px; }
        .title-box { text-align: left; }
        .app-name { margin: 0; font-size: 1.3rem; font-weight: 800; color: #0F2133; }
        .gps-status { margin: 0; font-size: 0.7rem; color: #666; }
        
        .btn-install-main {
          width: 100%;
          background: #0F2133;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 10px;
          font-weight: bold;
          font-size: 0.9rem;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .section-title { font-size: 1rem; color: #4A5568; margin: 20px 0 12px; font-weight: 600; text-align: left; }

        .grid-menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .btn-icon { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 15px 5px; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .emoji { font-size: 1.6rem; margin-bottom: 4px; }
        .label { font-size: 0.65rem; font-weight: 700; color: #4A5568; text-transform: uppercase; }
        
        .search-bar { display: flex; gap: 8px; }
        .search-input { flex: 1; padding: 12px; border: 1px solid #CBD5E0; border-radius: 10px; outline: none; }
        .search-btn { background: #0F2133; color: white; border: none; border-radius: 10px; padding: 0 15px; cursor: pointer; }
        
        .loading-area { margin-top: 20px; }
        .spinner { width: 24px; height: 24px; border: 3px solid #E2E8F0; border-top-color: #28D07E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}