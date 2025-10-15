// Script para cargar html2canvas dinámicamente
export const loadHtml2Canvas = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.html2canvas) {
      resolve(window.html2canvas);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => {
      if (window.html2canvas) {
        resolve(window.html2canvas);
      } else {
        reject(new Error('html2canvas no se pudo cargar'));
      }
    };
    script.onerror = () => {
      reject(new Error('Error al cargar html2canvas'));
    };
    
    document.head.appendChild(script);
  });
};
