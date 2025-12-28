import React from 'react';

export default function ResultCard({ item, highlight }) {
  // Função para copiar os dados do anúncio como texto simples
  const copiarAnuncio = (e) => {
    e.preventDefault();

    if (!item) return;

    try {
      // Criamos uma lista de textos ignorando campos técnicos (como imagens ou links)
      const camposParaCopiar = [
        `Título: ${item.title || 'N/A'}`,
        `Preço: R$ ${item.price || '—'}`,
        `Local: ${item.location || '—'}`,
        `Data: ${item.date || '—'}`,
        `Análise: ${item.analysis || ''}`,
        `Link: ${item.link || ''}`
      ];

      const textoFinal = camposParaCopiar.join('\n');
      
      navigator.clipboard.writeText(textoFinal);
      alert("📋 Dados do anúncio copiados!");
    } catch (err) {
      console.error("Erro ao copiar:", err);
      alert("Não foi possível copiar os dados.");
    }
  };

  if (!item) return null;

  return (
    <div className="card" style={{ border: highlight ? '2px solid #28d07e' : '1px solid #eee', padding: '15px', borderRadius: '8px', marginBottom: '10px', backgroundColor: '#fff' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 5px 0' }}>{item.title}</p>
        <p style={{ color: '#28d07e', fontWeight: 'bold', fontSize: '1.2rem', margin: '0 0 5px 0' }}>
          {item.price ? `R$ ${item.price}` : 'Consultar preço'}
        </p>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>
          {item.location || 'Local não informado'} • {item.date || 'Data não informada'}
        </p>
        <p style={{ marginTop: '10px', fontSize: '0.95rem', lineHeight: '1.4' }}>{item.analysis}</p>
        
        {highlight && (
          <span style={{ color: '#28d07e', fontWeight: '700', display: 'block', marginTop: '10px' }}>
            🔥 Melhor oferta encontrada!
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', marginTop: '15px' }}>
        <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
          <button style={{ width: '100%', padding: '8px', backgroundColor: '#0f2133', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Ver anúncio original
          </button>
        </a>

        <span
          onClick={copiarAnuncio}
          style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#0070f3', textDecoration: 'underline' }}
        >
          Copiar dados do anúncio
        </span>
      </div>
    </div>
  );
}