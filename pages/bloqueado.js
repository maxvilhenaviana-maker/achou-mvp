import React from 'react';
import Head from 'next/head';

export default function Bloqueado() {
  return (
    <div className="blocked-container">
      <Head>
        <title>Acesso Restrito - Achou!</title>
      </Head>
      
      <div className="content">
        <span className="icon">🇧🇷</span>
        <h1>Ops! Acesso Restrito.</h1>
        <p>O <strong>achou.net.br</strong> está disponível, por enquanto, apenas em território brasileiro.</p>
        <p className="subtext">Identificamos que você está acessando de outro país.</p>
      </div>

      <style jsx>{`
        .blocked-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #F8F9FB;
          font-family: sans-serif;
          padding: 20px;
          text-align: center;
        }
        .content {
          max-width: 400px;
          padding: 40px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .icon { font-size: 3rem; display: block; margin-bottom: 20px; }
        h1 { color: #0F2133; font-size: 1.5rem; margin-bottom: 15px; }
        p { color: #4A5568; line-height: 1.6; }
        .subtext { font-size: 0.8rem; color: #A0AEC0; margin-top: 20px; }
      `}</style>
    </div>
  );
}