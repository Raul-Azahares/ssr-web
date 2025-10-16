// API route para proxy de peticiones AJAX dinámicas
export async function POST(request) {
  try {
    const { url, method = 'GET', headers = {}, body } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'URL requerida' }, { status: 400 });
    }

    console.log('Proxy AJAX:', method, url);
    
    // Log si la URL contiene parámetros importantes
    if (url.includes('location=')) {
      const locationParam = url.match(/location=([^&]+)/);
      if (locationParam) {
        console.log('Proxy AJAX location param:', decodeURIComponent(locationParam[1]));
      }
    }

    // Extraer el origin de la URL para el Referer
    let referer = url;
    try {
      const parsedUrl = new URL(url);
      referer = parsedUrl.origin + parsedUrl.pathname;
    } catch (e) {}

    const fetchOptions = {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': referer,
        'Origin': new URL(url).origin,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        ...headers,
      },
      credentials: 'include',
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    console.log('Proxy AJAX response status:', response.status, 'for:', url);

    if (!response.ok) {
      console.log('Proxy AJAX response not ok:', response.status, response.statusText);
      return Response.json({ 
        error: `HTTP ${response.status}`,
        status: response.status 
      }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    console.log('Proxy AJAX content-type:', contentType);
    
    // Obtener el contenido como buffer para preservar todo
    const buffer = await response.arrayBuffer();
    console.log('Proxy AJAX returning buffer, size:', buffer.byteLength);
    
    // Si el buffer es muy pequeño (< 10 bytes), puede ser un error
    if (buffer.byteLength < 10) {
      const text = new TextDecoder().decode(buffer);
      console.log('Proxy AJAX WARNING: Small response, content:', text);
    }
    
    // Copiar headers relevantes de la respuesta original
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    
    // Copiar otros headers importantes (incluyendo cookies)
    ['cache-control', 'etag', 'last-modified', 'set-cookie'].forEach(header => {
      const value = response.headers.get(header);
      if (value) responseHeaders.set(header, value);
    });
    
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });

  } catch (error) {
    console.error('Error en proxy AJAX:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
}

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    }
  });
}
