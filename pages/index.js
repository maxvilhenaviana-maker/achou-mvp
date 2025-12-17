import { useState } from 'react';
import ResultCard from '../components/ResultCard';

const Spinner = () => (
  <div style={{
    border: '4px solid #f3f3f3',
    borderTop: '4px solid var(--green)',
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
  const [precoMedio, setPrecoMedio] = useState(null); // Novo estado para o preço médio
  const [error, setError] = useState(null);
  const [searchExecuted, setSearchExecuted] = useState(false);

  async function buscar(e){
    e?.preventDefault();
    if(!produto || !cidade) { setError('Preencha produto e cidade'); return; }
    setError(null); setLoading(true); setItems([]); setPrecoMedio(null); setSearchExecuted(false);

    try{
      const resp = await fetch('/api/buscar', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ produto, cidade })
      });
      const json = await resp.json();

      if(json.error) setError(json.error);
      else {
        // Captura os itens e o preço médio da nova estrutura da API
        if(json.items) setItems(json.items);
        if(json.precoMedio) setPrecoMedio(json.precoMedio);
      }

    } catch(err){
      setError('Erro ao buscar. Verifique sua conexão e o console.');
      console.error(err);
    } finally {
      setLoading(false);
      setSearchExecuted(true);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <img src="/logo-512.png" alt="achou.net.br logo"/>
          <div>
            <div style={{fontWeight:700}}>achou.net.br</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>Radar de achados — anúncios do dia</div>
          </div>
        </div>
      </header>

      <main>
        <div className="hero">
          <h1>Encontre oportunidades publicadas recentemente</h1>
          <p className="small">Buscamos OLX, Desapega e Mercado Livre em tempo real — sem cadastro.</p>

          <form className="searchRow" onSubmit={buscar} style={{marginTop:12}}>
            <input className="input" value={produto} onChange={e=>setProduto(e.target.value)} placeholder="O que você procura?"/>
            <input className="input" value={cidade} onChange={e=>setCidade(e.target.value)} placeholder="Região ou cidade"/>
            <button type="submit" className="btn" disabled={loading}>{loading? 'Buscando…' : 'Buscar agora'}</button>
          </form>
        </div>

        <div className="resultsHeader">
          {produto && searchExecuted && (
            <div style={{fontWeight:700, marginBottom: '20px'}}>
              Resultados para: {produto} — {cidade}
              
              {/* Exibição do Preço Médio com destaque visual */}
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
              
              <p className="small" style={{marginTop: '10px'}}>As 3 melhores ofertas analisadas pelo radar.</p>
            </div>
          )}
        </div>

        {error && <div style={{color:'red',marginBottom:12,padding:'12px',background:'#fee',borderRadius:'8px'}}>{error}</div>}

        {loading && (
          <div style={{textAlign:'center',margin:'40px 0',padding:'20px',border:'1px solid #ccc',borderRadius:'8px',background:'#fff',display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',marginBottom:'10px'}}>
              <Spinner />
              <h3 style={{margin:0,color:'var(--dark)'}}>Radar em Processamento...</h3>
            </div>
          </div>
        )}

        <div>
          {items.length > 0 && items.map((it, idx) => <ResultCard key={idx} item={it} highlight={idx===0} />)}

          {items.length === 0 && searchExecuted && !loading && (
            <div style={{textAlign:'center',margin:'40px 0',padding:'20px',border:'1px solid #ccc',borderRadius:'8px',background:'#fff'}}>
              <h3 style={{marginTop:0,color:'var(--dark)'}}>Nenhum Achado Recente</h3>
              <p style={{color:'var(--muted)'}}>O radar não encontrou anúncios recentes abaixo do valor de mercado.</p>
            </div>
          )}
        </div>

        <div className="footer">
          <div><strong>Aviso legal:</strong> achou.net.br apenas organiza anúncios públicos. Verifique sempre o vendedor.</div>
        </div>
      </main>
    </div>
  );
}