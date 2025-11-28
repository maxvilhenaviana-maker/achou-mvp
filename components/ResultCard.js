export default function ResultCard({ item }) {
  return (
    <div className="card">
      <div style={{flex:1}}>
        <p className="title">{item.title}</p>
        <p className="price">{ item.price ? `R$ ${item.price}` : '—' }</p>
        <p className="small">{item.location || '—'} • {item.date || '—'}</p>
        <p style={{marginTop:8}}>{item.analysis || ''}</p>
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
