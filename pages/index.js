import { useState, useEffect } from 'react';
import * as gtag from '../lib/gtag';

// --- COMPONENTE INTERNO: ResultCard ---
function ResultCard({ content, onRedo }) {
  let local = {};
  try {
    local = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e) {
    local = { nome: "Erro", endereco: "Tente novamente", status: "Erro", motivo: "Erro na leitura", telefone: "", distancia: "" };
  }

  const copyToClipboard = () => {
    if (local.endereco) {
      gtag.event({ action: 'conversion_gps', category: 'Engagement', label: local.nome });
      navigator.clipboard.writeText(local.endereco);
      alert("📋 Endereço copiado para o GPS!");
    }
  };

  const shareWA = () => {
    gtag.event({ action: 'conversion_whatsapp', category: 'Engagement', label: local.nome });
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
        {/* O botão agora chama a função de refazer que passamos por prop */}
        <button onClick={onRedo} className="btn-card btn-blue">🔄 Refazer</button>
        <button onClick={copyToClipboard} className="btn-card btn-dark">📋 Copiar</button>
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
        .buttons-row { display: flex; gap: 8px; margin-bottom: 20px; }
        .btn-card { flex: 1; padding: 12px 5px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 0.8rem; }
        .btn-dark { background: #0F2133; color: white; }
        .btn-green { background: #25D366; color: white; }
        .btn-blue { background: #3182ce; color: white; }
        .details-box { background: #F8F9FB; border-radius: 8px; padding: 15px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 10px; }
        .detail-row { display: flex; gap: 10px; color: #333; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
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

  // NOVOS ESTADOS PARA A LÓGICA DE REFAZER
  const [ultimaBusca, setUltimaBusca] = useState('');
  const [excluirNomes, setExcluirNomes] = useState([]);

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

  // Função para Refazer a busca excluindo o atual
  const handleRedo = () => {
    if (!resultado) return;
    
    // Pega o nome do estabelecimento que está na tela agora
    const local = typeof resultado === 'string' ? JSON.parse(resultado) : resultado;
    const novoNomeParaExcluir = local.nome;

    // Atualiza a lista de exclusão e dispara a busca novamente para o mesmo termo
    const novaListaExclusao = [...excluirNomes, novoNomeParaExcluir];
    setExcluirNomes(novaListaExclusao);
    
    // Chama a busca passando a lista atualizada
    handleSearch(ultimaBusca, novaListaExclusao);
  };

  async function handleSearch(termo, listaExclusaoManual = []) {
    const query = termo || buscaLivre;
    if (!query) return alert('O que você precisa agora?');

    // Se for uma busca NOVA (digitada ou clicada no ícone), limpamos a lista de exclusão
    // Se listaExclusaoManual tiver itens, significa que veio do botão "Refazer"
    if (listaExclusaoManual.length === 0) {
      setExcluirNomes([]);
    }

    setUltimaBusca(query);
    setLoading(true);
    setResultado(null);

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          busca: query, 
          localizacao: localizacao || '0,0',
          excluir: listaExclusaoManual.length > 0 ? listaExclusaoManual : excluirNomes 
        })
      });
      const json = await resp.json();
      if (json.resultado) {
        setResultado(json.resultado);
      } else {
        alert('Nenhum outro resultado próximo encontrado.');
      }
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
          <div>
            <h1 className="app-name">achou.net.br</h1>
            <p className="gps-status">{gpsAtivo ? '🟢 Localização Ativada' : '⚪ Aguardando GPS...'}</p>
          </div>
        </div>
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
          placeholder="O que você precisa agora?"
          className="search-input"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button onClick={() => handleSearch()} className="search-btn" disabled={loading}>🔍</button>
      </div>

      {loading && (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Buscando a próxima opção...</p>
        </div>
      )}

      {resultado && (
        <ResultCard 
          content={resultado} 
          onRedo={handleRedo} 
        />
      )}

      <footer className="footer-info">
        <p className="footer-title">Importante:</p>
        <p>A indicação de "Aberto" é extraída do status do estabelecimento no Google. Convém ligar antes para confirmar.</p>
      </footer>
      
      <style jsx>{`
        /* (Seus estilos CSS permanecem os mesmos aqui) */
        .main-wrapper { max-width: 480px; margin: 0 auto; padding: 20px; min-height: 100vh; background-color: #F8F9FB; font-family: sans-serif; }
        .header { margin-bottom: 24px; }
        .logo-area { display: flex; align-items: center; gap: 12px; justify-content: center; }
        .logo-img { width: 48px; height: 48px; border-radius: 10px; }
        .app-name { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0F2133; }
        .gps-status { margin: 0; font-size: 0.75rem; color: #666; }
        .section-title { font-size: 1rem; color: #4A5568; margin-bottom: 15px; font-weight: 600; }
        .grid-menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .btn-icon { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .emoji { font-size: 1.8rem; margin-bottom: 4px; }
        .label { font-size: 0.7rem; font-weight: 700; color: #4A5568; text-transform: uppercase; }
        .search-bar { display: flex; gap: 8px; }
        .search-input { flex: 1; padding: 14px; border: 1px solid #CBD5E0; border-radius: 10px; font-size: 1rem; }
        .search-btn { background: #0F2133; color: white; border: none; border-radius: 10px; width: 55px; cursor: pointer; }
        .loading-area { text-align: center; margin-top: 30px; color: #718096; }
        .spinner { width: 28px; height: 28px; border: 3px solid #E2E8F0; border-top-color: #28D07E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
        .footer-info { margin-top: 40px; padding: 20px 10px; border-top: 1px solid #E2E8F0; color: #718096; font-size: 0.75rem; }
        .footer-title { font-weight: 800; color: #4A5568; margin-bottom: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}