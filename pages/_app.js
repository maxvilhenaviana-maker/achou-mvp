import '../styles/globals.css';
import Head from 'next/head';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(
          (reg) => console.log('SW registrado'),
          (err) => console.log('Erro no SW', err)
        );
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Achou! - Radar Local</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0F2133" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Achou!" />
        <link rel="apple-touch-icon" href="/logo-512.png" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}