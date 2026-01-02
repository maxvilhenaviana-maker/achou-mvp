import React from 'react';

const UnifiedCard = ({ title, items, color, icon, isRanking = false }) => (
  <div style={{ 
    backgroundColor: '#fff', borderTop: `4px solid ${color}`, padding: '20px',
    borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    display: 'flex', flexDirection: 'column', height: '100%'
  }}>
    <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#0F2133', display: 'flex', alignItems: 'center', fontWeight: '700' }}>
      <span style={{ marginRight: '8px' }}>{icon}</span> {title}
    </h3>
    <div style={{ flex: 1 }}>
      {items.length > 0 ? items.map((it, idx) => {
        const parts = it.split('|');
        return (
          <div key={idx} style={{ padding: '12px 0', borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f0f0f2', fontSize: '0.9rem' }}>
            <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
              <span>{idx + 1}º {parts[0].trim()}</span>
              {isRanking && parts[1] && (
                <span style={{ backgroundColor: color, color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                  {parts[1].trim()}
                </span>
              )}
            </div>
            {parts[2] && <div style={{ color: '#666', fontSize: '0.85rem' }}>{parts[2].trim()}</div>}
            {!isRanking && <div style={{ color: '#444' }}>{it}</div>}
          </div>
        );
      }) : <p style={{ fontSize: '0.8rem', color: '#999' }}>Dados não processados.</p>}
    </div>
  </div>
);

export default function AnalysisReport({ content, produto, cidade }) {
  if (!content) return null;

  const extract = (tag) => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[|$)`, 'i');
    const match = content.match(regex);
    if (!match) return [];
    return match[1].trim().split('\n')
      .map(line => line.replace(/^[*-]\s*|^\d+\.\s*/, '').trim())
      .filter(line => line.length > 3);
  };

  const indicados = extract("CARD_1_INDICADOS");
  const reclamacoes = extract("CARD_2_RECLAMACOES");
  const suporte = extract("CARD_3_SUPORTE");
  const infoFinal = content.split(/\[DETALHAMENTO_MERCADO\]/i)[1] || content;

  const compartilharWhats = () => {
    const resumo = indicados.map((it, idx) => {
        const p = it.split('|');
        return `${idx + 1}º *${p[0].trim()}* (Nota: ${p[1]?.trim() || 'N/A'})\n`;
    }).join('');
    const texto = encodeURIComponent(`*Top 3 ${produto} em ${cidade}*\n\n${resumo}\nAnálise via achou.net.br`);
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  return (
    <div className="report-container" style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <button onClick={compartilharWhats} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          📱 Enviar Top 3 WhatsApp
        </button>
      </div>
      <div className="grid-destaques" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <UnifiedCard title="Ranking & Score" items={indicados} color="#28d07e" icon="🏆" isRanking={true} />
        <UnifiedCard title="Confiabilidade" items={reclamacoes} color="#ff9f43" icon="⚖️" />
        <UnifiedCard title="Suporte na Região" items={suporte} color="#0070f3" icon="📍" />
      </div>
      <div className="analise-detalhada" style={{ background: '#fff', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>{infoFinal.replace(/\[.*?\]/g, '')}</div>
      </div>
    </div>
  );
}