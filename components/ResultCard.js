export default function ResultCard({ item }) {
  return (
    <div style={styles.card}>
      {item.image_url && (
        <img src={item.image_url} style={styles.image} alt={item.title} />
      )}

      <div>
        <h3>{item.title}</h3>
        <p><b>Preço:</b> {item.price}</p>
        <p><b>Local:</b> {item.location}</p>
        <p><b>Data:</b> {item.date}</p>

        {item.analysis && (
          <p>
            <b>Análise:</b> {item.analysis}
          </p>
        )}

        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          Ver anúncio →
        </a>
      </div>
    </div>
  );
}

const styles = {
  card: {
    border: "1px solid #ccc",
    borderRadius: 8,
    padding: 15,
    display: "flex",
    gap: 15
  },
  image: { width: 120, height: "auto", borderRadius: 8 },
  link: { color: "blue", fontWeight: "bold" }
};
