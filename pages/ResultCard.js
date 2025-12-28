export default function ResultCard({ item, highlight }) {
  function copiarTextoAnuncio(e) {
    e.preventDefault(); // impede navegação
    if (!item.analysis) {
      alert("Detalhes do anúncio não disponíveis.");
      return;
    }

    // Nota: Como o prompt padrão não gera um campo "full_text", 
    // usamos o "analysis" que contém a descrição da oportunidade.
    navigator.clipboard.writeText(item.analysis)
      .then(() => {
        alert("📋 Detalhes do anúncio copiados!");
      })
      .catch(() => {
        alert("Não foi possível copiar o texto.");
      });
  }

  return (
    <div className="card" style={{ border: highlight ? '2px solid var(--green)' : undefined }}>
      <div style={{ flex: 1 }}>
        <p className="title">{item.title}</p>
        <p className="price">{item.price ? `R$ ${item.price}` : '—'}</p>
        <p className="small">{item.location || '—'} • {item.date || '—'}</p>
        <p style={{ marginTop: 8 }}>{item.analysis || ''}</p>
        {highlight && <span style={{ color: 'green', fontWeight: 700 }}>🔥 Melhor oferta!</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <a href={item.link} target="_blank" rel="noreferrer">
          <button className="btn">Ver anúncio</button>
        </a>

        <button
          onClick={copiarTextoAnuncio}
          className="small"
          style={{ 
            cursor: 'pointer', 
            background: 'none', 
            border: 'none', 
            color: 'inherit', 
            textDecoration: 'underline',
            padding: 0
          }}
        >
          Mais detalhes
        </button>
      </div>
    </div>
  );
}