import { useState } from "react";
import ResultCard from "../components/ResultCard";

export default function Home() {
  const [produto, setProduto] = useState("");
  const [cidade, setCidade] = useState("");
  const [raio, setRaio] = useState(40);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  async function buscar() {
    setLoading(true);
    setError("");
    setItems([]);

    try {
      const resp = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produto, cidade, raio })
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError("Erro ao buscar: " + JSON.stringify(data));
      } else {
        setItems(data.items || []);
      }
    } catch (e) {
      setError("Erro inesperado: " + e.toString());
    }

    setLoading(false);
  }

  return (
    <div style={styles.container}>
      <h1>ACHOU.NET.BR</h1>
      <p>Buscador inteligente de oportunidades</p>

      <div style={styles.form}>
        <input
          style={styles.input}
          placeholder="Produto..."
          value={produto}
          onChange={(e) => setProduto(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Cidade..."
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
        />

        <input
          style={styles.input}
          type="number"
          value={raio}
          onChange={(e) => setRaio(e.target.value)}
        />

        <button style={styles.button} onClick={buscar}>
          Buscar
        </button>
      </div>

      {loading && <p>🔍 Buscando anúncios reais...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={styles.results}>
        {items.map((item, i) => (
          <ResultCard key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 700, margin: "0 auto", padding: 20 },
  form: { display: "flex", gap: 10, marginBottom: 20 },
  input: { padding: 10, flex: 1 },
  button: { padding: "10px 20px", background: "black", color: "white" },
  results: { display: "flex", flexDirection: "column", gap: 20 }
};
