export default function ResultCard({ content }) {
  const extract = (tag) => {
    const regex = new RegExp(`\\[${tag}\\]:?\\s*(.*)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : "N/A";
  };

  const local = {
    nome: extract("NOME"),
    endereco: extract("ENDERECO"),
    status: extract("STATUS"),
    distancia: extract("DISTANCIA"),
    telefone: extract("TELEFONE"),
    motivo: extract("POR_QUE")
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(local.endereco);
    alert("📍 Endereço copiado! Agora abra seu GPS e cole.");
  };

  const shareWA = () => {
    const text = encodeURIComponent(`*${local.nome}*\n📍 ${local.endereco}\n🕒 ${local.status}\n📏 ${local.distancia}\n\nEncontrado via achou.net.br`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="card-animation">
      <div className="card">
        <div className="status-badge">{local.status}</div>
        <h2 className="title">{local.nome}</h2>
        <p className="motivo">{local.motivo}</p>
        
        <div className="info-section">
          <div className="info-item"><strong>📍 Endereço:</strong> {local.endereco}</div>
          <div className="info-item"><strong>📏 Distância:</strong> {local.distancia}</div>
          <div className="info-item"><strong>📞 Tel:</strong> {local.telefone}</div>
        </div>

        <div className="actions">
          <button className="btn-gps" onClick={copyToClipboard}>📋 Copiar Endereço</button>
          <button className="btn-wa" onClick={shareWA}>📱 Enviar WhatsApp</button>
        </div>
      </div>

      <style jsx>{`
        .card-animation { animation: slideUp 0.4s ease-out; margin-top: 25px; }
        .card { background: white; border-radius: 20px; padding: 25px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); position: relative; border: 1px solid #f0f0f0; }
        .status-badge { position: absolute; top: 15px; right: 15px; background: #28d07e; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; }
        .title { margin: 0 0 10px 0; color: #0F2133; font-size: 1.5rem; padding-right: 60px; }
        .motivo { color: #666; font-size: 14px; margin-bottom: 20px; font-style: italic; }
        .info-section { background: #f8f9fa; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
        .info-item { margin-bottom: 8px; font-size: 14px; }
        .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .btn-gps { background: #0F2133; color: white; border: none; padding: 15px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        .btn-wa { background: #25D366; color: white; border: none; padding: 15px; border-radius: 12px; font-weight: bold; cursor: pointer; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}