export const GA_TRACKING_ID = 'G-2XH20XTJQ3';

// Registra visualização de página
export const pageview = (url) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GA_TRACKING_ID, {
      page_path: url,
    });
  }
};

// Registra eventos. Agora suporta parâmetros extras (como arrays de itens para e-commerce)
export const event = ({ action, category, label, value, ...otherParams }) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
      ...otherParams // Passa o restante dos parâmetros (como items[])
    });
  }
};