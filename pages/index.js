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
      <style jsx>{`
        .card-container { background: white; border-radius: 16px; padding: 20px; margin-top: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #f0f0f0; animation: slideUp 0.4s ease; }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 10px; }
        .card-title { margin: 0; font-size: 1.2rem; color: #0F2133; font-weight: 800; }
        .status-badge { font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; font-weight: bold; text-transform: uppercase; }
        .aberto { background: #E6FFFA; color: #28D07E; }
        .fechado { background: #FFF5F5; color: #F56565; }
        .card-reason { font-size: 0.9rem; color: #666; margin-bottom: 20px; line-height: 1.4; }
        .buttons-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .btn-card { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.85rem; }
        .btn-dark { background: #0F2133; color: white; }
        .btn-green { background: #25D366; color: white; }
        .details-box { background: #F8F9FB; border-radius: 8px; padding: 15px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 10px; }
        .detail-row { display: flex; gap: 10px; color: #333; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// --- COMPONENTE INTERNO: InstallBanner (Consolidado) ---
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
      <style jsx>{`
        .banner { position: fixed; bottom: 20px; left: 15px; right: 15px; background: #0F2133; color: white; padding: 15px; border-radius: 12px; z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .banner-content { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
        button { background: #28D07E; border: none; color: white; padding: 8px 15px; border-radius: 6px; font-weight: bold; cursor: pointer; }
        .close { background: transparent; padding: 5px; font-size: 1.2rem; }
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
      cons
