# Solución de Problemas Comunes

## 🐛 Problema: Página en Blanco con Bubble.io

### Síntomas
- La consola muestra que los recursos se cargan (status 200)
- Pero la página se ve en blanco
- Aparece `location=about:srcdoc` en las peticiones AJAX

### Causa Raíz
Bubble.io hace peticiones AJAX dinámicas usando `window.location` como base, pero cuando está en un iframe con `srcdoc`, el location es `about:srcdoc` en lugar de la URL original.

### Solución Implementada ✅

1. **Location Spoofing Completo**: Sobrescribimos `window.location` con un objeto falso que devuelve la URL original
2. **URL Resolver**: Función que convierte `about:srcdoc` → URL original
3. **Interceptores Mejorados**: Capturan fetch/XHR y resuelven URLs antes de hacer proxy

## 🔧 Mejoras Implementadas

### 1. Sistema de Interceptación Avanzado

**Antes:**
```javascript
// Solo interceptaba URLs absolutas
if (url.startsWith('http://') || url.startsWith('https://')) {
  // proxy
}
```

**Ahora:**
```javascript
// Resuelve URLs relativas primero
function resolveUrl(url) {
  if (url === 'about:srcdoc' || url === 'about:blank') {
    return ORIGINAL_URL;
  }
  // ... más lógica de resolución
}

// Luego intercepta
url = resolveUrl(url);
if (url.startsWith('http')) {
  // proxy
}
```

### 2. XMLHttpRequest Mejorado

**Antes:**
```javascript
// Interceptaba en send(), causaba problemas
XMLHttpRequest.prototype.send = function(body) {
  if (this._shouldProxy) {
    // hacer proxy
  }
};
```

**Ahora:**
```javascript
// Intercepta en open() y redirige la conexión
XMLHttpRequest.prototype.open = function(method, url, async) {
  const resolvedUrl = resolveUrl(url);
  
  if (shouldProxy(resolvedUrl)) {
    this._shouldProxy = true;
    // Abrir conexión al proxy en lugar del destino
    return originalOpen.call(this, 'POST', '/api/proxy-ajax', async);
  }
};
```

### 3. Uso de srcdoc en lugar de Blob URLs

**Antes:**
```javascript
const blob = new Blob([html], { type: 'text/html' });
const blobUrl = URL.createObjectURL(blob);
iframe.src = blobUrl;
```

**Ahora:**
```javascript
// srcdoc mantiene el contexto correcto
iframe.srcdoc = html;
```

## 📋 Checklist de Debugging

Si una URL no funciona, verifica:

### 1. Consola del Navegador
```
✅ [Proxy] Initializing advanced proxy system...
✅ [Proxy] Location spoofing configured for: https://...
✅ [Proxy] Fetch intercepted: https://...
✅ [Proxy] XHR intercepted: GET https://...
✅ [Protection] Content protections applied
```

### 2. Network Tab
```
✅ POST /api/proxy-content (200 OK)
✅ GET /api/proxy-resource?url=... (200 OK)
✅ POST /api/proxy-ajax (200 OK)
```

### 3. Errores Comunes

#### Error: "Failed to fetch"
**Causa**: El sitio externo bloquea el User-Agent del servidor
**Solución**: Modificar User-Agent en `proxy-content/route.js`

```javascript
headers: {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  // Agregar más headers si es necesario
}
```

#### Error: "CORS policy"
**Causa**: Falta header CORS en la respuesta del proxy
**Solución**: Ya implementado en todos los proxies

```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}
```

#### Error: "CSP violation"
**Causa**: Content Security Policy del sitio original
**Solución**: Ya removido en `proxy-content`

```javascript
cleanContent = cleanContent
  .replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '<!-- CSP removed -->');
```

## 🎯 Casos de Prueba

### Test 1: Sitio Estático Simple
```
URL: https://example.com
Esperado: ✅ Carga completa, protecciones activas
```

### Test 2: Aplicación SPA (Bubble.io)
```
URL: https://finansify.bubbleapps.io/public_content/...
Esperado: ✅ Carga completa, AJAX interceptado, contenido dinámico funciona
```

