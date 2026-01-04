export default function ResultCard({ content }) {
  const extract = (tag) => {
    const regex = new RegExp(`\\[${tag}\\]:?\\s*(.*)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : "Informação não disponível";
  };

  const local = {
    nome: extract("NOME"),
    endereco: extract("ENDERECO"),
    status: extract("STATUS"),
    distancia: extract("DISTANCIA"),
    telefone: extract("TELEFONE"),
    motivo: extract("POR_QUE")
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="local-name">{local.nome}</h2>
        <span className="badge">Aberto</span>
      </div>

      <p className="description">{local.motivo}</p>

      {/* BOTÕES POSICIONADOS CONFORME SOLICITADO */}
      <div className="action-buttons">
        <button className="btn-copy" onClick={() => {
          navigator.clipboard.writeText(local.endereco);
          alert("Endereço copiado!");
        }}>📋 Copiar Endereço</button>
        
        <button className="btn-wa" onClick={() => {
          const text = encodeURIComponent(`*${local.nome}*\n📍 ${local.endereco}\n\nEncontrado via achou.net.br`);
          window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
        }}>📱 WhatsApp</button>
      </div>

      <div className="info-grid">
        <div className="info-item"><strong>📍 Endereço:</strong> {local.endereco}</div>
        <div className="info-item"><strong>📏 Distância:</strong> {local.distancia}</div>
        <div className="info-item"><strong>📞 Tel:</strong> {local.telefone}</div>
      </div>

      <style jsx>{`
        .card { 
          background: #fff; border-radius: 20px; padding: 20px; margin-top: 25px;
          border: 1px solid #eee; box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .local-name { font-size: 1.3rem; margin: 0; color: #0f2133; flex: 1; }
        .badge { background: #28d07e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        .description { font-size: 14px; color: #666; margin-bottom: 20px; line-height: 1.4; }
        
        .action-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .action-buttons button { 
          border: none; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 12px;
          transition: opacity 0.2s;
        }
        .btn-copy { background: #0f2133; color: white; }
        .btn-wa { background: #25d366; color: white; }
        
        .info-grid { background: #f8f9fb; padding: 15px; border-radius: 15px; }
        .info-item { font-size: 13px; margin-bottom: 8px; color: #333; }
        .info-item:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}