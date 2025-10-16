# Arquitectura del Sistema de Proxy Inverso con Protección de Contenido

## 🎯 Objetivo del Proyecto

Crear una plataforma donde el usuario introduce una URL externa y se muestra el contenido dentro de un iframe protegido, sin que pueda:
- Ver el HTML original
- Hacer clic derecho
- Descargar la página
- Seleccionar texto
- Acceder a las herramientas de desarrollo

## 🏗️ Arquitectura del Sistema

### Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
│                    (Navegador Web)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. Introduce URL
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js)                          │
│  ┌────────────────┐         ┌──────────────────────┐       │
│  │  UrlInput.tsx  │────────▶│ ContentProtector.tsx │       │
│  └────────────────┘         └──────────┬───────────┘       │
└────────────────────────────────────────┼───────────────────┘
                                          │
                    2. Solicita contenido │
                                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (API Routes)                        │
│  ┌──────────────────┐  ┌─────────────────┐  ┌────────────┐│
│  │ proxy-content    │  │ proxy-resource  │  │ proxy-ajax ││
│  │ /api/proxy-      │  │ /api/proxy-     │  │ /api/proxy-││
│  │ content/route.js │  │ resource/route  │  │ ajax/route ││
│  └────────┬─────────┘  └────────┬────────┘  └─────┬──────┘│
└───────────┼────────────────────┼──────────────────┼────────┘
            │                    │                  │
            │ 3. Fetch HTML      │ 4. Fetch CSS/JS  │ 5. Fetch AJAX
            ▼                    ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SITIO WEB EXTERNO                         │
│              (Bubble.io, NTSprint, etc.)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Flujo de Trabajo Detallado

### 1. Carga Inicial de Contenido

```javascript
Usuario → UrlInput → ContentProtector → /api/proxy-content
                                              ↓
                                    Fetch URL externa
                                              ↓
                                    Procesar HTML:
                                    - Remover CSP headers
                                    - Convertir URLs relativas → absolutas
                                    - Reescribir recursos → proxy
                                    - Inyectar script de protección
                                              ↓
                                    Retornar HTML modificado
                                              ↓
                                    ContentProtector carga en iframe
                                    usando srcdoc
```

### 2. Carga de Recursos (CSS, JS, Imágenes)

```javascript
Iframe carga HTML → Encuentra <link href="..."> o <script src="...">
                                              ↓
                    URL reescrita: /api/proxy-resource?url=...
                                              ↓
                            /api/proxy-resource
                                              ↓
                            Fetch recurso externo
                                              ↓
                    Si es CSS: procesar url() y @import
                                              ↓
                            Retornar recurso
```

### 3. Peticiones AJAX Dinámicas

```javascript
JavaScript en iframe → fetch() o XMLHttpRequest
                                              ↓
                    Interceptor detecta petición
                                              ↓
                    Redirige a /api/proxy-ajax
                                              ↓
                            /api/proxy-ajax
                                              ↓
                    Fetch al servidor externo
                                              ↓
                    Retornar respuesta al iframe
```

## 🛡️ Sistema de Protección Avanzado

### Nivel 1: Protección en el Servidor (proxy-content)

```javascript
// Remover políticas de seguridad restrictivas
cleanContent = cleanContent
  .replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '<!-- CSP removed -->')
  .replace(/<meta[^>]*X-Frame-Options[^>]*>/gi, '<!-- X-Frame removed -->');

// Reescribir todos los recursos a través del proxy
href="https://example.com/style.css" → href="/api/proxy-resource?url=..."
src="https://example.com/script.js" → src="/api/proxy-resource?url=..."
```

### Nivel 2: Interceptores JavaScript (Inyectados en el HTML)

#### 2.1 Location Spoofing
```javascript
// Engañar a la aplicación sobre su ubicación real
const fakeLocation = {
  href: ORIGINAL_URL,
  protocol: 'https:',
  host: 'example.com',
  // ... todas las propiedades
};

Object.defineProperty(window, 'location', {
  get: () => fakeLocation
});
```

#### 2.2 Fetch Interceptor
```javascript
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  // Resolver URLs relativas
  url = resolveUrl(url);
  
  // Redirigir a través del proxy
  if (url.startsWith('http')) {
    return originalFetch('/api/proxy-ajax', {
      method: 'POST',
      body: JSON.stringify({ url, method, headers, body })
    });
  }
};
```

#### 2.3 XMLHttpRequest Interceptor
```javascript
XMLHttpRequest.prototype.open = function(method, url, async) {
  const resolvedUrl = resolveUrl(url);
  
  if (shouldProxy(resolvedUrl)) {
    this._shouldProxy = true;
    return originalOpen.call(this, 'POST', '/api/proxy-ajax', async);
  }
};
```

#### 2.4 DOM Manipulation Interceptor
```javascript
Node.prototype.appendChild = function(child) {
  if (child.tagName === 'SCRIPT' && child.src) {
    child.src = '/api/proxy-resource?url=' + encodeURIComponent(child.src);
  }
  return originalAppendChild.apply(this, arguments);
};
```

### Nivel 3: Protección de Contenido (Cliente)

```javascript
// Deshabilitar clic derecho
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
}, true);

// Deshabilitar selección
document.addEventListener('selectstart', (e) => {
  e.preventDefault();
  return false;
}, true);

// CSS para prevenir selección
style.textContent = '* { user-select: none !important; }';
```

### Nivel 4: Sandbox del Iframe

