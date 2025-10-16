# Deploy de Playwright en Vercel

## ✅ Configuración Completada

El proyecto ya está configurado para funcionar en Vercel con Playwright. Los cambios realizados son:

### 1. **vercel.json** - Configuración de recursos
```json
{
  "functions": {
    "app/api/screenshot-playwright/route.js": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

### 2. **next.config.js** - Webpack y externals
- Configurado para excluir módulos opcionales
- `playwright-core` como paquete externo
- `@sparticuz/chromium` optimizado para serverless

### 3. **route.js** - Detección automática de entorno
- **Desarrollo**: Usa Chromium local instalado
- **Producción**: Usa `@sparticuz/chromium` optimizado

## 🚀 Pasos para Deploy

### 1. Commit y Push
```bash
git add .
git commit -m "Add Playwright screenshot support for Vercel"
git push origin main
```

### 2. Deploy en Vercel
```bash
vercel --prod
```

O desde el dashboard de Vercel:
1. Conectar repositorio
2. Deploy automático

### 3. Verificar en Vercel
Una vez deployado, prueba la API:
```bash
curl -X POST https://tu-app.vercel.app/api/screenshot-playwright \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## ⚙️ Configuración de Vercel (Opcional)

Si necesitas más recursos, actualiza en el dashboard:

1. **Settings** → **Functions**
2. Ajustar:
   - Memory: 3008 MB (máximo en Pro)
   - Timeout: 60s (máximo en Pro)

## 📊 Rendimiento Esperado

### Primera Ejecución (Cold Start)
- **Tiempo**: 5-10 segundos
- **Razón**: Descarga de Chromium (~50MB)

### Ejecuciones Siguientes (Warm)
- **Tiempo**: 2-5 segundos
- **Razón**: Chromium en cache

### Límites
- **Timeout**: 60 segundos máximo
- **Memoria**: 3GB máximo
- **Tamaño función**: ~50MB (Chromium optimizado)

## ✅ URLs que funcionarán bien

- ✅ Sitios estáticos (HTML/CSS simple)
- ✅ Sitios con JavaScript moderado
- ✅ Páginas de carga rápida (< 5s)
- ⚠️ SPAs complejas (React, Vue) - pueden tardar
- ❌ Sitios con anti-bot agresivo
- ❌ Páginas que tardan > 30s en cargar

## 🐛 Troubleshooting

### Error: "Function execution timed out"
**Solución**: La página tarda demasiado en cargar
- Reducir `waitUntil` de `networkidle` a `domcontentloaded`
- Agregar timeout más corto

### Error: "Memory limit exceeded"
**Solución**: Página muy pesada
- Reducir viewport size
- Deshabilitar imágenes: `page.route('**/*.{png,jpg,jpeg}', route => route.abort())`

### Error: "Chromium executable not found"
**Solución**: Problema con @sparticuz/chromium
- Verificar que está en `package.json`
- Verificar `next.config.js` tiene la configuración correcta

## 📝 Notas Importantes

1. **Plan Vercel Pro requerido** para:
   - 60s timeout (gratuito solo 10s)
   - 3GB memoria (gratuito solo 1GB)

2. **Costo aproximado**:
   - ~0.5s de ejecución por screenshot
   - Vercel Pro: $20/mes incluye 1000 GB-hours
   - ~7,200,000 screenshots/mes incluidos

3. **Alternativas si falla**:
   - Railway.app (mejor para Playwright)
   - Render.com (soporta Docker)
   - Servicios externos (Screenshotone, Urlbox)

## 🎯 Uso en el Frontend

El código ya está configurado en `app/page.tsx`:

```javascript
// Automáticamente usa /api/screenshot-playwright
const response = await fetch('/api/screenshot-playwright', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: targetUrl })
});

const blob = await response.blob();
const imageUrl = URL.createObjectURL(blob);
```

## ✨ Próximos Pasos

1. **Probar localmente**: `npm run dev`
2. **Deploy a Vercel**: `vercel --prod`
3. **Probar en producción** con URLs de prueba
4. **Monitorear logs** en Vercel dashboard

Si encuentras problemas, revisa los logs en:
- Vercel Dashboard → Functions → Logs
- Buscar errores de Chromium o timeout
