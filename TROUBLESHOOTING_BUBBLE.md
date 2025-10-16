# Troubleshooting: Bubble.io - Página en Blanco Después de Loading

## 🐛 Problema Específico

**Síntoma**: 
- La página de Bubble.io carga inicialmente
- Muestra un loading spinner
- Luego se queda en blanco

**Logs Observados**:
```
Proxy AJAX: GET https://finansify.bubbleapps.io/api/1.1/init/data?location=about%3Asrcdoc
Proxy AJAX response status: 200
Proxy AJAX returning buffer, size: 2
```

## 🔍 Análisis del Problema

### Causa Raíz #1: Parámetro `location=about:srcdoc`

Bubble.io hace una petición AJAX para obtener datos de inicialización:
```
GET /api/1.1/init/data?location=about:srcdoc
```

El problema es que `about:srcdoc` no es una URL válida para Bubble.io, por lo que el servidor devuelve una respuesta vacía (`{}` = 2 bytes).

### Causa Raíz #2: Falta de Cookies de Sesión

Bubble.io puede requerir cookies de sesión para devolver datos. La petición inicial del HTML recibe:
```
set-cookie: __cf_bm=...
```

Pero las peticiones AJAX subsecuentes no están enviando estas cookies.

## ✅ Soluciones Implementadas

### Solución #1: Reescritura de Parámetro `location`

**Ubicación**: `app/api/proxy-content/route.js` (líneas 301-306 y 351-356)

```javascript
// En Fetch Interceptor
if (url.includes('location=about%3Asrcdoc') || url.includes('location=about:srcdoc')) {
  url = url.replace(/location=about%3Asrcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
  url = url.replace(/location=about:srcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
  console.log('[Proxy] Rewritten location param in URL:', url);
}

// En XHR Interceptor
if (resolvedUrl.includes('location=about%3Asrcdoc') || resolvedUrl.includes('location=about:srcdoc')) {
  resolvedUrl = resolvedUrl.replace(/location=about%3Asrcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
  resolvedUrl = resolvedUrl.replace(/location=about:srcdoc/g, 'location=' + encodeURIComponent(ORIGINAL_URL));
  console.log('[Proxy] Rewritten location param in XHR:', resolvedUrl);
}
```

**Resultado Esperado**:
```
Antes: GET /api/1.1/init/data?location=about:srcdoc
Ahora:  GET /api/1.1/init/data?location=https://finansify.bubbleapps.io/...
```

### Solución #2: Manejo de Cookies

**Ubicación**: `app/api/proxy-ajax/route.js` (línea 30)

```javascript
const fetchOptions = {
  method,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...headers,
  },
  credentials: 'include', // ← Importante para cookies
};
```

**Y copiar cookies en la respuesta** (línea 70):
```javascript
['cache-control', 'etag', 'last-modified', 'set-cookie'].forEach(header => {
  const value = response.headers.get(header);
  if (value) responseHeaders.set(header, value);
});
```

### Solución #3: Logging Mejorado

**Ubicación**: `app/api/proxy-ajax/route.js` (líneas 12-18, 52-56)

```javascript
// Log del parámetro location
if (url.includes('location=')) {
  const locationParam = url.match(/location=([^&]+)/);
  if (locationParam) {
    console.log('Proxy AJAX location param:', decodeURIComponent(locationParam[1]));
  }
}

// Warning para respuestas pequeñas
if (buffer.byteLength < 10) {
  const text = new TextDecoder().decode(buffer);
  console.log('Proxy AJAX WARNING: Small response, content:', text);
}
```

## 🧪 Cómo Verificar la Solución

### 1. Reiniciar el Servidor
```bash
# Detener el servidor actual (Ctrl+C)
npm run dev
```

### 2. Abrir la Consola del Navegador

Buscar estos mensajes:
```
✅ [Proxy] Rewritten location param in URL: https://finansify.bubbleapps.io/api/1.1/init/data?location=https%3A%2F%2Ffinansify.bubbleapps.io%2F...
✅ Proxy AJAX location param: https://finansify.bubbleapps.io/...
✅ Proxy AJAX returning buffer, size: >100 (debería ser mayor que 2)
```

### 3. Verificar en Network Tab

**Petición al proxy**:
```
POST /api/proxy-ajax
Request Payload: {
  "url": "https://finansify.bubbleapps.io/api/1.1/init/data?location=https%3A%2F%2F...",
  "method": "GET"
}
```

**Respuesta esperada**:
```
Status: 200 OK
Content-Length: > 100 bytes (no solo 2)
```

## 🔄 Flujo Correcto Esperado

```
1. Usuario carga página
   ↓
2. HTML se carga en iframe con srcdoc
   ↓
3. Bubble.io ejecuta scripts
   ↓
4. Script hace petición: GET /api/1.1/init/data?location=about:srcdoc
   ↓
5. Interceptor detecta y reescribe:
   location=about:srcdoc → location=https://finansify.bubbleapps.io/...
   ↓
6. Proxy hace petición con URL correcta
   ↓
7. Bubble.io devuelve datos de inicialización (JSON con datos)
   ↓
8. Página se renderiza correctamente
```

## 🚨 Si Aún No Funciona

### Opción A: Verificar Referer Header

Bubble.io puede validar el Referer. Agregar en `proxy-ajax/route.js`:

```javascript
headers: {
  'User-Agent': '...',
  'Accept': '*/*',
  'Referer': url.split('?')[0], // ← Agregar esto
  ...headers,
}
```

### Opción B: Interceptar Antes de que Bubble.io Lea Location

Modificar el script de protección para sobrescribir `location` ANTES de que Bubble.io lo lea:

```javascript
// En proxy-content/route.js, ANTES del script de Bubble
Object.defineProperty(window, 'location', {
  get: function() { 
    return {
      href: ORIGINAL_URL,
      toString: function() { return ORIGINAL_URL; }
    };
  },
  configurable: false
});
```

### Opción C: Usar Base Tag

Agregar en el `<head>` del HTML:

```javascript
// En proxy-content/route.js
cleanContent = cleanContent.replace(
  /<head>/i,
  '<head><base href="' + url + '">'
);
```

### Opción D: Deshabilitar srcdoc y Usar Data URL

Si todo falla, cambiar en `ContentProtector.tsx`:

```javascript
// En lugar de:
iframe.srcdoc = data.content;

// Usar:
iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(data.content);
```

## 📊 Métricas de Éxito

**Antes de la solución**:
- ✅ HTML carga (27KB)
- ✅ CSS/JS cargan (todos 200 OK)
- ❌ AJAX init/data devuelve 2 bytes
- ❌ Página en blanco

**Después de la solución**:
- ✅ HTML carga (27KB)
- ✅ CSS/JS cargan (todos 200 OK)
- ✅ AJAX init/data devuelve >100 bytes con datos JSON
- ✅ Página se renderiza correctamente

## 🎯 Próximos Pasos

1. **Probar la solución** con la URL de Bubble.io
2. **Verificar logs** en consola del navegador y servidor
3. **Si funciona**: Documentar y cerrar issue
4. **Si no funciona**: Intentar Opciones A, B, C o D arriba

## 📝 Notas Adicionales

- Bubble.io es una plataforma no-code que genera aplicaciones web complejas
- Usa un sistema de inicialización que depende del parámetro `location`
- Puede tener validaciones adicionales de seguridad
- Si nada funciona, considerar usar Puppeteer para captura real de pantalla
