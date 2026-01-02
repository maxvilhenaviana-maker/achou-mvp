import { useState } from 'react';
import AnalysisReport from '../components/AnalysisReport';

const Spinner = () => (
  <div className="spinner">
    <style jsx>{`
      .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #28d07e; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; margin-right: 10px; }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export default function Home() {
  const [produto, setProduto] = useState('');
  const [cidade, setCidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState('');
  const [error, setError] = useState(null);

  async function handleSearch(categoria) {
    if (!produto || !cidade) { setError('Por favor, preencha o produto e a cidade.'); return; }
    setError(null); setLoading(true); setRelatorio('');
    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto, cidade, categoria })
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Erro na consulta');
      setRelatorio(json.relatorio);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <img src="/logo-512.png" alt="logo" />
          <div className="brand-info">
            <div className="brand-name">achou.net.br</div>
            <div className="brand-tagline">Radar de Compra Inteligente</div>
          </div>
        </div>
      </header>

      <main>
        <div className="hero">
          <h1>Decida melhor sua próxima compra</h1>
          <p>Análise de mercado, confiabilidade e suporte em tempo real.</p>
          <div className="searchRow" style={{ marginTop: 20 }}>
            <input className="input" value={produto} onChange={e => setProduto(e.target.value)} placeholder="O que você procura? (ex: iPhone 15, Carro 1.0...)" />
            <input className="input" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Sua cidade" />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
            <button className="btn" onClick={() => handleSearch('NOVO')} disabled={loading} style={{ flex: 1, backgroundColor: '#0f2133' }}>
              {loading ? <Spinner /> : 'Analisar Novos'}
            </button>
            <button className="btn" onClick={() => handleSearch('USADO')} disabled={loading} style={{ flex: 1 }}>
              {loading ? <Spinner /> : 'Analisar Usados'}
            </button>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}
        {loading && <div className="loading-state"><Spinner /><p>Aguarde, nossa IA está cruzando dados de mercado e suporte...</p></div>}
        {!loading && relatorio && <AnalysisReport content={relatorio} produto={produto} cidade={cidade} />}
      </main>

      <style jsx>{`
        .error-box { background: #fee; color: #c00; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #fcc; }
        .loading-state { text-align: center; padding: 40px; color: #666; background: #fff; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      `}</style>
    </div>
  );
}