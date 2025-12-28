import { useState } from 'react';
import ResultCard from '../components/ResultCard';

const Spinner = () => (
  <div style={{
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #28d07e',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  }}>
    <style jsx global>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

export default function Home() {
  const [produto, setProduto] = useState('');
  const [cidade, setCidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [precoMedio, setPrecoMedio] = useState(null);
  const [error, setError] = useState(null);
  const [searchExecuted, setSearchExecuted] = useState(false);

  async function buscar(e) {
    if (e) e.preventDefault();
    
    if (!produto || !cidade) { 
      setError('Preencha produto e cidade'); 
      return; 
    }

    // Reset de estados para nova busca
    setError(null); 
    setLoading(true); 
    setItems([]); 
    setPrecoMedio(null); 
    setSearchExecuted(false);

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto, cidade })
      });

      // Se a resposta não for 200, captura o erro com segurança
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro no servidor (${resp.status})`);
      }

      const json = await resp.json();

      if (json.error) {
        setError(json.error);
      } else {
        // Garantimos que items seja sempre um array para evitar erro de .map()
        setItems(Array.isArray(json.items) ? json.items : []);
        setPrecoMedio(json.precoMedio || 0);
      }

    } catch (err) {
      console.error("Erro na busca:", err);
      setError(err.message || 'Erro ao buscar. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
      setSearchExecuted(true);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="/logo-512.png" alt="logo" style={{ width: '40px' }} />
          <div>
            <div style={{ fontWeight: 700 }}>achou.net.br</div>
            <div style={{ fontSize: 12, color: '#7b8794' }}>Radar de achados — anúncios do dia</div>
          </div>
        </div>
      </header>

      <main>
        <div className="hero">
          <h1>Encontre oportunidades publicadas recentemente</h1>
          <p className="small">Buscamos OLX, Desapega e Mercado Livre em tempo real — sem cadastro.</p>

          <form className="searchRow" onSubmit={buscar} style={{ marginTop: 12, display: 'flex', gap: '8px' }}>
            <input 
              className="input" 
              value={produto} 
              onChange={e => setProduto(e.target.value)} 
              placeholder="O que você procura?" 
            />
            <input 
              className="input" 
              value={cidade} 
              onChange={e => setCidade(e.target.value)} 
              placeholder="Região ou cidade" 
            />
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Buscando…' : 'Buscar agora'}
            </button>
          </form>
        </div>

        <div className="resultsHeader">
          {searchExecuted && !error && (
            <div style={{ fontWeight: 700, marginBottom: '20px', marginTop: '20px' }}>
              Resultados para: {produto} — {cidade}
              
              {precoMedio > 0 && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 15px',
                  background: '#f0f9ff',
                  borderLeft: '4px solid #0070f3',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#005bb5'
                }}>
                  💰 Preço médio de mercado nesta região: <strong>R$ {precoMedio}</strong>
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#7b8794', marginTop: '10px', fontWeight: 400 }}>
                As 3 melhores ofertas analisadas pelo radar.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div style={{ color: 'red', marginBottom: 12, padding: '12px', background: '#fee', borderRadius: '8px', border: '1px solid #fcc' }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', margin: '40px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Spinner />
              <h3 style={{ margin: 0 }}>Radar em Processamento...</h3>
            </div>
            <p style={{ color: '#7b8794' }}>Aguarde enquanto nossa IA caça as melhores ofertas.</p>
          </div>
        )}

        <div className="resultsList">
          {!loading && items.length > 0 && items.map((it, idx) => (
            <ResultCard key={idx} item={it} highlight={idx === 0} />
          ))}

          {!loading && searchExecuted && items.length === 0 && !error && (
            <div style={{ textAlign: 'center', margin: '40px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff' }}>
              <h3 style={{ marginTop: 0 }}>Nenhum Achado Recente</h3>
              <p style={{ color: '#7b8794' }}>O radar não encontrou anúncios satisfatórios abaixo do valor de mercado agora.</p>
            </div>
          )}
        </div>

        <div className="footer" style={{ marginTop: '40px', paddingBottom: '20px', fontSize: '12px', color: '#7b8794' }}>
          <strong>Aviso legal:</strong> achou.net.br apenas organiza anúncios públicos. Verifique sempre o vendedor.
        </div>
      </main>
    </div>
  );
}