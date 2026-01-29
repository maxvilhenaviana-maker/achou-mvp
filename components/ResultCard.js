import React from 'react';

export default function ResultCard({ content }) {
  let local = {};
  // Tenta converter o texto da IA em Objeto JSON real
  try {
    local = JSON.parse(content);
  } catch (e) {
    // Fallback caso a IA falhe no JSON (muito raro agora)
    local = {
      nome: "Erro na leitura",
      endereco: "Tente novamente",
      status: "Erro",
      motivo: "Não foi possível estruturar os dados.",
      telefone: "",
      distancia: "",
      horario: ""
    };
  }

  const copyToClipboard = () => {
    if (local.endereco && local.endereco !== "Não informado") {
      navigator.clipboard.writeText(local.endereco);
      alert("📋 Endereço copiado!");
    } else {
      alert("Endereço não disponível para cópia.");
    }
  };

  const shareWA = () => {
    // ALTERAÇÃO: Incluída a informação de distância no corpo da mensagem
    const text = encodeURIComponent(`*${local.nome}*\n📍 ${local.endereco}\n🕒 ${local.status} (Fecha às ${local.horario || '?'})\n📞 ${local.telefone}\n📏 Distância: ${local.distancia}\n\nPrecisei, achei com 1 clique no: achou.net.br`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="card-container">
      {/* Cabeçalho do Card */}
      <div className="card-header">
        <h2 className="card-title">{local.nome}</h2>
        <span className={`status-badge ${local.status?.toLowerCase().includes('fechado') ? 'fechado' : 'aberto'}`}>
          {local.status}
        </span>
      </div>

      <p className="card-reason">{local.motivo}</p>

      {/* ÁREA DOS BOTÕES */}
      <div className="buttons-row">
        <button onClick={copyToClipboard} className="btn btn-dark">
          📋 Copiar Endereço
        </button>
        <button onClick={shareWA} className="btn btn-green">
          📱 WhatsApp
        </button>
      </div>

      {/* Detalhes Técnicos */}
      <div className="details-box">
        {local.horario && local.horario !== "Consulte" && local.horario !== "24h" && (
          <div className="detail-row" style={{ color: '#E53E3E', fontWeight: 'bold' }}>
            <span className="icon">🕒</span>
            <span>Fecha às {local.horario}</span>
          </div>
        )}
        {local.horario === "24h" && (
           <div className="detail-row" style={{ color: '#28D07E', fontWeight: 'bold' }}>
           <span className="icon">🕒</span>
           <span>Aberto 24 horas</span>
         </div>
        )}

        <div className="detail-row">
          <span className="icon">📍</span>
          <span>{local.endereco}</span>
        </div>
        <div className="detail-row">
          <span className="icon">📏</span>
          <span>{local.distancia}</span>
        </div>
        <div className="detail-row">
          <span className="icon">📞</span>
          <span>{local.telefone}</span>
        </div>
      </div>

      <style jsx>{`
        .card-container {
          background-color: #ffffff;
          border-radius: 16px;
          padding: 20px;
          margin-top: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border: 1px solid #f0f0f0;
          display: flex;
          flex-direction: column;
          width: 100%;
          box-sizing: border-box;
          animation: slideUp 0.5s ease;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          gap: 10px;
        }
        .card-title {
          margin: 0;
          font-size: 1.25rem;
          color: #0F2133;
          font-weight: 800;
          line-height: 1.2;
        }
        .status-badge {
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .aberto { background: #E6FFFA; color: #28D07E; }
        .fechado { background: #FFF5F5; color: #F56565; }
        .card-reason {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .buttons-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          width: 100%;
        }
        .btn {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: opacity 0.2s;
        }
        .btn:active { opacity: 0.8; }
        .btn-dark { background: #0F2133; color: white; }
        .btn-green { background: #25D366; color: white; }
        .details-box {
          background: #F8F9FB;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .detail-row {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.9rem;
          color: #333;
        }
        .icon { min-width: 20px; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}