```html
<iframe
  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
  referrerPolicy="no-referrer"
  srcdoc="..."
/>
```

## 🔍 Casos Especiales Manejados

### 1. Aplicaciones SPA (Single Page Applications)

**Problema**: Apps como Bubble.io hacen peticiones AJAX dinámicas después de cargar.

**Solución**: 
- Interceptores de fetch/XHR capturan todas las peticiones
- URL resolver convierte URLs relativas (incluyendo `about:srcdoc`)
- Proxy AJAX maneja las peticiones dinámicas

### 2. URLs Relativas y Protocol-Relative

```javascript
function resolveUrl(url) {
  if (url === 'about:srcdoc' || url === 'about:blank') {
    return ORIGINAL_URL;
  }
  
  if (url.startsWith('//')) {
    return 'https:' + url;
  }
  
  if (url.startsWith('/')) {
    return ORIGINAL_ORIGIN + url;
  }
  
  // Relative path
  return new URL(url, ORIGINAL_URL).href;
}
```

### 3. CSS con URLs Internas

```javascript
// Procesar url() en CSS
cssContent = cssContent.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, 
  (match, resourceUrl) => {
    const absoluteUrl = makeAbsoluteCssUrl(resourceUrl);
    return `url("/api/proxy-resource?url=${encodeURIComponent(absoluteUrl)}")`;
  }
);
```

### 4. Recursos Cargados Dinámicamente

```javascript
// Interceptar appendChild, insertBefore, replaceChild
const originalAppendChild = Node.prototype.appendChild;
Node.prototype.appendChild = function(child) {
  proxyElement(child); // Reescribe URLs antes de insertar
  return originalAppendChild.apply(this, arguments);
};
```

## ⚠️ Advertencias de Seguridad

### Limitaciones del Sistema

1. **No es 100% infalible**: Un usuario técnico avanzado puede:
   - Usar herramientas de captura de red (Wireshark)
   - Inspeccionar el tráfico del navegador
   - Hacer screenshots de pantalla
   - Usar OCR para extraer texto

2. **CORS y Same-Origin Policy**: 
   - El proxy debe manejar correctamente los headers CORS
   - Algunos sitios pueden detectar que están siendo proxeados

3. **Rendimiento**:
   - Cada recurso pasa por el proxy (overhead adicional)
   - Sitios con muchos recursos pueden ser lentos

4. **Sitios con Anti-Bot**:
   - Cloudflare, reCAPTCHA pueden bloquear el proxy
   - Algunos sitios detectan User-Agent del servidor

### Mejores Prácticas

1. **Usar HTTPS**: Siempre servir tu aplicación sobre HTTPS
2. **Rate Limiting**: Implementar límites de peticiones por IP
3. **Caché**: Cachear recursos estáticos para mejorar rendimiento
4. **Timeout**: Establecer timeouts para evitar peticiones colgadas
5. **Validación**: Validar URLs antes de hacer proxy
6. **Logs**: Mantener logs de peticiones para debugging

## 🚀 Casos de Uso

### ✅ Funciona Bien Con:
- Sitios estáticos (HTML/CSS/JS básico)
- Aplicaciones web modernas (React, Vue, Angular)
- Plataformas no-code (Bubble.io, Webflow)
- Sitios de contenido (blogs, portafolios)

### ⚠️ Puede Tener Problemas Con:
- Sitios con protección anti-bot agresiva
- Aplicaciones con WebSockets (requiere proxy adicional)
- Sitios con autenticación compleja
- Contenido con DRM (videos protegidos)

## 📊 Monitoreo y Debugging

### Logs Importantes

```javascript
console.log('[Proxy] Initializing...');
console.log('[Proxy] Fetch intercepted:', url);
console.log('[Proxy] XHR intercepted:', method, url);
console.log('[Proxy] Dynamic CSS:', href);
console.log('[Protection] Content protections applied');
```

### Verificar en Consola del Navegador

1. Abrir DevTools en la página principal (no en el iframe)
2. Ver mensajes `[Proxy]` para verificar interceptores
3. Ver mensajes `[Protection]` para verificar protecciones
4. Ver errores `[Proxy Error]` para debugging

## 🔄 Flujo de Actualización

Si necesitas actualizar el sistema:

1. **Modificar interceptores**: Editar `proxy-content/route.js`
2. **Cambiar protecciones**: Editar `ContentProtector.tsx`
3. **Ajustar proxy de recursos**: Editar `proxy-resource/route.js`
4. **Modificar proxy AJAX**: Editar `proxy-ajax/route.js`

## 📝 Ejemplo de Uso

```javascript
// Usuario introduce URL
const url = "https://finansify.bubbleapps.io/...";

// Sistema procesa:
1. Fetch HTML desde URL externa
2. Modificar HTML (remover CSP, reescribir URLs)
3. Inyectar script de protección
4. Cargar en iframe con srcdoc
5. Interceptar todas las peticiones subsecuentes
6. Aplicar protecciones de contenido
```

## 🎓 Conceptos Clave

- **Proxy Inverso**: Servidor intermediario que obtiene recursos de otro servidor
- **URL Rewriting**: Modificar URLs para que pasen por el proxy
- **Interceptor**: Código que captura y modifica peticiones/respuestas
- **Location Spoofing**: Engañar a la aplicación sobre su ubicación real
- **Sandbox**: Restricciones de seguridad en iframes
- **srcdoc**: Atributo de iframe para contenido inline

## 🔗 Referencias

- [MDN: iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
- [MDN: Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN: XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
