import Link from 'next/link';

export default function Tutorial() {
  return (
    <div className="container">
      <header className="header-nav">
        <Link href="/" legacyBehavior>
          <a className="btn-voltar">← Voltar</a>
        </Link>
      </header>

      <main className="content">
        <div className="header-area">
          <h1 className="title">Como usar o achou.net.br</h1>
          <p className="subtitle">Tutorial prático</p>
        </div>

        <div className="tutorial-section">
          <h3>1) Buscar estabelecimentos</h3>
          <p>Você pode buscar estabelecimentos basicamente de 4 formas:</p>
          <ul>
            <li><strong>a) Botões Rápidos:</strong> Clicando em um dos botões automáticos (Farmácia, Restaurante, etc) ou na lupa se o texto já estiver preenchido. A pesquisa é feita com um clique e traz o local aberto mais próximo. <br/><em>Exige localização (GPS) ativada.</em></li>
            
            <li><strong>b) Busca Livre:</strong> Digitando qualquer estabelecimento (ex: "Mcdonalds") ou tipo (ex: "Pet shop") na caixa de texto e clicando na lupa (botão verde).</li>
            
            <li><strong>c) Outro Local:</strong> Clicando no link azul "Buscar em outro local". Preencha Bairro, Cidade, Estado e País. Após indicar o local, clique no botão desejado ou na lupa.</li>
            
            <li><strong>d) Refazer:</strong> Clicando no botão azul "Refazer" que aparece no resultado. Esta opção descarta o local atual e busca o próximo mais perto.</li>
          </ul>
        </div>

        <div className="tutorial-section">
          <h3>2) Permitir localização (GPS)</h3>
          
          <div className="os-block">
            <h4>No Android:</h4>
            <ul>
              <li>Ao abrir o app, toque em “Permitir” na mensagem de acesso.</li>
              <li>Escolha “Permitir apenas durante o uso do app”.</li>
              <li><strong>Se já tiver negado:</strong> Vá em Configurações &gt; Localização &gt; Permissões de apps &gt; Encontre achou.net.br (ou seu navegador) &gt; Selecione "Permitir apenas durante o uso".</li>
            </ul>
          </div>

          <div className="os-block">
            <h4>No iPhone (iOS):</h4>
            <ul>
              <li>Ao acessar, toque em “Permitir durante o uso do app”.</li>
              <li><strong>Se já tiver negado:</strong> Ajustes &gt; Privacidade e Segurança &gt; Serviços de Localização &gt; Encontre achou.net.br (ou seu navegador) &gt; Selecione "Durante o uso do app".</li>
            </ul>
          </div>
          
          <p className="note"><strong>Importante:</strong> Não exigimos cadastro. A localização é usada apenas para mostrar resultados próximos no momento da busca.</p>
        </div>

        <div className="tutorial-section">
          <h3>3) Abrindo o mapa</h3>
          <p>Para abrir o GPS (Waze/Google Maps), basta clicar sobre o endereço apresentado no resultado da busca.</p>
        </div>

        <div className="tutorial-section">
          <h3>4) Ligando para o local</h3>
          <p>Clique sobre o número de telefone apresentado na busca para iniciar a chamada.</p>
        </div>

        <div className="tutorial-section">
          <h3>5) Enviando pelo WhatsApp</h3>
          <p>Clique no botão verde "WhatsApp" no resultado da busca, escolha o contato e envie os dados completos do local.</p>
        </div>

        <div className="tutorial-section">
          <h3>6) Copiando o endereço</h3>
          <p>Clique no botão preto "Copiar". Você pode colar o endereço em aplicativos de transporte ou mapas sem precisar digitar.</p>
        </div>

        <div className="tutorial-section">
          <h3>7) Salvando o App</h3>
          <ul>
            <li><strong>Android:</strong> Menu do Chrome &gt; 'Adicionar à tela inicial'.</li>
            <li><strong>iPhone:</strong> Ícone 'Compartilhar' &gt; 'Adicionar à Tela de Início'.</li>
          </ul>
        </div>

        <div className="tutorial-section">
          <h3>8) Acessando páginas do App</h3>
          <p>Clique no menu (três riscos) ao lado da logomarca do achou.net.br para ver opções como Sobre, Doação e Tutorial.</p>
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
          border-bottom: 1px solid #f0f0f0;
          margin-bottom: 20px;
        }
        .btn-voltar {
          text-decoration: none;
          color: #3182ce;
          font-weight: bold;
          font-size: 1rem;
        }
        .header-area {
          text-align: center;
          margin-bottom: 30px;
        }
        .title {
          font-size: 1.5rem;
          margin: 0;
          font-weight: 800;
          color: #0F2133;
        }
        .subtitle {
          color: #666;
          margin-top: 5px;
          font-size: 0.9rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .tutorial-section {
          margin-bottom: 30px;
          border-bottom: 1px solid #f7f7f7;
          padding-bottom: 20px;
        }
        .tutorial-section:last-child {
          border-bottom: none;
        }
        h3 {
          color: #28D07E;
          font-size: 1.1rem;
          margin-bottom: 15px;
          font-weight: 700;
        }
        h4 {
          font-size: 0.95rem;
          color: #0F2133;
          margin-bottom: 8px;
          margin-top: 15px;
        }
        p, li {
          line-height: 1.6;
          color: #333;
          font-size: 0.95rem;
          margin-bottom: 10px;
        }
        ul {
          padding-left: 20px;
          margin-bottom: 15px;
        }
        .os-block {
          background-color: #F8F9FB;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 15px;
        }
        .note {
          font-size: 0.85rem;
          color: #666;
          background: #fff;
          padding: 10px;
          border-left: 3px solid #0F2133;
        }
      `}</style>
    </div>
  );
}