### Test 3: Sitio con Recursos Externos
```
URL: https://ntsprint.com
Esperado: ✅ CSS/JS/imágenes cargados a través del proxy
```

## 🔍 Debugging Avanzado

### Ver Peticiones Interceptadas

Abre la consola del navegador y ejecuta:

```javascript
// En el contexto del iframe
const iframe = document.querySelector('iframe');
const iframeWindow = iframe.contentWindow;

// Ver si los interceptores están activos
console.log('Fetch original:', iframeWindow.fetch.toString().includes('originalFetch'));
console.log('XHR modificado:', iframeWindow.XMLHttpRequest.prototype.open.toString().includes('resolveUrl'));
```

### Verificar Location Spoofing

```javascript
// En el contexto del iframe
const iframe = document.querySelector('iframe');
const iframeWindow = iframe.contentWindow;

console.log('Location href:', iframeWindow.location.href);
// Debería mostrar la URL original, no about:srcdoc
```

### Monitorear Peticiones en Tiempo Real

```javascript
// Agregar al script de protección
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('[FETCH]', args[0]);
  return originalFetch.apply(this, args);
};
```

## 🚀 Optimizaciones Futuras

### 1. Caché de Recursos
```javascript
// En proxy-resource/route.js
const cache = new Map();

export async function GET(request) {
  const url = searchParams.get('url');
  
  if (cache.has(url)) {
    return cache.get(url);
  }
  
  const response = await fetch(url);
  cache.set(url, response);
  return response;
}
```

### 2. Service Worker para Offline
```javascript
// Interceptar peticiones en el cliente
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/proxy-')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});
```

### 3. WebSocket Proxy
```javascript
// Para sitios con WebSockets
const WebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  const proxyUrl = '/api/proxy-ws?url=' + encodeURIComponent(url);
  return new WebSocket(proxyUrl, protocols);
};
```

## 📊 Métricas de Rendimiento

### Tiempos Esperados

- **Carga inicial**: 2-5 segundos
- **Recursos CSS/JS**: 100-500ms cada uno
- **Peticiones AJAX**: 200-1000ms

### Si es más lento:

1. **Verificar timeout**: Aumentar en `proxy-content/route.js`
```javascript
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
```

2. **Implementar caché**: Ver optimizaciones arriba

3. **Reducir logging**: Comentar `console.log()` en producción

## 🛡️ Seguridad Adicional

### Rate Limiting (Recomendado para Producción)

```javascript
// middleware.js
const rateLimiter = new Map();

export function middleware(request) {
  const ip = request.ip;
  const now = Date.now();
  
  if (!rateLimiter.has(ip)) {
    rateLimiter.set(ip, []);
  }
  
  const requests = rateLimiter.get(ip);
  const recentRequests = requests.filter(time => now - time < 60000);
  
  if (recentRequests.length > 100) {
    return new Response('Too many requests', { status: 429 });
  }
  
  recentRequests.push(now);
  rateLimiter.set(ip, recentRequests);
}
```

### Validación de URLs

```javascript
// En proxy-content/route.js
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    
    // Bloquear URLs locales
    if (parsed.hostname === 'localhost' || 
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.endsWith('.local')) {
      return false;
    }
    
    // Solo permitir http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
```

## 📝 Notas Finales

### Lo que FUNCIONA ✅
- Sitios estáticos y dinámicos
- Aplicaciones SPA (React, Vue, Angular, Bubble.io)
- Peticiones AJAX/Fetch
- Recursos externos (CSS, JS, imágenes)
- Protección de contenido (clic derecho, selección)

### Lo que NO FUNCIONA ❌
- WebSockets (requiere proxy adicional)
- Sitios con Cloudflare Challenge
- Contenido con DRM
- Autenticación con cookies complejas
- Sitios que detectan iframe embedding

### Alternativas si no Funciona

1. **Usar Puppeteer**: Capturar screenshot real del sitio
2. **Proxy más robusto**: Usar nginx como proxy inverso
3. **Servicio externo**: Usar servicios como ScrapingBee o Browserless
