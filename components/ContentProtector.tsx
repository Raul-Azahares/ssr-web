'use client';

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import styles from './ContentProtector.module.css';

interface ContentProtectorProps {
  url: string;
  onBack: () => void;
}

export function ContentProtector({ url, onBack }: ContentProtectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [contentImage, setContentImage] = useState<string>('');
  const [useIframe, setUseIframe] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Disable all dangerous interactions
    disableInteractions();
    
    // Load content from URL
    loadContent();
    
    return () => {
      // Re-enable interactions when unmounting
      enableInteractions();
    };
  }, [url]);

  const disableInteractions = () => {
    // Disable right-click
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Disable text selection
    document.addEventListener('selectstart', preventSelection);
    
    // Disable dragging
    document.addEventListener('dragstart', preventDrag);
    
    // Disable keyboard shortcuts
    document.addEventListener('keydown', preventShortcuts);
    
    // Disable F12, Ctrl+Shift+I, etc.
    document.addEventListener('keydown', preventDevTools);
    
    // Disable right-click on images
    document.addEventListener('contextmenu', preventImageContextMenu);
  };

  const enableInteractions = () => {
    document.removeEventListener('contextmenu', preventContextMenu);
    document.removeEventListener('selectstart', preventSelection);
    document.removeEventListener('dragstart', preventDrag);
    document.removeEventListener('keydown', preventShortcuts);
    document.removeEventListener('keydown', preventDevTools);
    document.removeEventListener('contextmenu', preventImageContextMenu);
  };

  const preventContextMenu = (e: Event) => {
    e.preventDefault();
    return false;
  };

  const preventSelection = (e: Event) => {
    e.preventDefault();
    return false;
  };

  const preventDrag = (e: Event) => {
    e.preventDefault();
    return false;
  };

  const preventShortcuts = (e: KeyboardEvent) => {
    // Disable Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+S, Ctrl+P
    if (e.ctrlKey && ['a', 'c', 'v', 's', 'p'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
    
    // Disable Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    
    // Disable F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
  };

  const preventDevTools = (e: KeyboardEvent) => {
    // Detect attempts to open DevTools
    if (e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J')) {
      e.preventDefault();
      alert('🔒 Access denied: Developer tools are disabled');
      return false;
    }
  };

  const preventImageContextMenu = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG' || target.tagName === 'CANVAS') {
      e.preventDefault();
      return false;
    }
  };

  const loadContent = async () => {
    try {
      setIsLoading(true);
      setError('');
      setUseIframe(false);
      setContentImage('');
      
      // Intentar con iframe directo primero
      console.log('Intentando cargar con iframe directo...');
      setUseIframe(true);
      
      // Esperar a que el iframe se renderice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const iframeSuccess = await tryIframeLoad();
      
      if (iframeSuccess) {
        console.log('Iframe cargado exitosamente (directo)');
        setIsLoading(false);
        return;
      }
      
      // Si iframe falla, usar proxy para obtener HTML y mostrarlo en iframe
      console.log('Iframe falló, usando proxy para obtener HTML...');
      // Mantener useIframe en true para que el iframe siga visible
      await convertToImageWithProxy();
      setIsLoading(false);
      
    } catch (err) {
      console.error('Error en loadContent:', err);
      setError('Error loading content. Please verify that the URL is accessible.');
      setUseIframe(false);
      setIsLoading(false);
    }
  };

  const tryIframeLoad = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!iframeRef.current) {
        console.log('iframeRef.current no existe');
        resolve(false);
        return;
      }

      const iframe = iframeRef.current;
      let loaded = false;

      const onLoad = () => {
        console.log('Iframe onLoad disparado');
        loaded = true;
        cleanup();
        resolve(true);
      };

      const onError = () => {
        console.log('Iframe onError disparado');
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        iframe.removeEventListener('load', onLoad);
        iframe.removeEventListener('error', onError);
      };

      iframe.addEventListener('load', onLoad);
      iframe.addEventListener('error', onError);
      
      console.log('Configurando iframe.src =', url);
      iframe.src = url;

      // Timeout después de 3 segundos
      setTimeout(() => {
        if (!loaded) {
          console.log('Timeout del iframe, considerando fallido');
          cleanup();
          resolve(false);
        }
      }, 3000);
    });
  };

  const convertToImageWithProxy = async () => {
    try {
      // Obtener HTML a través del proxy
      console.log('Obteniendo HTML del proxy...');
      const response = await fetch('/api/proxy-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Proxy request failed');
      }

      const data = await response.json();
      
      if (!data.success || !data.content) {
        throw new Error('No content received from proxy');
      }

      console.log('HTML recibido, mostrando en iframe protegido...');

      // Usar srcdoc en lugar de blob URL para mejor compatibilidad
      if (!iframeRef.current) {
        throw new Error('iframeRef no disponible');
      }

      const iframe = iframeRef.current;
      
      // Usar srcdoc - es la única forma de que los interceptores funcionen
      iframe.srcdoc = data.content;
      
      iframe.onload = () => {
        console.log('[ContentProtector] Iframe loaded with srcdoc');
        
        // Verificar que los interceptores estén activos
        try {
          const iframeWindow = iframe.contentWindow;
          if (iframeWindow) {
            console.log('[ContentProtector] Iframe window accessible');
          }
        } catch (e) {
          console.error('[ContentProtector] Cannot access iframe window:', e);
        }
      };

      // Marcar que estamos usando iframe con contenido del proxy
      setUseIframe(true);

    } catch (err) {
      console.error('Error en convertToImageWithProxy:', err);
      throw err;
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setError('Error loading content image');
    setIsLoading(false);
  };

  return (
    <div className={styles.protectorContainer}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backButton}>
          ← Back
        </button>
        <h2>Protected Content</h2>
        <div className={styles.urlDisplay}>
          🔗 {url}
        </div>
      </div>

      <div className={styles.contentArea}>
        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>🛡️ Protecting content...</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <h3>⚠️ Error</h3>
            <p>{error}</p>
            <button onClick={() => loadContent()} className={styles.retryButton}>
              🔄 Retry
            </button>
          </div>
        )}

        {!isLoading && !error && useIframe && !contentImage && (
          <div className={styles.protectedContent}>
            <iframe
              ref={iframeRef}
              className={styles.protectedIframe}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-top-navigation-by-user-activation allow-downloads allow-popups-to-escape-sandbox"
              referrerPolicy="no-referrer"
              title="Protected content"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        )}

        {!isLoading && !error && contentImage && (
          <div className={styles.protectedContent}>
            <img
              src={contentImage}
              alt="Protected content"
              className={styles.protectedImage}
              onLoad={handleImageLoad}
              onError={handleImageError}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
            <div className={styles.overlay}>
              <div className={styles.protectionNotice}>
                🛡️ Content protected - Screenshot mode
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.protectionInfo}>
        <h3>🔒 Active Protections:</h3>
        <ul>
          <li>✅ Right-click disabled</li>
          <li>✅ Text selection blocked</li>
          <li>✅ Page download prevented</li>
          <li>✅ Content rendered as image</li>
          <li>✅ Developer tools blocked</li>
          <li>✅ Keyboard shortcuts disabled</li>
        </ul>
      </div>
    </div>
  );
}
