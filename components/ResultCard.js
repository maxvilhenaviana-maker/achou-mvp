export default function ResultCard({ item, highlight }) {

  function copiarTextoAnuncio(e) {
    e.preventDefault(); // impede navegação
    if (!item.full_text) {
      alert("Texto completo do anúncio não disponível.");
      return;
    }

    navigator.clipboard.writeText(item.full_text)
      .then(() => {
        alert("📋 Texto completo do anúncio copiado!");
      })
      .catch(() => {
        alert("Não foi possível copiar o texto.");
      });
  }

  return (
    <div className="card" style={{border: highlight ? '2px solid var(--green)' : undefined}}>
      <div style={{flex:1}}>
        <p className="title">{item.title}</p>
        <p className="price">{item.price ? `R$ ${item.price}` : '—'}</p>
        <p className="small">{item.location || '—'} • {item.date || '—'}</p>
        <p style={{marginTop:8}}>{item.analysis || ''}</p>
        {highlight && <span style={{color:'green', fontWeight:700}}>🔥 Melhor oferta!</span>}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
        <a href={item.link} target="_blank" rel="noreferrer">
          <button className="btn">Ver anúncio</button>
        </a>

        {/* ALTERAÇÃO: agora copia o texto completo */}
        <a
          href="#"
          onClick={copiarTextoAnuncio}
          className="small"
          style={{cursor:'pointer'}}
        >
          Mais detalhes
        </a>
      </div>
    </div>
  );
}
