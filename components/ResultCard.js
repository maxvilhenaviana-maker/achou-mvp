export default function ResultCard({ item }) {
  if (!item) return null;

  const {
    title = "Sem título",
    price = "—",
    location = "—",
    date = "—",
    analysis = "",
    link = "#",
    img = "/placeholder-120x90.png"
  } = item;

  return (
    <div className="card">
      <div style={{ flex: 1 }}>
        <p className="title">{title}</p>
        <p className="price">{price}</p>
        <p className="small">{location} • {date}</p>
        <p style={{ marginTop: 8 }}>{analysis}</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <a href={link} target="_blank" rel="noreferrer">
          <button className="btn">Ver anúncio</button>
        </a>
        <a href={link} target="_blank" rel="noreferrer" className="small">Mais detalhes</a>
      </div>
    </div>
  );
}
