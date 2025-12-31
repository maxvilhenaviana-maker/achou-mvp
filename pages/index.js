import { useState } from 'react';

export default function Home() {
  const [produto, setProduto] = useState('');
  const [cidade, setCidade] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function buscar(e) {
    e.preventDefault();

    if (!produto || !cidade || !categoria) {
      setError('Preencha produto, cidade e categoria.');
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const resp = await fetch('/api/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto, cidade, categoria })
      });

      const json = await resp.json();

      if (!resp.ok) {
        throw new Error(json.error || 'Erro ao gerar análise');
      }

      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <img src="/logo-512.png" alt="Achou.net.br" width={48} height={48} />
          <div>
            <strong>
              Achou<span style={{ color: '#28D07E' }}>.net.br</span>
            </strong>
            <div className="small">Guia Inteligente de Decisão de Compra</div>
          </div>
        </div>
      </header>

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

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Analisando…' : 'Gerar Análise'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {data && (
        <>
          <div className="card">
            <h3>✅ Melhores Opções</h3>
            {data.cards.melhores_opcoes.map((o, i) => (
              <p key={i}>
                <strong>{o.modelo}</strong> — {o.motivo}
              </p>
            ))}
          </div>

          <div className="card">
            <h3>💰 Faixa de Preço</h3>
            <p>
              <strong>Tendência:</strong> {data.cards.faixa_preco.tendencia}
            </p>
            <p>
              <strong>Onde pesquisar:</strong>{' '}
              {data.cards.faixa_preco.onde_pesquisar.join(', ')}
            </p>
            <p>{data.cards.faixa_preco.observacao}</p>
          </div>

          <div className="card">
            <h3>⚠️ Mais Reclamações</h3>
            {data.cards.mais_reclamacoes.map((r, i) => (
              <p key={i}>
                <strong>{r.modelo}</strong> — {r.problema}
              </p>
            ))}
          </div>

          <div className="card small">
            <h4>ℹ️ Informações Complementares</h4>
            <ul>
              {data.detalhes.recomendacoes_praticas.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

