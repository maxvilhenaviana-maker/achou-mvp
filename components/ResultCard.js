export default function ResultCard({ item }) {
  const isReliable = item.title && item.price && item.location;

  return (
    <div className="card">
      <div style={{flex:1}}>
        <p className="title">{item.title}</p>
        <p className="price">{ item.price ? `R$ ${item.price}` : '—' }</p>
        <p className="small">{item.location || '—'} • {item.date || '—'}</p>
        <p style={{marginTop:8}}>{item.analysis || ''}</p>

        <details style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
          <summary>Mostrar JSON bruto</summary>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(item, null, 2)}
          </pre>
        </details>

        <p style={{ marginTop: 6, fontSize: 12, color: isReliable ? 'green' : 'orange' }}>
          {isReliable
            ? 'Dados aparentemente confiáveis ✅'
            : 'Atenção: alguns campos podem estar ausentes ⚠️'}
        </p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
        <a href={item.link || '#'} target="_blank" rel="noreferrer">
          <button className="btn">Ver anúncio</button>
        </a>
        <a href={item.link || '#'} target="_blank" rel="noreferrer" className="small">Mais detalhes</a>
      </div>
    </div>
  );
}
