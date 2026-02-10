import { useState, useEffect, useRef } from 'react';
import * as gtag from '../lib/gtag';
import { track } from '@vercel/analytics/react';
import Link from 'next/link';

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

  // Tratamento para links (Maps e Tel)
  const cleanPhone = local.telefone ? local.telefone.replace(/[^0-9]/g, '') : '';
  // Link universal do Google Maps (abre app nativo no mobile)
  const mapLink = local.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.endereco)}` : '#';

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
        
        <div className="detail-row">
            <span>📍</span> 
            {/* Link Endereço */}
            <a href={mapLink} target="_blank" rel="noopener noreferrer" className="info-link">
                {local.endereco}
            </a>
        </div>
        <div className="detail-row">
            <span>📏</span> {local.distancia}
        </div>
        <div className="detail-row">
            <span>📞</span> 
            {/* Link Telefone */}
            {cleanPhone ? (
                <a href={`tel:${cleanPhone}`} className="info-link">
                    {local.telefone}
                </a>
            ) : (
                <span>{local.telefone}</span>
            )}
        </div>
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
        /* Nova Classe para Links */
        .info-link { color: #333; text-decoration: underline; text-decoration-color: #cbd5e0; cursor: pointer; }
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
  if (t.includes('farmácia') || t.includes('drogaria') || t.includes('remedio') || t.includes('medicamento')) return 'Farmácia';
  if (t.includes('restaurante') || t.includes('comida') || t.includes('almoço') || t.includes('jantar')) return 'Restaurante';
  if (t.includes('supermercado') || t.includes('mercado') || t.includes('mercadinho')) return 'Supermercado';
  if (t.includes('padaria') || t.includes('pão')) return 'Padaria';
  if (t.includes('posto') || t.includes('combustivel') || t.includes('gasolina')) return 'Posto';
  if (t.includes('borracharia') || t.includes('pneu')) return 'Borracharia';
  return 'Outros';
};

export default function Home() {
  const [buscaLivre, setBuscaLivre] = useState('Posto para doação de sangue');
  const [localizacao, setLocalizacao] = useState('');
  const [gpsAtivo, setGpsAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [ultimaBusca, setUltimaBusca] = useState('');
  const [excluirNomes, setExcluirNomes] = useState([]);
  const [campanhaImg, setCampanhaImg] = useState(null);
  const [tipoCampanha, setTipoCampanha] = useState('');
  const [usarOutroLocal, setUsarOutroLocal] = useState(false);
  // Controle do Menu
  const [menuAberto, setMenuAberto] = useState(false);
  
  const [ruaManual, setRuaManual] = useState('');
  const [numManual, setNumManual] = useState('');
  const [bairroManual, setBairroManual] = useState('');
  const [cidadeManual, setCidadeManual] = useState('');
  const [estadoManual, setEstadoManual] = useState('');
  const [paisManual, setPaisManual] = useState('Brasil');
  const bairroRef = useRef(null);

  useEffect(() => {
    const randomChoice = Math.random();
    if (randomChoice < 0.5) {
      setCampanhaImg({ src: '/doacao_sangue.jpg', link: '/doacao_sangue', alt: 'Doe Sangue' });
      setTipoCampanha('sangue');
    } else {
      setCampanhaImg({ src: '/doacao_orgao.jpg', link: '/doacao_orgao', alt: 'Doe Órgãos' });
      setTipoCampanha('orgaos');
    }

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
          if (data.pais) setPaisManual(data.pais);
        })
        .catch(err => console.error("Erro ao obter endereço automático", err));
      },
      () => setGpsAtivo(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (usarOutroLocal && bairroRef.current) {
      bairroRef.current.focus();
    }
  }, [usarOutroLocal]);

  const handleRedo = () => {
    if (!resultado) return;
    const local = typeof resultado === 'string' ? JSON.parse(resultado) : resultado;
    const novoNomeParaExcluir = local.nome;
    const novaListaExclusao = [...excluirNomes, novoNomeParaExcluir];
    setExcluirNomes(novaListaExclusao);
    handleSearch(ultimaBusca, novaListaExclusao);
  };

  async function handleSearch(termo, listaExclusaoManual = []) {
    const query = termo || buscaLivre;
    if (!query) return alert('O que você precisa agora?');

    // --- NOVA VERIFICAÇÃO DE LOCALIZAÇÃO (SOLICITADA) ---
    // Se não estiver usando "Outro local" E o GPS não estiver ativo
    if (!usarOutroLocal && !gpsAtivo) {
      alert("⚠️ Localização Necessária\n\nEste é um App de busca e funciona melhor com a permissão de localização durante seu uso.\n\nPor favor, ative a localização ou clique no link azul 'Buscar em outro local' para digitar o endereço de referência.");
      return; // Interrompe a busca
    }

    let enderecoFormatado = "";
    if (usarOutroLocal) {
      if (!bairroManual || !cidadeManual || !estadoManual || !paisManual) {
        return alert("Para buscar em outro local, preencha Bairro, Cidade, Estado e País.");
      }
      
      let parteRua = "";
      if (ruaManual) {
        parteRua = ruaManual;
        if (numManual) parteRua += `, ${numManual}`;
      }
      
      if (parteRua) {
        enderecoFormatado = `${parteRua} - ${bairroManual}, ${cidadeManual} - ${estadoManual}, ${paisManual}`;
      } else {
        enderecoFormatado = `${bairroManual}, ${cidadeManual} - ${estadoManual}, ${paisManual}`;
      }
    }

    if (listaExclusaoManual.length === 0) {
      setExcluirNomes([]);
    }

    setUltimaBusca(query);
    setLoading(true);
    setResultado(null);

    if (usarOutroLocal) {
      setUsarOutroLocal(false);
    }

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          busca: query, 
          localizacao: localizacao || '0,0',
          endereco: enderecoFormatado || null,
          excluir: listaExclusaoManual.length > 0 ? listaExclusaoManual : excluirNomes,
          campanha: tipoCampanha
        })
      });
      const json = await resp.json();

      if (json.resultado) {
        setResultado(json.resultado);
        let dadosLocais = {};
        try { dadosLocais = JSON.parse(json.resultado); } catch(e) { dadosLocais = {} }
        
        const categoriaMapeada = detectarCategoria(query);
        const bairroDetectado = dadosLocais.bairro_usuario || 'Não identificado';

        gtag.event({
          action: 'view_item',
          currency: "BRL",
          value: 0,
          items: [{
              item_id: dadosLocais.nome ? dadosLocais.nome.replace(/\s+/g, '_').toLowerCase() : "id_generico",
              item_name: dadosLocais.nome || query,
              item_category: categoriaMapeada,
              item_variant: bairroDetectado,
              item_list_name: "Busca Local"
          }]
        });
        gtag.event({ action: 'search_result', category: categoriaMapeada, label: `${categoriaMapeada} | ${bairroDetectado}`, value: 1 });
        track('Search Demand', { category: categoriaMapeada, neighborhood: bairroDetectado, term: query, mode: usarOutroLocal ? 'Manual' : 'GPS' });
      } else {
        alert('Nenhum resultado encontrado.');
      }
    } catch (err) {
      alert('Erro de conexão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="main-wrapper">
      <header className="header">
        <div className="logo-area">
          <div className="left-side">
            {/* LOGO LINKADA PARA A PÁGINA SOBRE */}
            <Link href="/sobre">
              <img src="/logo-512.png" alt="Achou" className="logo-img" style={{cursor: 'pointer'}} />
            </Link>
            
            {/* BOTÃO DO MENU HAMBÚRGUER */}
            <button className="menu-trigger" onClick={() => setMenuAberto(!menuAberto)}>
              ☰
            </button>

            {/* DROPDOWN MENU */}
            {menuAberto && (
              <div className="menu-dropdown">
                <Link href="/sobre" legacyBehavior><a className="menu-item" onClick={() => setMenuAberto(false)}>ℹ️ Sobre o app</a></Link>
                <Link href="/tutorial" legacyBehavior><a className="menu-item" onClick={() => setMenuAberto(false)}>📚 Tutorial</a></Link>
                <Link href="/doacao_sangue" legacyBehavior><a className="menu-item" onClick={() => setMenuAberto(false)}>🩸 Doação de Sangue</a></Link>
                <Link href="/doacao_orgao" legacyBehavior><a className="menu-item" onClick={() => setMenuAberto(false)}>🫀 Doação de Órgãos</a></Link>
              </div>
            )}

            <div className="header-text-area">
              <h1 className="app-name">achou.net.br</h1>
              <p className="gps-status">{gpsAtivo ? '🟢 Localização Ativada' : '⚪ Aguardando GPS...'}</p>
            </div>
          </div>

          {campanhaImg && (
            <Link href={campanhaImg.link} legacyBehavior>
              <a className="header-campanha-link">
                <img 
                  src={campanhaImg.src} 
                  alt={campanhaImg.alt} 
                  className="header-campanha-img"
                />
              </a>
            </Link>
          )}
        </div>
      </header>

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
          onFocus={() => {
            if (buscaLivre === 'Posto para doação de sangue') {
              setBuscaLivre('');
            }
          }}
          placeholder="O que você precisa agora?"
          className="search-input"
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        {/* BOTÃO DE BUSCA ALTERADO CONFORME SOLICITAÇÃO */}
        <button onClick={() => handleSearch()} className="search-btn" disabled={loading}>
           🔍
        </button>
      </div>

      <div className="location-toggle-area">
        {/* ÍCONE DE MAPA SUBSTITUÍDO POR LUPA */}
        <button className="btn-link-location" onClick={() => setUsarOutroLocal(!usarOutroLocal)}>
          {usarOutroLocal ? '📍 Usar meu GPS atual' : '🔎 Buscar em outro local'}
        </button>
        {usarOutroLocal && (
          <div className="manual-address-form">
            <div className="row-inputs">
              <input placeholder="Rua (Opcional)" className="input-manual" style={{ flex: 2 }} value={ruaManual} onChange={e => setRuaManual(e.target.value)} />
              <input placeholder="Nº" className="input-manual" style={{ flex: 1 }} value={numManual} onChange={e => setNumManual(e.target.value)} />
            </div>
            <input ref={bairroRef} placeholder="Bairro (Obrigatório)" className="input-manual" value={bairroManual} onChange={e => setBairroManual(e.target.value)} />
            <div className="row-inputs">
              <input placeholder="Cidade" className="input-manual" style={{ flex: 2 }} value={cidadeManual} onChange={e => setCidadeManual(e.target.value)} />
              <input placeholder="UF" className="input-manual" style={{ flex: 1 }} value={estadoManual} onChange={e => setEstadoManual(e.target.value)} />
            </div>
            <input placeholder="País" className="input-manual" value={paisManual} onChange={e => setPaisManual(e.target.value)} />
            <p className="manual-help">
              Pesquisando próximo a: <strong>{bairroManual ? `${bairroManual}, ${cidadeManual} - ${estadoManual}` : 'Preencha o endereço'}</strong>
            </p>
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
          <p><strong>1) Para salvar este App:</strong><br />No Android: Use 'Adicionar à tela inicial' no menu do Chrome.<br />No iPhone: Use o ícone 'Compartilhar' e 'Adicionar à Tela de Início'.</p>
          <p><strong>2)</strong> A indicação de "Aberto" é extraída do Google e pode não estar atualizado. Convém ligar antes.</p>
          <p><strong>3)</strong> Verifique a localização ou use "Buscar em outro local".</p>
          <p><strong>4)</strong> <Link href="/doacao_sangue">Saiba mais sobre Doação de Sangue</Link></p>
          <p><strong>5)</strong> <Link href="/doacao_orgao">Saiba mais sobre Doação de Órgãos</Link></p>
        </div>
      </footer>
      
      <style jsx>{`
        .main-wrapper { max-width: 480px; margin: 0 auto; padding: 20px; min-height: 100vh; background-color: #F8F9FB; font-family: sans-serif; position: relative; }
        .header { margin-bottom: 20px; }
        .logo-area { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; width: 100%; position: relative; }
        .left-side { display: flex; align-items: center; gap: 10px; }
        .logo-img { width: 48px; height: 48px; border-radius: 10px; }
        
        /* ESTILOS DO MENU */
        .menu-trigger { background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #0F2133; padding: 0 5px; }
        .menu-dropdown { 
          position: absolute; top: 55px; left: 10px; background: white; border: 1px solid #E2E8F0; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); z-index: 100;
          display: flex; flex-direction: column; min-width: 200px; overflow: hidden;
        }
        .menu-item { padding: 12px 16px; text-decoration: none; color: #0F2133; font-size: 0.9rem; border-bottom: 1px solid #F0F0F0; transition: background 0.2s; font-weight: 600; }
        .menu-item:last-child { border-bottom: none; }
        .menu-item:hover { background-color: #F7FAFC; }

        .app-name { margin: 0; font-size: 1.4rem; font-weight: 800; color: #0F2133; }
        .gps-status { margin: 0; font-size: 0.75rem; color: #666; }

        .header-campanha-link { display: block; cursor: pointer; width: calc((100% - 24px) / 3); }
        .header-campanha-img { 
          width: 100%; height: 82px; object-fit: contain; background: white; border-radius: 12px; border: 1px solid #E2E8F0; box-shadow: 0 2px 5px rgba(0,0,0,0.05); transition: transform 0.2s;
        }
        .header-campanha-img:active { transform: scale(0.95); }
        
        .section-title { font-size: 1rem; color: #4A5568; margin-bottom: 15px; font-weight: 600; }
        .location-toggle-area { text-align: left; margin-top: 15px; margin-bottom: 20px; width: 100%; }
        .btn-link-location { background: none; border: none; color: #3182ce; font-size: 0.9rem; text-decoration: underline; cursor: pointer; padding: 0; font-weight: 600; margin-bottom: 10px; display: inline-block; }
        .manual-address-form { background: #fff; padding: 15px; border-radius: 12px; border: 1px solid #E2E8F0; width: 100%; box-sizing: border-box; animation: fadeIn 0.3s; }
        .input-manual { width: 100%; padding: 12px; margin-bottom: 8px; border: 1px solid #CBD5E0; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
        .row-inputs { display: flex; gap: 10px; width: 100%; }
        .manual-help { font-size: 0.75rem; color: #666; margin: 0; text-align: left; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        
        .grid-menu { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .btn-icon { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 8px; display: flex; flex-direction: column; align-items: center; cursor: pointer; min-height: 82px; }
        .emoji { font-size: 1.8rem; margin-bottom: 4px; }
        .label { font-size: 0.7rem; font-weight: 700; color: #4A5568; text-transform: uppercase; }
        
        .search-bar { display: flex; gap: 8px; }
        .search-input { flex: 1; padding: 14px; border: 1px solid #CBD5E0; border-radius: 10px; font-size: 1rem; }
        
        /* CSS ATUALIZADO DO BOTÃO DE BUSCA */
        .search-btn { 
          background: #28D07E; /* Fundo Verde */
          color: white; 
          border: none; 
          border-radius: 10px; width: 55px; 
          cursor: pointer; 
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem; /* Lupa Aumentada */
          transition: transform 0.1s;
        }
        .search-btn:active { transform: scale(0.95); }

        .loading-area { text-align: center; margin-top: 30px; color: #718096; }
        .spinner { width: 28px; height: 28px; border: 3px solid #E2E8F0; border-top-color: #28D07E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px; }
        
        .footer-info { margin-top: 40px; padding: 20px 10px; border-top: 1px solid #E2E8F0; color: #718096; font-size: 0.75rem; }
        .footer-title { font-weight: 800; color: #4A5568; margin-bottom: 12px; font-size: 0.85rem; }
        .footer-content p { margin-bottom: 12px; line-height: 1.5; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}