import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function DoacaoSangue() {
  return (
    <div className="info-page">
      <Head>
        <title>Doação de Sangue - Achou.net.br</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="content-wrapper">
        <div className="header-blood">
          <span className="icon">🩸</span>
          <h1>Doação de Sangue</h1>
          <p className="subtitle">Um gesto simples que salva vidas.</p>
        </div>

        <section className="info-block">
          <p>A doação de sangue é um ato voluntário, seguro e essencial. Uma única doação pode salvar <strong>até 4 vidas</strong>.</p>
          
          <h3>Quem pode doar?</h3>
          <ul>
            <li>Pessoas em boas condições de saúde.</li>
            <li>Idade entre <strong>16 e 69 anos</strong>.</li>
            <li>Peso superior a <strong>50 kg</strong>.</li>
            <li>É obrigatório apresentar documento oficial com foto.</li>
          </ul>

          <h3>Frequência</h3>
          <ul>
            <li><strong>Homens:</strong> Até 4 doações por ano (intervalo de 60 dias).</li>
            <li><strong>Mulheres:</strong> Até 3 doações por ano (intervalo de 90 dias).</li>
          </ul>

          <div className="alert-box">
            <p><strong>Atenção:</strong> Em feriados e no inverno, os estoques caem drasticamente. Sua doação é vital nesses períodos.</p>
          </div>
        </section>

        <div className="footer-action">
          <p>Encontre o posto de doação mais próximo no <strong>achou.net.br</strong></p>
          <Link href="/">
            <button className="btn-back">Voltar para a Busca</button>
          </Link>
        </div>
      </main>

      <style jsx>{`
        .info-page { background: #fff5f5; min-height: 100vh; padding: 20px; font-family: sans-serif; color: #333; }
        .content-wrapper { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header-blood { text-align: center; margin-bottom: 30px; }
        .icon { font-size: 3rem; }
        h1 { color: #d32f2f; margin: 10px 0; }
        h3 { color: #d32f2f; margin-top: 25px; font-size: 1.2rem; }
        ul { padding-left: 20px; line-height: 1.6; }
        li { margin-bottom: 8px; }
        .alert-box { background: #ffebee; padding: 15px; border-radius: 8px; border-left: 4px solid #d32f2f; margin-top: 20px; }
        .footer-action { margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        .btn-back { background: #d32f2f; color: white; border: none; padding: 12px 25px; border-radius: 25px; font-size: 1rem; cursor: pointer; margin-top: 10px; }
      `}</style>
    </div>
  );
}