export default function ResultCard({ item, highlight }) {

  function copiarAnuncio(e) {
    e.preventDefault(); // impede navegação

    if (!item || typeof item !== 'object') {
      alert("Anúncio inválido.");
      return;
    }

    try {
      // Extrai apenas os valores do objeto, sem chaves e sem aspas
      const textoSomenteDados = Object.values(item)
        .map(v => String(v))
        .join('\n');

      navigator.clipboard.writeText(textoSomenteDados);
      alert("📋 Dados do anúncio copiados!");
    } catch (err) {
      alert("Erro ao copiar o anúncio.");
      console.error(err);
    }
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

        {/* ALTERADO: copia apenas os valores do JSON */}
        <a
          href="#"
          onClick={copiarAnuncio}
          className="small"
          style={{cursor:'pointer'}}
        >
          Copiar anúncio
        </a>
      </div>
    </div>
  );
}
