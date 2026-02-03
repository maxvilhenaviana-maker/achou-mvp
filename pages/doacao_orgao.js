import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function DoacaoOrgaos() {
  return (
    <div className="info-page">
      <Head>
        <title>Doação de Órgãos - Achou.net.br</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="content-wrapper">
        <div className="header-org">
          <span className="icon">💚</span>
          <h1>Doação de Órgãos</h1>
          <p className="subtitle">Transforme luto em esperança.</p>
        </div>

        <section className="info-block">
          <p>Mais de 60 mil pessoas aguardam na fila por um transplante no Brasil. A doação só acontece com a <strong>autorização da família</strong>.</p>
          
          <h3>Como ser um doador?</h3>
          <div className="highlight-box">
            <p>Não é preciso documento escrito. <strong>Avise sua família hoje mesmo:</strong> "Eu quero ser doador".</p>
          </div>

          <h3>O que pode ser doado?</h3>
          <ul>
            <li><strong>Órgãos:</strong> Coração, Pulmões, Fígado, Rins, Pâncreas.</li>
            <li><strong>Tecidos:</strong> Córneas, Ossos, Pele, Válvulas cardíacas.</li>
          </ul>

          <h3>Mitos e Verdades</h3>
          <ul>
            <li>A doação só ocorre após confirmação de <strong>morte encefálica</strong>.</li>
            <li>O processo é 100% gratuito pelo SUS e a fila é única nacional.</li>
          </ul>
        </section>

        <div className="footer-action">
          <p>Informe-se e conscientize sua família.</p>
          <Link href="/">
            <button className="btn-back">Voltar para a Busca</button>
          </Link>
        </div>
      </main>

      <style jsx>{`
        .info-page { background: #f0fdf4; min-height: 100vh; padding: 20px; font-family: sans-serif; color: #333; }
        .content-wrapper { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .header-org { text-align: center; margin-bottom: 30px; }
        .icon { font-size: 3rem; }
        h1 { color: #2e7d32; margin: 10px 0; }
        h3 { color: #2e7d32; margin-top: 25px; font-size: 1.2rem; }
        .highlight-box { background: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #2e7d32; margin: 20px 0; font-weight: bold; }
        ul { padding-left: 20px; line-height: 1.6; }
        li { margin-bottom: 8px; }
        .footer-action { margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        .btn-back { background: #2e7d32; color: white; border: none; padding: 12px 25px; border-radius: 25px; font-size: 1rem; cursor: pointer; margin-top: 10px; }
      `}</style>
    </div>
  );
}