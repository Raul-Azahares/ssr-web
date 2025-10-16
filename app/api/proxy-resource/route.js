// API route para proxy de recursos (CSS, JS, imágenes)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return new Response('URL requerida', { status: 400 });
    }

    console.log('Proxy resource intentando obtener:', url);

    // Validar y normalizar URL (manejar protocol-relative URLs)
    let normalizedUrl = url;
    if (url.startsWith('//')) {
      normalizedUrl = 'https:' + url;
      console.log('Normalized protocol-relative URL to:', normalizedUrl);
    }
    
    const parsedUrl = new URL(normalizedUrl);

    // Fetch del recurso con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Referer': parsedUrl.origin,
      },
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    console.log('Proxy resource response status:', response.status, 'for:', normalizedUrl);

    if (!response.ok) {
      console.log('Proxy resource response not ok:', response.status, response.statusText);
      return new Response(`Error HTTP: ${response.status}`, { status: response.status });
    }

    // Obtener el content-type del recurso original
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Para CSS, necesitamos procesar las URLs dentro del CSS
    if (contentType.includes('text/css') || normalizedUrl.endsWith('.css')) {
      let cssContent = await response.text();
      
      // Convertir URLs relativas en el CSS a absolutas y luego a través del proxy
      const baseUrl = parsedUrl.origin;
      const protocol = parsedUrl.protocol;
      const basePath = parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/'));
      
      // Función helper para convertir URLs en CSS
      function makeAbsoluteCssUrl(resourceUrl) {
        if (!resourceUrl) return resourceUrl;
        
        // Ya es absoluta
        if (resourceUrl.startsWith('http://') || resourceUrl.startsWith('https://')) {
          return resourceUrl;
        }
        
        // Protocol-relative URL
        if (resourceUrl.startsWith('//')) {
          return protocol + resourceUrl;
        }
        
        // Absolute path
        if (resourceUrl.startsWith('/')) {
          return baseUrl + resourceUrl;
        }
        
        // Relative path
        return baseUrl + basePath + '/' + resourceUrl;
      }
      
      // Procesar url() en CSS
      cssContent = cssContent.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match, resourceUrl) => {
        const absoluteUrl = makeAbsoluteCssUrl(resourceUrl.trim());
        return `url("/api/proxy-resource?url=${encodeURIComponent(absoluteUrl)}")`;
      });
      
      // Procesar @import en CSS
      cssContent = cssContent.replace(/@import\s+(['"]?)([^'";\s]+)\1/gi, (match, quote, importUrl) => {
        const absoluteUrl = makeAbsoluteCssUrl(importUrl.trim());
        return `@import url("/api/proxy-resource?url=${encodeURIComponent(absoluteUrl)}")`;
      });
      
      return new Response(cssContent, {
        headers: {
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

    // Para otros recursos (JS, imágenes), devolver tal cual
    const buffer = await response.arrayBuffer();
    
    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error('Error en proxy resource:', error);
    
    if (error.name === 'AbortError') {
      return new Response('Timeout al obtener recurso', { status: 408 });
    }
    
    return new Response(`Error al obtener recurso: ${error.message}`, { status: 500 });
  }
}
