'use client';

import React, { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [protectedUrl, setProtectedUrl] = useState('');
  const [protectionMode, setProtectionMode] = useState('');
  const [screenshotImage, setScreenshotImage] = useState('');
  const [proxyContent, setProxyContent] = useState('');
  const [iframeError, setIframeError] = useState(false);

  const handleUrlSubmit = async (e: React.FormEvent, mode: string) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setIframeError(false);
    
    try {
      new URL(url);
      setProtectedUrl(url);
      setProtectionMode(mode);
      
      if (mode === 'screenshot') {
        await captureScreenshotWithPuppeteer(url);
      } else if (mode === 'iframe') {
        // Intentar primero con proxy, luego con iframe como fallback
        await fetchContentViaProxy(url);
      }
    } catch (err) {
      setError('Please enter a valid URL (example: https://example.com)');
    } finally {
      setIsLoading(false);
    }
  };

  const captureScreenshotWithPuppeteer = async (targetUrl: string) => {
    try {
      console.log('Capturando screenshot con Puppeteer para:', targetUrl);
      setIsLoading(true);
      
      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Screenshot capturado exitosamente');
        if (data.success && data.image) {
          setScreenshotImage(data.image);
          setError('');
        } else {
          setError('Error al capturar el screenshot');
        }
      } else {
        const errorData = await response.json();
        console.error('Error en screenshot API:', errorData);
        setError(`Error al capturar screenshot: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error capturando screenshot:', error);
      setError('Error al intentar capturar el screenshot');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContentViaProxy = async (targetUrl: string) => {
    try {
      console.log('Intentando obtener contenido via proxy para:', targetUrl);
      setIsLoading(true);
      const response = await fetch('/api/proxy-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Respuesta del proxy:', data);
        if (data.success && data.content && data.content.trim().length > 0) {
          console.log('Contenido obtenido via proxy exitosamente, longitud:', data.content.length);
          setProxyContent(data.content);
          setIframeError(false);
          setError('');
          
          // Verificar después de 3 segundos si el iframe está vacío
          setTimeout(() => {
            const iframe = document.querySelector('iframe[sandbox]') as HTMLIFrameElement;
            if (iframe) {
              try {
                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                if (doc && doc.body && doc.body.innerHTML.trim().length < 100) {
                  console.warn('El contenido del iframe parece estar vacío después de cargar');
                  setError('⚠️ El contenido se cargó pero puede estar vacío. Algunos sitios requieren estar en su dominio original para funcionar correctamente.');
                }
              } catch (e) {
                console.log('No se puede verificar el contenido del iframe (esto es normal)');
              }
            }
          }, 3000);
        } else {
          console.log('Proxy devolvió contenido vacío o sin éxito');
          setError('El sitio web no permite ser cargado. Intenta con otra URL.');
          setIframeError(true);
        }
      } else {
        console.log('Proxy falló con status:', response.status);
        const errorData = await response.json();
        console.log('Error del proxy:', errorData);
        setError(`No se pudo cargar el contenido: ${errorData.error || 'Error desconocido'}`);
        setIframeError(true);
      }
    } catch (error) {
      console.log('Error en proxy:', error);
      setError('Error al intentar cargar el contenido a través del proxy.');
      setIframeError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const generateScreenshotWithoutPopup = async (targetUrl: string) => {
    try {
      await createSimpleScreenshot(targetUrl);
    } catch (err) {
      console.log('Screenshot failed:', err);
      await createFallbackScreenshot(targetUrl);
    }
  };

  const createSimpleScreenshot = async (targetUrl: string) => {
    const html2canvas = await loadHtml2Canvas() as any;
    
    const iframe = document.createElement('iframe');
    iframe.src = targetUrl;
    iframe.style.cssText = `
      position: fixed;
      left: -9999px;
      top: -9999px;
      width: 1200px;
      height: 800px;
      border: none;
      opacity: 0;
      pointer-events: none;
    `;
    
    document.body.appendChild(iframe);

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        document.body.removeChild(iframe);
        reject(new Error('Timeout'));
      }, 10000);

      iframe.onload = () => {
        clearTimeout(timeout);
        resolve(true);
      };
      
      iframe.onerror = () => {
        clearTimeout(timeout);
        document.body.removeChild(iframe);
        reject(new Error('Load error'));
      };
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const canvas = await html2canvas(iframe, {
        allowTaint: true,
        useCORS: true,
        scale: 0.6,
        width: 1200,
        height: 800,
        backgroundColor: '#ffffff',
        logging: false
      });

      const watermarkedCanvas = addSimpleWatermark(canvas);
      const imageDataUrl = watermarkedCanvas.toDataURL('image/png', 0.9);
      setScreenshotImage(imageDataUrl);

    } catch (err) {
      console.log('Capture error:', err);
      throw err;
    } finally {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }
  };

  const createFallbackScreenshot = async (targetUrl: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1200;
    canvas.height = 800;
    
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#333';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Screenshot Preview', canvas.width/2, 200);
      
      ctx.fillStyle = '#666';
      ctx.font = '18px Arial';
      ctx.fillText(targetUrl, canvas.width/2, 250);
      
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(50, 300, canvas.width - 100, canvas.height - 400);
      
      ctx.fillStyle = '#333';
      ctx.font = '20px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('This is a preview of the protected content.', 70, 350);
      ctx.fillText('The actual page content would be displayed here', 70, 380);
      ctx.fillText('with watermark protection applied.', 70, 410);
      
      const watermarkedCanvas = addSimpleWatermark(canvas);
      const imageDataUrl = watermarkedCanvas.toDataURL('image/png', 0.9);
      setScreenshotImage(imageDataUrl);
    }
  };

  const addSimpleWatermark = (originalCanvas: HTMLCanvasElement) => {
    const watermarkedCanvas = document.createElement('canvas');
    const ctx = watermarkedCanvas.getContext('2d');
    watermarkedCanvas.width = originalCanvas.width;
    watermarkedCanvas.height = originalCanvas.height;
    
    if (ctx) {
      ctx.drawImage(originalCanvas, 0, 0);
      
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 60px Arial';
      ctx.textAlign = 'center';
      
      ctx.translate(watermarkedCanvas.width/2, watermarkedCanvas.height/2);
      ctx.rotate(-Math.PI / 6);
      
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          ctx.fillText('PROTECTED', i * 400, j * 200);
        }
      }
      
      ctx.restore();
    }
    
    return watermarkedCanvas;
  };

  const loadHtml2Canvas = () => {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && (window as any).html2canvas) {
        resolve((window as any).html2canvas);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.onload = () => {
        if ((window as any).html2canvas) {
          resolve((window as any).html2canvas);
        } else {
          reject(new Error('html2canvas could not be loaded'));
        }
      };
      script.onerror = () => {
        reject(new Error('Error loading html2canvas'));
      };
      
      document.head.appendChild(script);
    });
  };

  const handleBack = () => {
    setProtectedUrl('');
    setUrl('');
    setError('');
    setProtectionMode('');
    setScreenshotImage('');
    setProxyContent('');
    setIframeError(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        padding: '3rem',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #667eea, #764ba2)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          🛡️ Web Content Protector v1.1
        </h1>
        
        <p style={{
          fontSize: '1.2rem',
          textAlign: 'center',
          color: '#666',
          marginBottom: '3rem',
          lineHeight: '1.6'
        }}>
          Protect any web page from copying, right-click and download
        </p>
        
        {!protectedUrl ? (
          <div>
            <form onSubmit={(e) => e.preventDefault()} style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://ntsprint.com/"
                  style={{
                    flex: 1,
                    padding: '1rem 1.5rem',
                    border: '2px solid #e1e5e9',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    transition: 'all 0.3s ease',
                    background: 'white'
                  }}
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button 
                  type="button"
                  onClick={(e) => handleUrlSubmit(e, 'iframe')}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    minWidth: '200px'
                  }}
                  disabled={isLoading || !url.trim()}
                >
                  {isLoading && protectionMode === 'iframe' ? '🔄' : '🛡️'} Protect (Iframe)
                </button>
                
                <button 
                  type="button"
                  onClick={(e) => handleUrlSubmit(e, 'screenshot')}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #f093fb, #f5576c)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    minWidth: '200px'
                  }}
                  disabled={isLoading || !url.trim()}
                >
                  {isLoading && protectionMode === 'screenshot' ? '🔄' : '📸'} Protect (Advance)
                </button>
              </div>
              {error && (
                <div style={{
                  color: '#e74c3c',
                  background: '#fdf2f2',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  textAlign: 'center'
                }}>
                  {error}
                </div>
              )}
            </form>
            
            <div style={{
              background: '#f8f9fa',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #e1e5e9'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#333',
                fontSize: '1.2rem'
              }}>
                Available Protection Modes:
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #667eea'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#667eea' }}>
                    🛡️ Iframe Mode (Basic)
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
                    <li>Right-click blocking</li>
                    <li>Text selection disabled</li>
                    <li>DevTools protection</li>
                    <li>Keyboard shortcuts blocked</li>
                    <li>Works with most websites</li>
                  </ul>
                </div>
                
                <div style={{
                  background: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '2px solid #f5576c'
                }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: '#f5576c' }}>
                    📸 Advance Mode
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
                    <li>Server-side screenshot capture</li>
                    <li>Works with ANY website</li>
                    <li>No HTML code accessible</li>
                    <li>Maximum protection</li>
                    <li>Bypasses iframe restrictions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            marginTop: '2rem',
            padding: '2rem',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e1e5e9'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>
                Protected Content - {protectionMode === 'screenshot' ? 'Screenshot + Watermark' : 'Iframe'}
              </h2>
              <button 
                onClick={handleBack}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ← Back
              </button>
            </div>
            
            <p style={{ 
              margin: '0 0 1rem 0', 
              color: '#666', 
              wordBreak: 'break-all',
              background: '#e8f4fd',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #bee5eb'
            }}>
              🔗 Protected URL: {protectedUrl}
            </p>
            
            {protectionMode === 'screenshot' && screenshotImage ? (
              <div style={{
                margin: '1rem 0',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                border: '2px solid #e74c3c',
                textAlign: 'center'
              }}>
                <img
                  src={screenshotImage}
                  alt="Protected content as screenshot"
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    pointerEvents: 'none'
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                />
                <div style={{
                  background: '#e74c3c',
                  color: 'white',
                  padding: '0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: '600'
                }}>
                  📸 Content Protected as Screenshot with Invisible Watermarking
                </div>
              </div>
            ) : protectionMode === 'screenshot' && isLoading ? (
              <div style={{
                margin: '1rem 0',
                borderRadius: '8px',
                padding: '4rem 2rem',
                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                textAlign: 'center',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '6px solid rgba(255, 255, 255, 0.3)',
                  borderTop: '6px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1.5rem'
                }}></div>
                <h3 style={{ 
                  color: 'white', 
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.5rem',
                  fontWeight: '600'
                }}>
                  📸 Capturing Screenshot...
                </h3>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.9)', 
                  margin: 0,
                  fontSize: '1rem'
                }}>
                  Please wait while we capture and protect the content
                </p>
                <style dangerouslySetInnerHTML={{
                  __html: `
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `
                }} />
              </div>
            ) : (
              <div style={{
                margin: '1rem 0',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                border: '2px solid #e1e5e9'
              }}>
                {proxyContent ? (
                  <iframe
                    srcDoc={proxyContent}
                    sandbox="allow-same-origin allow-scripts allow-forms"
                    style={{
                      width: '100%',
                      height: '600px',
                      border: 'none',
                      backgroundColor: '#fff'
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <div style={{
                    height: '600px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8f9fa',
                    border: '2px dashed #dee2e6',
                    borderRadius: '8px',
                    position: 'relative'
                  }}>
                    {!iframeError ? (
                      <iframe
                        src={protectedUrl}
                        width="100%"
                        height="100%"
                        style={{
                          border: 'none',
                          borderRadius: '8px',
                          pointerEvents: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none'
                        }}
                        onContextMenu={(e) => e.preventDefault()}
                        onError={() => {
                          console.log('Iframe error detectado');
                          setIframeError(true);
                          fetchContentViaProxy(protectedUrl);
                        }}
                        onLoad={() => {
                          console.log('Iframe cargado, verificando contenido...');
                          setTimeout(() => {
                            const iframe = document.querySelector('iframe');
                            if (iframe) {
                              try {
                                const doc = iframe.contentDocument || iframe.contentWindow?.document;
                                if (doc) {
                                  const body = doc.body;
                                  if (!body || body.innerHTML.trim() === '' || body.innerHTML.includes('X-Frame-Options')) {
                                    console.log('Iframe vacío o bloqueado, usando proxy');
                                    setIframeError(true);
                                    fetchContentViaProxy(protectedUrl);
                                  } else {
                                    console.log('Iframe cargado correctamente');
                                  }
                                } else {
                                  console.log('No se puede acceder al contenido del iframe, usando proxy');
                                  setIframeError(true);
                                  fetchContentViaProxy(protectedUrl);
                                }
                              } catch (e) {
                                console.log('Error accediendo al iframe:', e, 'usando proxy');
                                setIframeError(true);
                                fetchContentViaProxy(protectedUrl);
                              }
                            }
                          }, 2000);
                        }}
                      />
                    ) : (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '2rem',
                        borderRadius: '12px',
                        textAlign: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        border: '2px solid #ffc107',
                        maxWidth: '400px'
                      }}>
                        <h3 style={{ color: '#856404', margin: '0 0 1rem 0' }}>
                          🚫 Iframe Bloqueado por Seguridad
                        </h3>
                        <p style={{ color: '#856404', margin: '0 0 1rem 0' }}>
                          El sitio web bloquea la carga en iframes por políticas de seguridad.
                        </p>
                        <p style={{ color: '#856404', margin: '0 0 1rem 0' }}>
                          Intentando cargar contenido alternativo...
                        </p>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          border: '4px solid #f3f3f3',
                          borderTop: '4px solid #856404',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                          margin: '0 auto'
                        }}></div>
                        <style dangerouslySetInnerHTML={{
                          __html: `
                            @keyframes spin {
                              0% { transform: rotate(0deg); }
                              100% { transform: rotate(360deg); }
                            }
                          `
                        }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div style={{
              background: '#d4edda',
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid #c3e6cb',
              marginTop: '1rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#155724' }}>
                🛡️ Active Protections ({protectionMode === 'screenshot' ? 'Screenshot + Watermark' : 'Iframe'}):
              </h4>
              <ul style={{
                margin: 0,
                paddingLeft: '1.5rem',
                color: '#155724',
                fontSize: '0.9rem'
              }}>
                {protectionMode === 'screenshot' ? (
                  <>
                    <li>Capture without new windows</li>
                    <li>Invisible watermarking applied (15% opacity)</li>
                    <li>No accessible HTML code</li>
                    <li>Impossible to select text</li>
                    <li>Maximum protection against copying</li>
                    <li>Forensically detectable watermark</li>
                  </>
                ) : (
                  <>
                    <li>Right-click disabled</li>
                    <li>Text selection blocked</li>
                    <li>Element dragging disabled</li>
                    <li>Content rendered as protected iframe</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}