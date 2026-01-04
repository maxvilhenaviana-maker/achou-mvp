import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsVisible(false);
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="install-banner">
      <div className="install-content">
        <span className="install-icon">📲</span>
        <div className="install-text">
          <strong>Achou! na sua tela</strong>
          <p>Instale para acesso rápido.</p>
        </div>
        <button onClick={handleInstallClick} className="install-btn">Instalar</button>
        <button onClick={() => setIsVisible(false)} className="close-btn">✕</button>
      </div>
      <style jsx>{`
        .install-banner {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          background: #0F2133;
          color: white;
          padding: 15px;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
          z-index: 9999;
        }
        .install-content { display: flex; align-items: center; gap: 12px; }
        .install-text { flex: 1; }
        .install-text strong { display: block; font-size: 0.9rem; }
        .install-text p { margin: 0; font-size: 0.75rem; opacity: 0.8; }
        .install-btn {
          background: #28D07E;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
        }
        .close-btn { background: transparent; border: none; color: white; cursor: pointer; }
      `}</style>
    </div>
  );
}