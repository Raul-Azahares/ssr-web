// API route para proxy de contenido
export async function POST(request) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'URL requerida' }, { status: 400 });
    }

    console.log('Proxy intentando obtener:', url);

    // Validar URL
    const parsedUrl = new URL(url);

    // Fetch del contenido con timeout extendido
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Cache-Control': 'no-cache',
        'Referer': parsedUrl.origin,
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    console.log('Proxy response status:', response.status);
    console.log('Proxy response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.log('Proxy response not ok:', response.status, response.statusText);
      return Response.json({ 
        error: `Error HTTP: ${response.status}`, 
        status: response.status 
      }, { status: 500 });
    }

    const content = await response.text();
    console.log('Proxy content length:', content.length);
    
    if (!content || content.trim().length === 0) {
      console.log('Proxy content is empty');
      return Response.json({ 
        error: 'Contenido vacío', 
        content: '' 
      }, { status: 200 });
    }
    
    // Mantener scripts pero agregar protecciones en el HTML
    let cleanContent = content
      // NO remover onclick ya que Bubble lo necesita
      .replace(/oncontextmenu="[^"]*"/gi, '')
      .replace(/onselectstart="[^"]*"/gi, '')
      .replace(/ondragstart="[^"]*"/gi, '');
    
    // Remover COMPLETAMENTE todos los CSP headers y políticas
    cleanContent = cleanContent
      .replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '<!-- CSP removed -->')
      .replace(/<meta[^>]*name=["']?csp-nonce["']?[^>]*>/gi, '<!-- CSP nonce removed -->')
      .replace(/<meta[^>]*http-equiv=["']?X-Content-Security-Policy["']?[^>]*>/gi, '<!-- X-CSP removed -->')
      .replace(/<meta[^>]*http-equiv=["']?X-WebKit-CSP["']?[^>]*>/gi, '<!-- WebKit-CSP removed -->');
    
    // NO agregar ningún CSP - dejar que el navegador use el default permisivo
    const permissiveCSP = '';

    // Ajustar URLs relativas a absolutas Y proxy todos los recursos
    const baseUrl = parsedUrl.origin;
    const protocol = parsedUrl.protocol;
    
    // Función helper para convertir URLs
    function makeAbsoluteUrl(urlString) {
      if (!urlString) return urlString;
      
      // Ya es absoluta
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        return urlString;
      }
      
      // Protocol-relative URL
      if (urlString.startsWith('//')) {
        return protocol + urlString;
      }
      
      // Absolute path
      if (urlString.startsWith('/')) {
        return baseUrl + urlString;
      }
      
      // Relative path (menos común en este contexto)
      return baseUrl + '/' + urlString;
    }
    
    // Convertir todas las URLs en atributos href y src
    cleanContent = cleanContent
      .replace(/(href|src)=["']([^"']+)["']/gi, (match, attr, url) => {
        const absoluteUrl = makeAbsoluteUrl(url);
        return `${attr}="${absoluteUrl}"`;
      })
      .replace(/url\(["']?([^"')]+)["']?\)/gi, (match, url) => {
        const absoluteUrl = makeAbsoluteUrl(url.trim());
        return `url("${absoluteUrl}")`;
      });
    
    // Ahora proxy todos los recursos CSS, JS, e imágenes a través de nuestro proxy
    // Esto evita problemas de CORS
    const proxyUrl = '/api/proxy-resource?url=';
    let cssCount = 0;
    let jsCount = 0;
    let imgCount = 0;
    
    // Proxy CSS files (comillas dobles)
    cleanContent = cleanContent
      .replace(/href="([^"]+\.css[^"]*)"/gi, (match, cssUrl) => {
        if (cssUrl.startsWith('http')) {
          cssCount++;
          console.log(`Proxying CSS #${cssCount}:`, cssUrl);
          return `href="${proxyUrl}${encodeURIComponent(cssUrl)}"`;
        }
        return match;
      });
    
    // Proxy CSS files (comillas simples)
    cleanContent = cleanContent
      .replace(/href='([^']+\.css[^']*)'/gi, (match, cssUrl) => {
        if (cssUrl.startsWith('http')) {
          cssCount++;
          console.log(`Proxying CSS #${cssCount}:`, cssUrl);
          return `href="${proxyUrl}${encodeURIComponent(cssUrl)}"`;
        }
        return match;
      });
    
    // Proxy JS files (comillas dobles)
    cleanContent = cleanContent
      .replace(/src="([^"]+\.js[^"]*)"/gi, (match, jsUrl) => {
        if (jsUrl.startsWith('http')) {
          jsCount++;
          console.log(`Proxying JS #${jsCount}:`, jsUrl);
          return `src="${proxyUrl}${encodeURIComponent(jsUrl)}"`;
        }
        return match;
      });
    
    // Proxy JS files (comillas simples)
    cleanContent = cleanContent
      .replace(/src='([^']+\.js[^']*)'/gi, (match, jsUrl) => {
        if (jsUrl.startsWith('http')) {
          jsCount++;
          console.log(`Proxying JS #${jsCount}:`, jsUrl);
          return `src="${proxyUrl}${encodeURIComponent(jsUrl)}"`;
        }
        return match;
      });
    
    // Proxy image files (comillas dobles)
    cleanContent = cleanContent
      .replace(/src="([^"]+\.(jpg|jpeg|png|gif|svg|webp|ico)[^"]*)"/gi, (match, imgUrl) => {
        if (imgUrl.startsWith('http')) {
          imgCount++;
          console.log(`Proxying IMG #${imgCount}:`, imgUrl);
          return `src="${proxyUrl}${encodeURIComponent(imgUrl)}"`;
        }
        return match;
      });
    
    // Proxy image files (comillas simples)
    cleanContent = cleanContent
      .replace(/src='([^']+\.(jpg|jpeg|png|gif|svg|webp|ico)[^']*)'/gi, (match, imgUrl) => {
        if (imgUrl.startsWith('http')) {
          imgCount++;
          console.log(`Proxying IMG #${imgCount}:`, imgUrl);
          return `src="${proxyUrl}${encodeURIComponent(imgUrl)}"`;
        }
        return match;
      });
    
    console.log(`Total resources to proxy: CSS=${cssCount}, JS=${jsCount}, IMG=${imgCount}`);

    // Agregar script de interceptación de peticiones y protección
    const protectionScript = `
      <script>
        (function() {
          console.log('[Proxy] Initializing advanced proxy system...');
          
          const ORIGINAL_URL = '${url}';
          const ORIGINAL_ORIGIN = '${baseUrl}';
          
          // ============================================
          // 0. PREVENIR DETECCIÓN DE IFRAME (MUY IMPORTANTE)
          // ============================================
          // Esto debe ejecutarse ANTES que cualquier otro código
          try {
            // Hacer que window.top y window.parent apunten a window
            // Esto engaña a scripts que verifican si están en iframe
            Object.defineProperty(window, 'top', {
              get: function() { return window; },
              set: function() {},
              configurable: false
            });
            
            Object.defineProperty(window, 'parent', {
              get: function() { return window; },
              set: function() {},
              configurable: false
            });
            
            Object.defineProperty(window, 'frameElement', {
              get: function() { return null; },
              set: function() {},
              configurable: false
            });
            
            // También prevenir window.self !== window.top
            Object.defineProperty(window, 'self', {
              get: function() { return window; },
              set: function() {},
              configurable: false
            });
            
            console.log('[Proxy] Iframe detection prevention active');
          } catch (e) {
            console.error('[Proxy] Error setting iframe prevention:', e);
          }
          
          // ============================================
          // 1. NO HACER LOCATION SPOOFING - Causa errores en Bubble.io
          // ============================================
          // Bubble.io necesita acceso real a window.location.pathname
          console.log('[Proxy] Skipping location spoofing to avoid errors');
          
          // ============================================
          // 2. URL RESOLVER - Convierte URLs relativas a absolutas
          // ============================================
          function resolveUrl(url) {
            if (!url || url === 'about:srcdoc' || url === 'about:blank') {
              return ORIGINAL_URL;
            }
            
            // Data URLs no se resuelven
            if (url.startsWith('data:')) {
              return url;
            }
            
            // Ya es absoluta
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return url;
            }
            
            // Protocol-relative
            if (url.startsWith('//')) {
              return 'https:' + url;
            }
            
            // Absolute path
            if (url.startsWith('/')) {
              return ORIGINAL_ORIGIN + url;
            }
            
            // Relative path
            try {
              const base = new URL(ORIGINAL_URL);
              return new URL(url, base.href).href;
            } catch (e) {
              console.error('[Proxy] Error resolving URL:', url, e);
              return url;
            }
          }
          
          // ============================================
          // 3. FETCH INTERCEPTOR MEJORADO
          // ============================================
          const originalFetch = window.fetch;
          window.fetch = function(resource, options = {}) {
            let url = typeof resource === 'string' ? resource : (resource.url || resource.toString());
            
            // Resolver URL relativa
            url = resolveUrl(url);
            
            // INTERCEPTAR peticiones a /api/1.1/init/data y devolver datos falsos
            if (url.includes('/api/1.1/init') || url.includes('/init/data')) {
              console.log('[Proxy] Intercepting init request - returning fake data to prevent error message');
              // Devolver datos falsos que hagan que Bubble piense que cargó correctamente
              return Promise.resolve(new Response(JSON.stringify({
                response: {
                  results: [],
                  count: 0,
                  remaining: 0
                },
                status: "success"
              }), {
                status: 200,
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                }
              }));
            }
            
            // Reemplazar location=about:srcdoc con la URL original en query params
            if (url.includes('location=about%3Asrcdoc') || url.includes('location=about:srcdoc')) {
              url = url.replace(/location=about%3Asrcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
              url = url.replace(/location=about:srcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
              console.log('[Proxy] Rewritten location param in URL:', url);
            }
            
            // No proxy si ya es una petición al proxy, localhost, o data URLs
            if (url.startsWith('/api/proxy') || 
                url.includes('localhost') || 
                url.includes('127.0.0.1') ||
                url.startsWith('blob:') ||
                url.startsWith('data:')) {
              return originalFetch.apply(this, arguments);
            }
            
            // Proxy TODAS las URLs externas (incluyendo las del dominio de Bubble.io)
            if (url.startsWith('http://') || url.startsWith('https://')) {
              console.log('[Proxy] Fetch intercepted:', url.substring(0, 100));
              
              // Obtener cookies del documento
              const cookies = document.cookie;
              
              // Preparar headers con cookies
              const proxyHeaders = options.headers || {};
              if (cookies) {
                proxyHeaders['Cookie'] = cookies;
              }
              
              return originalFetch('/api/proxy-ajax', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  url: url,
                  method: options.method || 'GET',
                  headers: proxyHeaders,
                  body: options.body
                })
              });
            }
            
            // Fallback
            return originalFetch.apply(this, arguments);
          };
          
          // ============================================
          // 4. XMLHttpRequest INTERCEPTOR MEJORADO
          // ============================================
          const OriginalXHR = XMLHttpRequest;
          const originalXHROpen = OriginalXHR.prototype.open;
          const originalXHRSend = OriginalXHR.prototype.send;
          const originalXHRSetRequestHeader = OriginalXHR.prototype.setRequestHeader;
          
          OriginalXHR.prototype.open = function(method, url, async, user, password) {
            // Resolver URL
            let resolvedUrl = resolveUrl(url);
            
            // INTERCEPTAR peticiones a /api/1.1/init/data
            if (resolvedUrl.includes('/api/1.1/init') || resolvedUrl.includes('/init/data')) {
              console.log('[Proxy] Intercepting XHR init request - will return fake data');
              this._fakeInit = true;
              this._blockUrl = resolvedUrl;
              // Continuar pero marcar para devolver datos falsos
              return originalXHROpen.call(this, method, 'data:application/json,' + encodeURIComponent(JSON.stringify({
                response: {
                  results: [],
                  count: 0,
                  remaining: 0
                },
                status: "success"
              })), async, user, password);
            }
            
            // Reemplazar location=about:srcdoc con la URL original en query params
            if (resolvedUrl.includes('location=about%3Asrcdoc') || resolvedUrl.includes('location=about:srcdoc')) {
              resolvedUrl = resolvedUrl.replace(/location=about%3Asrcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
              resolvedUrl = resolvedUrl.replace(/location=about:srcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
              console.log('[Proxy] Rewritten location param in XHR:', resolvedUrl);
            }
            
            this._proxyData = {
              method: method,
              url: resolvedUrl,
              async: async !== false,
              headers: {}
            };
            
            // Determinar si debe usar proxy
            const shouldProxy = (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) &&
                               !resolvedUrl.includes('/api/proxy') &&
                               !resolvedUrl.includes('localhost') &&
                               !resolvedUrl.includes('127.0.0.1');
            
            if (shouldProxy) {
              console.log('[Proxy] XHR intercepted:', method, resolvedUrl);
              this._shouldProxy = true;
              // Abrir conexión al proxy en lugar del destino original
              return originalXHROpen.call(this, 'POST', '/api/proxy-ajax', async, user, password);
            }
            
            return originalXHROpen.call(this, method, url, async, user, password);
          };
          
          OriginalXHR.prototype.setRequestHeader = function(header, value) {
            if (this._proxyData) {
              this._proxyData.headers[header] = value;
            }
            return originalXHRSetRequestHeader.apply(this, arguments);
          };
          
          OriginalXHR.prototype.send = function(body) {
            // Si es una petición fake init, dejar que continúe con los datos falsos
            if (this._fakeInit) {
              console.log('[Proxy] XHR sending fake init data');
              return originalXHRSend.call(this);
            }
            
            if (this._shouldProxy && this._proxyData) {
              // Obtener cookies del documento
              const cookies = document.cookie;
              if (cookies) {
                this._proxyData.headers['Cookie'] = cookies;
              }
              
              // Enviar a través del proxy
              const proxyBody = JSON.stringify({
                url: this._proxyData.url,
                method: this._proxyData.method,
                headers: this._proxyData.headers,
                body: body
              });
              
              // Establecer header para el proxy
              originalXHRSetRequestHeader.call(this, 'Content-Type', 'application/json');
              
              return originalXHRSend.call(this, proxyBody);
            }
            
            return originalXHRSend.apply(this, arguments);
          };
          
          // ============================================
          // 5. DOM MANIPULATION INTERCEPTOR
          // ============================================
          const originalAppendChild = Node.prototype.appendChild;
          const originalInsertBefore = Node.prototype.insertBefore;
          const originalReplaceChild = Node.prototype.replaceChild;
          
          function proxyElement(element) {
            if (!element || !element.tagName) return;
            
            const tag = element.tagName.toLowerCase();
            
            if (tag === 'link' && element.rel === 'stylesheet' && element.href) {
              const href = resolveUrl(element.href);
              if (href.startsWith('http') && !href.includes('/api/proxy-resource')) {
                console.log('[Proxy] Dynamic CSS:', href);
                element.href = '/api/proxy-resource?url=' + encodeURIComponent(href);
              }
            } else if (tag === 'script' && element.src) {
              const src = resolveUrl(element.src);
              if (src.startsWith('http') && !src.includes('/api/proxy-resource')) {
                console.log('[Proxy] Dynamic JS:', src);
                element.src = '/api/proxy-resource?url=' + encodeURIComponent(src);
              }
            } else if (tag === 'img' && element.src) {
              const src = resolveUrl(element.src);
              if (src.startsWith('http') && !src.includes('/api/proxy-resource')) {
                element.src = '/api/proxy-resource?url=' + encodeURIComponent(src);
              }
            }
          }
          
          Node.prototype.appendChild = function(child) {
            proxyElement(child);
            return originalAppendChild.apply(this, arguments);
          };
          
          Node.prototype.insertBefore = function(newNode, referenceNode) {
            proxyElement(newNode);
            return originalInsertBefore.apply(this, arguments);
          };
          
          Node.prototype.replaceChild = function(newChild, oldChild) {
            proxyElement(newChild);
            return originalReplaceChild.apply(this, arguments);
          };
          
          // ============================================
          // 6. PROTECCIONES DE CONTENIDO
          // ============================================
          function applyProtections() {
            // Deshabilitar clic derecho
            document.addEventListener('contextmenu', function(e) {
              e.preventDefault();
              e.stopPropagation();
              return false;
            }, true);
            
            // Deshabilitar selección
            document.addEventListener('selectstart', function(e) {
              e.preventDefault();
              return false;
            }, true);
            
            // Aplicar estilos de protección
            const style = document.createElement('style');
            style.textContent = '* { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; }';
            document.head.appendChild(style);
            
            console.log('[Protection] Content protections applied');
          }
          
          // Aplicar protecciones cuando el DOM esté listo
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', applyProtections);
          } else {
            applyProtections();
          }
          
          // También aplicar en load
          window.addEventListener('load', function() {
            setTimeout(applyProtections, 1000);
          });
          
          // ============================================
          // 7. ERROR HANDLING
          // ============================================
          window.addEventListener('error', function(e) {
            console.error('[Proxy Error]', e.message, e.filename, e.lineno);
          }, true);
          
          window.addEventListener('unhandledrejection', function(e) {
            console.error('[Proxy Unhandled Rejection]', e.reason);
          });
          
          console.log('[Proxy] Advanced proxy system initialized successfully');
        })();
      </script>
    `;
    
    // Agregar meta tags y base tag para asegurar compatibilidad
    const metaTags = `
      <base href="${url}">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
    `;
    
    cleanContent = cleanContent.replace(
      /<head>/i,
      `<head>${permissiveCSP}${metaTags}${protectionScript}`
    );

    console.log('Proxy clean content length:', cleanContent.length);

    return Response.json({ 
      content: cleanContent,
      originalLength: content.length,
      cleanedLength: cleanContent.length,
      success: true
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    });

  } catch (error) {
    console.error('Error en proxy:', error);
    
    if (error.name === 'AbortError') {
      return Response.json({ 
        error: 'Timeout al obtener contenido' 
      }, { status: 408 });
    }
    
    return Response.json({ 
      error: `Error al obtener contenido: ${error.message}` 
    }, { status: 500 });
  }
}
