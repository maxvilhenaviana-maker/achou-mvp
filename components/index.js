import { useState } from 'react';

export default function Home() {
  const [produto, setProduto] = useState('');
  const [cidade, setCidade] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [error, setError] = useState(null);

  async function buscar(e) {
    e.preventDefault();

    if (!produto || !cidade || !categoria) {
      setError("Preencha produto, cidade e categoria.");
      return;
    }
    setError(null);
    setLoading(true);
    setAnalysis('');

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto, cidade, categoria })
      });

      const json = await resp.json();

      if (!resp.ok) {
        throw new Error(json.error || "Erro ao gerar análise");
      }

      setAnalysis(json.analysis);

    } catch (err) {
      setError(err.message);

    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1>Guia Inteligente de Decisão de Compra</h1>

      <form onSubmit={buscar} className="searchRow">
        <input
          className="input"
          placeholder="Produto"
          value={produto}
          onChange={e => setProduto(e.target.value)}
        />

        <input
          className="input"
          placeholder="Cidade"
          value={cidade}
          onChange={e => setCidade(e.target.value)}
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn"
            style={{ opacity: categoria === 'NOVO' ? 1 : 0.6 }}
            onClick={() => setCategoria('NOVO')}
          >
            Novo
          </button>

          <button
            type="button"
            className="btn"
            style={{ opacity: categoria === 'USADO' ? 1 : 0.6 }}
            onClick={() => setCategoria('USADO')}
          >
            Usado
          </button>
        </div>

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Analisando…' : 'Gerar Análise'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {analysis && (
        <div style={{
          whiteSpace: 'pre-wrap',
          background: '#fff',
          padding: '20px',
          marginTop: '20px',
          borderRadius: '8px'
        }}>
          {analysis}
        </div>
      )}
    </div>
  );
}
