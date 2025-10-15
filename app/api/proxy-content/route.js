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
      .replace(/onclick="[^"]*"/gi, '')
      .replace(/oncontextmenu="[^"]*"/gi, '')
      .replace(/onselectstart="[^"]*"/gi, '')
      .replace(/ondragstart="[^"]*"/gi, '');

    // Ajustar URLs relativas a absolutas
    const baseUrl = parsedUrl.origin;
    cleanContent = cleanContent
      .replace(/href="\//g, `href="${baseUrl}/`)
      .replace(/src="\//g, `src="${baseUrl}/`)
      .replace(/href='\//g, `href='${baseUrl}/`)
      .replace(/src='\//g, `src='${baseUrl}/`);

    // Agregar base tag y script de protección
    const protectionScript = `
      <script>
        // Protecciones contra copia y descarga
        document.addEventListener('DOMContentLoaded', function() {
          // Deshabilitar clic derecho
          document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
          });
          
          // Deshabilitar selección de texto
          document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
          });
          
          // Deshabilitar arrastrar
          document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
          });
          
          // Deshabilitar atajos de teclado
          document.addEventListener('keydown', function(e) {
            // Ctrl+C, Ctrl+A, Ctrl+S, Ctrl+P, Ctrl+U
            if (e.ctrlKey && ['c', 'a', 's', 'p', 'u'].includes(e.key.toLowerCase())) {
              e.preventDefault();
              return false;
            }
            // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))) {
              e.preventDefault();
              return false;
            }
          });
          
          // Aplicar estilos de protección
          document.body.style.userSelect = 'none';
          document.body.style.webkitUserSelect = 'none';
          document.body.style.mozUserSelect = 'none';
          document.body.style.msUserSelect = 'none';
        });
      </script>
    `;
    
    cleanContent = cleanContent.replace(
      /<head>/i,
      `<head><base href="${baseUrl}/">${protectionScript}`
    );

    console.log('Proxy clean content length:', cleanContent.length);

    return Response.json({ 
      content: cleanContent,
      originalLength: content.length,
      cleanedLength: cleanContent.length,
      success: true
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
