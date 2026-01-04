export default function ResultCard({ content }) {
  const extract = (tag) => {
    const regex = new RegExp(`\\[${tag}\\]:?\\s*(.*)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : "Não identificado";
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
    alert("📍 Endereço copiado!");
  };

  const shareWA = () => {
    const text = encodeURIComponent(`*${local.nome}*\n📍 ${local.endereco}\n🕒 ${local.status}\n\nEncontrado via achou.net.br`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="card-wrapper">
      <div className="card">
        <div className="header-result">
          <h2 className="title">{local.nome}</h2>
          <div className="badge-aberto">Aberto Agora</div>
        </div>
        
        <p className="motivo">{local.motivo}</p>

        {/* 1) BOTÕES ENTRE O CABEÇALHO E O RESULTADO */}
        <div className="main-actions">
          <button className="btn-action btn-copy" onClick={copyToClipboard}>
             📋 Copiar Endereço
          </button>
          <button className="btn-action btn-wa" onClick={shareWA}>
             📱 Enviar WhatsApp
          </button>
        </div>

        <div className="details-box">
          <div className="item"><strong>🏠 Endereço:</strong> {local.endereco}</div>
          <div className="item"><strong>📏 Distância:</strong> {local.distancia}</div>
          <div className="item"><strong>🕒 Status:</strong> {local.status}</div>
          <div className="item"><strong>📞 Tel:</strong> {local.telefone}</div>
        </div>
      </div>

      <style jsx>{`
        .card-wrapper { margin-top: 20px; animation: fadeInUp 0.4s ease; }
        .card { background: white; border-radius: 20px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.08); border: 1px solid #efefef; }
        .header-result { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .title { font-size: 1.4rem; color: #0F2133; margin: 0; }
        .badge-aberto { background: #28D07E; color: white; padding: 4px 10px; border-radius: 50px; font-size: 11px; font-weight: bold; }
        .motivo { color: #666; font-size: 14px; margin-bottom: 20px; line-height: 1.4; }
        
        .main-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .btn-action { border: none; padding: 14px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 5px; }
        .btn-copy { background: #0F2133; color: white; }
        .btn-wa { background: #25D366; color: white; }
        
        .details-box { background: #F8F9FB; padding: 15px; border-radius: 15px; }
        .item { font-size: 13px; margin-bottom: 8px; color: #444; }
        
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}