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
      
      // Simulate content loading
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Convert content to image
      await convertToImage();
      
    } catch (err) {
      setError('Error loading content. Please verify that the URL is accessible.');
    } finally {
      setIsLoading(false);
    }
  };

  const convertToImage = async () => {
    try {
      // Create temporary iframe to load content
      const tempIframe = document.createElement('iframe');
      tempIframe.src = url;
      tempIframe.style.position = 'absolute';
      tempIframe.style.left = '-9999px';
      tempIframe.style.top = '-9999px';
      tempIframe.style.width = '1920px';
      tempIframe.style.height = '1080px';
      document.body.appendChild(tempIframe);

      // Wait for content to load
      await new Promise((resolve) => {
        tempIframe.onload = resolve;
      });

      // Wait a bit more for complete rendering
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Convert to canvas using html2canvas
      const canvas = await html2canvas(tempIframe.contentDocument?.body || tempIframe, {
        allowTaint: true,
        useCORS: true,
        scale: 0.5, // Reduce size for better performance
        width: 1920,
        height: 1080,
      });

      // Convert canvas to image
      const imageDataUrl = canvas.toDataURL('image/png');
      setContentImage(imageDataUrl);

      // Clean up temporary iframe
      document.body.removeChild(tempIframe);

    } catch (err) {
      console.error('Error converting to image:', err);
      // If conversion fails, show error message
      setError('Could not load content. The page may have CORS restrictions.');
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

        {contentImage && !isLoading && !error && (
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
                🛡️ Content protected against copying and downloading
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
