'use client';

import { useEffect } from 'react';

export function ProtectionScript() {
  useEffect(() => {
    // Deshabilitar clic derecho
    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Deshabilitar selección de texto
    const preventSelection = (e) => {
      e.preventDefault();
      return false;
    };

    // Deshabilitar arrastrar
    const preventDrag = (e) => {
      e.preventDefault();
      return false;
    };

    // Deshabilitar atajos de teclado peligrosos
    const preventShortcuts = (e) => {
      // Deshabilitar Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+P
      if (e.ctrlKey && ['a', 'c', 'v', 's', 'p'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      
      // Deshabilitar F12
      if (e.key === 'F12') {
        e.preventDefault();
        alert('🔒 Acceso denegado: Las herramientas de desarrollador están deshabilitadas');
        return false;
      }
      
      // Deshabilitar Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        alert('🔒 Acceso denegado: Las herramientas de desarrollador están deshabilitadas');
        return false;
      }
    };

    // Agregar event listeners
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventDrag);
    document.addEventListener('keydown', preventShortcuts);

    // Limpiar event listeners al desmontar
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('keydown', preventShortcuts);
    };
  }, []);

  return null;
}
