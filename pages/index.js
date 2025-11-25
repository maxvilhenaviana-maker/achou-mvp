import { useState } from 'react';
import ResultCard from '../components/ResultCard';

export default function Home() {
const [produto, setProduto] = useState('');
const [cidade, setCidade] = useState('');
const [loading, setLoading] = useState(false);
// Inicializado como um array vazio para facilitar a lógica de renderização
const [items, setItems] = useState([]);
const [error, setError] = useState(null);
// Estado para rastrear se uma busca já foi executada
const [searchExecuted, setSearchExecuted] = useState(false);

async function buscar(e){
e?.preventDefault();
if(!produto || !cidade) {
setError('Preencha produto e cidade');
return;
}
setError(null);
setLoading(true);
setItems([]); // Limpa os itens, garantindo que seja um array vazio
setSearchExecuted(false); // Reinicia a flag antes de começar a busca

try{
const payload = { produto, cidade };

const resp = await fetch('/api/buscar', {
method:'POST',
headers:{'Content-Type':'application/json'},
body: JSON.stringify(payload)
});

const json = await resp.json();

if(json.error) {
// Exibe o erro e os detalhes da API do Gemini
setError(json.error + (json.details ? ` (${json.details.substring(0, 80)}...)` : ''));
} else if(json.items) {
// Mapear campos e normalizar dados
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
// Em caso de erro de parsing JSON, mostra o texto bruto retornado
setItems([{
title: 'Resultado bruto (erro de formato)',
price:'—',
location:'—',
date:'—',
analysis: json.raw,
link:'#'
}]);
}

} catch(err){
setError('Erro ao buscar. Verifique sua conexão e o console.');
console.error(err);
} finally {
setLoading(false);
setSearchExecuted(true); // Marca que a busca foi concluída, independente do resultado
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
<button type="submit" className="btn" disabled={loading}>{loading? 'Buscando…' : 'Buscar agora'}</button>
</form>
</div>

<div className="resultsHeader">
{/* Exibe o header do resultado somente após a busca ter sido executada */}
<div style={{fontWeight:700}}>{ (produto && searchExecuted) ? `Resultados para: ${produto} — ${cidade}` : 'Nenhuma busca ainda'}</div>
<div className="small">Resultados mostram anúncios publicados HOJE ou ONTEM</div>
</div>

{error && <div style={{color:'red',marginBottom:12, padding: '12px', background: '#fee', borderRadius: '8px'}}>{error}</div>}

{loading && <div style={{textAlign: 'center', margin: '20px 0', color: 'var(--muted)'}}>Carregando resultados...</div>}

<div>
{/* Mostra cards se items.length > 0 */}
{items.length > 0 && items.map((it, idx) => <ResultCard key={idx} item={it} />)}

{/* Mostra mensagem de "Nenhum resultado" se a busca foi concluída e o array está vazio */}
{items.length === 0 && searchExecuted && !loading && produto && cidade && (
<div style={{textAlign: 'center', margin: '40px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', background: '#fff'}}>
<h3 style={{marginTop: 0, color: 'var(--dark)'}}>Nenhum Achado Recente</h3>
<p style={{color: 'var(--muted)'}}>O radar não encontrou nenhum anúncio para **"{produto}"** em **{cidade}** publicado **hoje ou ontem** que estivesse abaixo do valor de mercado. Tente refinar ou ampliar a busca!</p>
</div>
)}
</div>

<div className="footer">
<div><strong>Aviso legal:</strong> achou.net.br apenas organiza anúncios públicos. Não garantimos disponibilidade nem veracidade. Verifique sempre o vendedor.</div>
</div>
</main>
</div>
);
}
