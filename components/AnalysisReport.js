import React from 'react';

const UnifiedCard = ({ title, items, color, icon, isRanking = false }) => (
  <div style={{ 
    backgroundColor: '#fff', 
    borderTop: `4px solid ${color}`,
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(15,33,51,0.08)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  }}>
    <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#0F2133', display: 'flex', alignItems: 'center', fontWeight: '700' }}>
      <span style={{ marginRight: '8px' }}>{icon}</span> {title}
    </h3>
    <div style={{ flex: 1 }}>
      {items.map((it, idx) => {
        const parts = it.split('|');
        return (
          <div key={idx} style={{ 
            padding: '12px 0', 
            borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f0f0f2',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            <div style={{ fontWeight: '700', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{idx + 1}º {parts[0].replace(/^[-*0-9.\s]+/, '')}</span>
              {isRanking && parts[1] && (
                <span style={{ 
                  backgroundColor: color, 
                  color: '#fff', 
                  padding: '2px 8px', 
                  borderRadius: '4px', 
                  fontSize: '0.75rem' 
                }}>
                  {parts[1].trim()}
                </span>
              )}
            </div>
            {parts[2] && <div style={{ color: '#666', fontSize: '0.85rem' }}>{parts[2].trim()}</div>}
            {!isRanking && <div style={{ color: '#444' }}>{it.replace(/^[-*0-9.\s]+/, '')}</div>}
          </div>
        );
      })}
    </div>
  </div>
);

export default function AnalysisReport({ content, produto, cidade }) {
  if (!content) return null;

  const extract = (tag) => {
    const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[`, 'g');
    const match = regex.exec(content + '[');
    if (!match) return [];
    return match[1].trim().split('\n').filter(l => l.trim().length > 3);
  };

  const indicados = extract("CARD_1_INDICADOS");
  const reclamacoes = extract("CARD_2_RECLAMACOES");
  const suporte = extract("CARD_3_SUPORTE");
  const infoFinal = content.split("[DETALHAMENTO_MERCADO]")[1] || "";

  const compartilharWhats = () => {
    const saudacao = `*Análise de Compra: ${produto} em ${cidade}*\n\n`;
    const resumo = indicados.map((it, idx) => {
        const p = it.split('|');
        return `${idx + 1}º *${p[0].trim()}*\n⭐ Nota: ${p[1]?.trim() || 'N/A'}\n💰 ${p[2]?.trim() || ''}\n`;
    }).join('\n');
    const textoCompleto = encodeURIComponent(saudacao + resumo + `\nAnalisado por achou.net.br`);
    window.open(`https://api.whatsapp.com/send?text=${textoCompleto}`, '_blank');
  };

  return (
    <div className="report-container" style={{ marginTop: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
        <button onClick={compartilharWhats} style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
          <span>📱</span> Enviar Top 3 via WhatsApp
        </button>
      </div>

      <div className="grid-destaques">
        <UnifiedCard title="Ranking & Score" items={indicados} color="#28d07e" icon="🏆" isRanking={true} />
        <UnifiedCard title="Confiabilidade (Matriz)" items={reclamacoes} color="#ff9f43" icon="⚖️" />
        <UnifiedCard title="Suporte na Região" items={suporte} color="#0070f3" icon="📍" />
      </div>

      <div className="analise-detalhada">
        <h3 style={{ borderBottom: '2px solid #f0f0f0', paddingBottom: '10px', marginTop: 0 }}>Contexto e Recomendações</h3>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
          {infoFinal.replace(/\[.*?\]/g, '')}
        </div>
      </div>
      <style jsx>{`
        .grid-destaques { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .analise-detalhada { background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
      `}</style>
    </div>
  );
}