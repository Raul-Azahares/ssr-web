// Configuración adicional de protección
export const PROTECTION_CONFIG = {
  // Configuración de html2canvas
  CANVAS_OPTIONS: {
    allowTaint: true,
    useCORS: true,
    scale: 0.5,
    width: 1920,
    height: 1080,
    backgroundColor: '#ffffff',
    logging: false,
    removeContainer: true,
  },
  
  // Teclas bloqueadas
  BLOCKED_KEYS: [
    'F12', // DevTools
    'F5',  // Refresh
    'F11', // Fullscreen
  ],
  
  // Combinaciones de teclas bloqueadas
  BLOCKED_COMBINATIONS: [
    { ctrl: true, key: 'a' }, // Select All
    { ctrl: true, key: 'c' }, // Copy
    { ctrl: true, key: 'v' }, // Paste
    { ctrl: true, key: 's' }, // Save
    { ctrl: true, key: 'p' }, // Print
    { ctrl: true, shift: true, key: 'I' }, // DevTools
    { ctrl: true, shift: true, key: 'C' }, // DevTools Console
    { ctrl: true, shift: true, key: 'J' }, // DevTools Console
    { ctrl: true, key: 'u' }, // View Source
    { ctrl: true, key: 'shift' }, // Shift
  ],
  
  // Mensajes de protección
  PROTECTION_MESSAGES: {
    DEV_TOOLS: '🔒 Acceso denegado: Las herramientas de desarrollador están deshabilitadas',
    RIGHT_CLICK: '🔒 Menú contextual deshabilitado',
    SELECTION: '🔒 Selección de texto deshabilitada',
    DRAG: '🔒 Arrastrar elementos deshabilitado',
  },
  
  // Configuración de imagen
  IMAGE_CONFIG: {
    format: 'image/png',
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  
  // Timeouts
  TIMEOUTS: {
    CONTENT_LOAD: 10000, // 10 segundos para cargar contenido
    CANVAS_CONVERSION: 30000, // 30 segundos para conversión
    RETRY_DELAY: 2000, // 2 segundos entre reintentos
  },
};

// Función para detectar herramientas de desarrollador
export const detectDevTools = () => {
  let devtools = false;
  
  const checkDevTools = () => {
    if (window.outerHeight - window.innerHeight > 200 || 
        window.outerWidth - window.innerWidth > 200) {
      devtools = true;
      alert(PROTECTION_CONFIG.PROTECTION_MESSAGES.DEV_TOOLS);
    }
  };
  
  // Verificar cada segundo
  setInterval(checkDevTools, 1000);
  
  return devtools;
};

// Función para bloquear inspección de elementos
export const blockElementInspection = () => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['I', 'C', 'J'].includes(e.key))) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  });
  
  // Bloquear clic derecho en elementos específicos
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  });
};

// Función para deshabilitar selección de texto
export const disableTextSelection = () => {
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    
    img, canvas {
      -webkit-user-drag: none !important;
      -khtml-user-drag: none !important;
      -moz-user-drag: none !important;
      -o-user-drag: none !important;
      user-drag: none !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
};

// Función para bloquear descarga de página
export const blockPageDownload = () => {
  // Bloquear Ctrl+S
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      alert('🔒 Descarga de página bloqueada');
      return false;
    }
  });
  
  // Bloquear menú de impresión
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'p') {
      e.preventDefault();
      alert('🔒 Impresión bloqueada');
      return false;
    }
  });
};
