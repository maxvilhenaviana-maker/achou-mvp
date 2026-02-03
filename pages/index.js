import { useState, useEffect, useRef } from 'react';
import * as gtag from '../lib/gtag';
import { track } from '@vercel-analytics/react';

// --- COMPONENTE INTERNO: ResultCard ---
function ResultCard({ content, onRedo }) {
  let local = {};
  try {
    local = typeof content === 'string' ? JSON.parse(content) : content;
  } catch (e) {
    local = { nome: "Erro", endereco: "Tente novamente", status: "Erro", horario: "", motivo: "Erro na leitura", telefone: "", distancia: "" };
  }

  const copyToClipboard = () => {
    if (local.endereco && local.endereco !== "Verifique os dados digitados") {
      gtag.event({ action: 'conversion_gps', category: 'Engagement', label: local.nome });
      navigator.clipboard.writeText(local.endereco);
      alert("📋 Endereço copiado para o GPS!");
    } else {
      alert("Nada para copiar.");
    }
  };

  const shareWA = () => {
    gtag.event({ action: 'conversion_whatsapp', category: 'Engagement', label: local.nome });
    const text = encodeURIComponent(`*${local.nome}*\n📍 ${local.endereco}\n🕒 ${local.status} (Fecha às ${local.horario || '?'})\n📞 ${local.telefone}\n📏 Distância: ${local.distancia}\n\nPrecisei, achei com 1 clique no: www.achou.net.br`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="card-container">
      <div className="card-header">
        <h2 className="card-title">{local.nome}</h2>
        <span className={`status-badge ${local.status?.toLowerCase().includes('fechado') || local.status === 'Erro' ? 'fechado' : 'aberto'}`}>
          {local.status}
        </span>
      </div>
      <p className="card-reason">{local.motivo}</p>
      
      <div className="buttons-row">
        <button onClick={onRedo} className="btn-card btn-blue">🔄 Refazer</button>
        <button onClick={copyToClipboard} className="btn-card btn-dark">📋 Copiar</button>
        <button onClick={shareWA} className="btn-card btn-green">📱 WhatsApp</button>
      </div>

      <div className="details-box">
        {local.horario && local.horario !== "Consulte" && local.horario !== "24h" && (
          <div className="detail-row" style={{ color: '#E53E3E', fontWeight: 'bold' }}>
            <span>🕒</span> Fecha às {local.horario}
          </div>
        )}
        {local.horario === "24h" && (
           <div className="detail-row" style={{ color: '#28D07E', fontWeight: 'bold' }}>
           <span>🕒</span> Aberto 24 horas
         </div>
        )}
        
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

const detectarCategoria = (termo) => {
  const t = termo.toLowerCase();
  if (t.includes('farmácia') || t.includes('drogaria')) return 'Farmácia';
  if (t.includes('restaurante') || t.includes('comida')) return 'Restaurante';
  if (t.includes('supermercado') || t.includes('mercado')) return 'Supermercado';
  if (t.includes('padaria') || t.includes('pão')) return 'Padaria';
  if (t.includes('posto') || t.includes('gasolina')) return 'Posto';
  if (t.includes('borracharia')) return 'Borracharia';
  return 'Outros';
};

export default function Home() {
  const [buscaLivre, setBuscaLivre] = useState('');
  const [localizacao, setLocalizacao] = useState('');
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [ultimaBusca, setUltimaBusca] = useState('');
  const [excluirNomes, setExcluirNomes] = useState([]);
  
  // Estados para localização manual
  const [usarOutroLocal, setUsarOutroLocal] = useState(false);
  const [ruaManual, setRuaManual] = useState('');
  const [numManual, setNumManual] = useState('');
  const [bairroManual, setBairroManual] = useState('');
  const [cidadeManual, setCidadeManual] = useState('');
  const [estadoManual, setEstadoManual] = useState('');
  const [paisManual, setPaisManual] = useState('Brasil');

  // NOVO: Estado da Campanha
  const [campanhaAtiva, setCampanhaAtiva] = useState(null);

  const bairroRef = useRef(null);

  useEffect(() => {
    // Sorteia a campanha ao carregar (50% cada)
    const sorteio = Math.random() < 0.5 ? 'sangue' : 'orgao';
    setCampanhaAtiva(sorteio);

    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coordString = `${pos.coords.latitude},${pos.coords.longitude}`;
        setLocalizacao(coordString);
        setGpsAtivo(true);
        fetch('/api/buscar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ modo: 'geo_reverse', localizacao: coordString })
        })
        .then(res => res.json())
        .then(data => {
          if (data.cidade) setCidadeManual(data.cidade);
          if (data.estado) setEstadoManual(data.estado);
        })
        .catch(err => console.error(err));
      },
      () => setGpsAtivo(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (usarOutroLocal && bairroRef.current) bairroRef.current.focus();
  }, [usarOutroLocal]);

  const handleRedo = () => {
    if (!resultado) return;
    const local = typeof resultado === 'string' ? JSON.parse(resultado) : resultado;
    const novaListaExclusao = [...excluirNomes, local.nome];
    setExcluirNomes(novaListaExclusao);
    handleSearch(ultimaBusca, novaListaExclusao);
  };

  async function handleSearch(termo, listaExclusaoManual = []) {
    const query = termo || buscaLivre;
    if (!query) return alert('O que você precisa agora?');

    let enderecoFormatado = "";
    if (usarOutroLocal) {
      if (!bairroManual || !cidadeManual) return alert("Preencha Bairro e Cidade.");
      enderecoFormatado = `${ruaManual} ${numManual} - ${bairroManual}, ${cidadeManual} - ${estadoManual}, ${paisManual}`;
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
          endereco: usarOutroLocal ? enderecoFormatado : null,
          excluir: listaExclusaoManual.length > 0 ? listaExclusaoManual : excluirNomes,
          campanha: campanhaAtiva // Envia a campanha sorteada para a API
        })
      });

      const json = await resp.json();
      if (json.resultado) {
        setResultado(json.resultado);
        const categoriaMapeada = detectarCategoria(query);
        
        // Mantendo seus trackers originais
        track('Search Demand', {
          category: categoriaMapeada,
          term: query,
          mode: usarOutroLocal ? 'Manual' : 'GPS'
        });
      } else {
        alert('Nenhum resultado encontrado.');
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

      {/* Banner da Campanha */}
      {campanhaAtiva && (
        <div className="campaign-banner">
          <img 
            src={campanhaAtiva === 'sangue' ? '/campanha-sangue.jpg' : '/campanha-orgao.jpg'} 
            alt="Campanha Social" 
          />
        </div>
      )}

      <h2 className="section-title">Precisou, clicou abaixo, achou:</h2>
      
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

      <div className="location-toggle-area">
        <button className="btn-link-location" onClick={() => setUsarOutroLocal(!usarOutroLocal)}>
          {usarOutroLocal ? '📍 Usar meu GPS atual' : '🗺️ Buscar em outro local'}
        </button>

        {usarOutroLocal && (
          <div className="manual-address-form">
            <div className="row-inputs">
              <input placeholder="Rua" className="input-manual" style={{ flex: 2 }} value={ruaManual} onChange={e => setRuaManual(e.target.value)} />
              <input placeholder="Nº" className="input-manual" style={{ flex: 1 }} value={numManual} onChange={e => setNumManual(e.target.value)} />
            </div>
            <input ref={bairroRef} placeholder="Bairro" className="input-manual" value={bairroManual} onChange={e => setBairroManual(e.target.value)} />
            <div className="row-inputs">
              <input placeholder="Cidade" className="input-manual" style={{ flex: 2 }} value={cidadeManual} onChange={e => setCidadeManual(e.target.value)} />
              <input placeholder="UF" className="input-manual" style={{ flex: 1 }} value={estadoManual} onChange={e => setEstadoManual(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-area">
          <div className="spinner"></div>
          <p>Buscando a próxima opção...</p>
        </div>
      )}

      {resultado && <ResultCard content={resultado} onRedo={handleRedo} />}

      <footer className="footer-info">
        <p className="footer-title">Importante:</p>
        <div className="footer-content">
          <p><strong>1)</strong> A indicação de "Aberto" é baseada no Google e pode oscilar. Convém ligar antes.</p>
          <p><strong>2)</strong> Para salvar: No iPhone use 'Compartilhar' {'>'} 'Tela de Início'. No Android use o menu do Chrome.</p>
        </div>
      </footer>
      
      <style jsx>{`
        .main-wrapper { max-width: 480px; margin: 0 auto; padding: 20px; min-height: 100vh; background-color: #F8F9FB; font-family: sans-serif; }
        .header { margin-bottom: 20px; }
        .logo-area { display: flex; align-items: center; gap: 12px; justify-content: center; }
        .logo-img { width: 48px; height: 48px; border-radius: 10px; }
        .app-name { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0F2133; }
        .gps-status { margin: 0; font-size: 0.75rem; color: #666; }
        .campaign-banner { width: 100%; margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .campaign-banner img { width: 100%; display: block; }
        .section-title { font-size: 1rem; color: #4A5568; margin-bottom: 15px; font-weight: 600; }
        .grid-menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .btn-icon { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center; cursor: pointer; }
        .emoji { font-size: 1.8rem; margin-bottom: 4px; }
        .label { font-size: 0.7rem; font-weight: 700; color: #4A5568; text-transform: uppercase; }
        .search-bar { display: flex; gap: 8px; }
        .search-input { flex: 1; padding: 14px; border: 1px solid #CBD5E0; border-radius: 10px; font-size: 1rem; }
        .search-btn { background: #0F2133; color: white; border: none; border-radius: 10px; width: 55px; cursor: pointer; }
        .btn-link-location { background: none; border: none; color: #3182ce; font-size: 0.9rem; text-decoration: underline; cursor: pointer; margin: 15px 0; font-weight: 600; }
        .manual-address-form { background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 20px; }
        .input-manual { width: 100%; padding: 10px; margin-bottom: 8px; border: 1px solid #CBD5E0; border-radius: 8px; }
        .row-inputs { display: flex; gap: 8px; }
        .loading-area { text-align: center; margin-top: 30px; }
        .spinner { width: 28px; height: 28px; border: 3px solid #E2E8F0; border-top-color: #28D07E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .footer-info { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 20px; font-size: 0.75rem; color: #718096; }
      `}</style>
    </div>
  );
}