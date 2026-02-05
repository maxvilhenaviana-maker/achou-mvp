import Link from 'next/link';

export default function Sobre() {
  return (
    <div className="container">
      <header className="header-nav">
        <Link href="/" legacyBehavior>
          <a className="btn-voltar">← Voltar</a>
        </Link>
      </header>

      <main className="content">
        <div className="logo-container">
          <img src="/logo-512.png" alt="achou.net.br logo" className="logo-hero" />
        </div>
        
        <h1 className="title">achou.net.br</h1>
        <h2 className="subtitle">Utilidade Pública Digital</h2>

        <div className="text-body">
          <p>Este aplicativo é gratuito, sem anúncios e sem coleta de dados pessoais.</p>
          
          <p>Seu objetivo é facilitar o acesso rápido a serviços essenciais abertos próximos, reduzindo ao máximo o trabalho de pesquisa, em momentos de urgência.</p>
          
          <p>O achou também apoia a doação de sangue e de órgãos, divulgando informações oficiais e mensagens de incentivo, em alinhamento com campanhas públicas de saúde.</p>
        </div>

        <div className="contact-area">
          <p className="contact-label">Contatos:</p>
          <a href="mailto:achounetbr@gmail.com" className="contact-link">achounetbr@gmail.com</a>
        </div>
      </main>

      <style jsx>{`
        .container {
          max-width: 480px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
          background-color: #fff;
          font-family: sans-serif;
          color: #0F2133;
        }
        .header-nav {
          padding-bottom: 20px;
        }
        .btn-voltar {
          text-decoration: none;
          color: #3182ce;
          font-weight: bold;
          font-size: 1rem;
        }
        .content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding-top: 20px;
        }
        .logo-container {
          margin-bottom: 20px;
        }
        .logo-hero {
          width: 120px;
          height: 120px;
          border-radius: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .title {
          font-size: 1.8rem;
          margin: 0 0 5px 0;
          font-weight: 800;
        }
        .subtitle {
          font-size: 1rem;
          color: #666;
          font-weight: 400;
          margin: 0 0 30px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .text-body {
          text-align: left;
          line-height: 1.6;
          color: #333;
          margin-bottom: 30px;
          width: 100%;
        }
        .text-body p {
          margin-bottom: 15px;
        }
        .contact-area {
          border-top: 1px solid #eee;
          width: 100%;
          padding-top: 20px;
        }
        .contact-label {
          font-weight: bold;
          margin-bottom: 5px;
        }
        .contact-link {
          color: #3182ce;
          text-decoration: none;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}