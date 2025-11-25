import { useState } from 'react';
import ResultCard from '../components/ResultCard';

export default function Home() {
  const [produto, setProduto] = useState('');
  const [cidade, setCidade] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  async function buscar(e){
    e?.preventDefault();
    if(!produto || !cidade) {
      setError('Preencha produto e cidade');
      return;
    }
    setError(null);
    setLoading(true);
    setItems(null);
    try{
      const resp = await fetch('/api/buscar', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ produto, cidade })
      });
      const json = await resp.json();
      if(json.error) {
        setError(json.error);
      } else if(json.items) {
        // mapear campos caso o modelo retorne image_url em vez de img
        const normalized = json.items.map(it => ({
          title: it.title || it.titulo || 'Sem título',
          price: it.price || it.preco || '',
          location: it.location || it.local || '',
          date: it.date || it.data || '',
          analysis: it.analysis || it.analise || '',
          link: it.link || it.url || '#',
          img: it.image_url || it.img || '/placeholder-120x90.png'
        }));
        setItems(normalized);
      } else if(json.raw) {
        setItems([{ title: 'Resultado bruto', price:'—', location:'—', date:'—', analysis: json.raw, link:'#' }]);
      }
    } catch(err){
      setError('Erro ao buscar. Veja o console.');
      console.error(err);
    } finally {
      setLoading(false);
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
          <h1>Encontre oportunidades publicadas HOJE</h1>
          <p className="small">Buscamos OLX, Desapega e Mercado Livre em tempo real — sem cadastro.</p>

          <form className="searchRow" onSubmit={buscar} style={{marginTop:12}}>
            <input className="input" value={produto} onChange={e=>setProduto(e.target.value)} placeholder="O que você procura? (ex: iPhone 8, Monitor 24)"/>
            <input className="input" value={cidade} onChange={e=>setCidade(e.target.value)} placeholder="Região ou cidade (ex: Belo Horizonte)"/>
            <button type="submit" className="btn">{loading? 'Buscando…' : 'Buscar agora'}</button>
          </form>
        </div>

        <div className="resultsHeader">
          <div style={{fontWeight:700}}>{ produto ? `Resultados para: ${produto} — ${cidade}` : 'Nenhuma busca ainda'}</div>
          <div className="small">Resultados mostram anúncios publicados HOJE ou ONTEM</div>
        </div>

        {error && <div style={{color:'red',marginBottom:12}}>{error}</div>}

        <div>
          {items?.length ? items.map((it, idx) => <ResultCard key={idx} item={it} />) : null}
        </div>

        <div className="footer">
          <div><strong>Aviso legal:</strong> achou.net.br apenas organiza anúncios públicos. Não garantimos disponibilidade nem veracidade. Verifique sempre o vendedor.</div>
        </div>
      </main>
    </div>
  );

// ...
<div>
{items?.length ? items.map((it, idx) => <ResultCard key={idx} item={it} />) : null}
{items?.length === 0 && !loading && produto && cidade && (
<div style={{textAlign: 'center', margin: '20px 0', color: 'var(--muted)'}}>Nenhum resultado encontrado hoje ou ontem para "{produto}" em {cidade}.</div>
)}
</div>
// ...

}
