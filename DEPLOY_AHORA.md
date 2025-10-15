# 🚀 Pasos para Desplegar a Vercel

## Cambios realizados:
1. ✅ Actualizado `puppeteer-core` a versión 19.11.1 (compatible con Vercel)
2. ✅ Actualizado `@sparticuz/chromium` a versión 119.0.2 (compatible)
3. ✅ Agregado `.puppeteerrc.cjs` para configurar Puppeteer correctamente
4. ✅ Modificado `/app/api/screenshot/route.js` para detectar Vercel correctamente

## Comandos para desplegar:

```bash
# 1. Eliminar node_modules y reinstalar con versiones compatibles
rm -rf node_modules package-lock.json
npm install

# 2. Hacer commit de los cambios
git add .
git commit -m "Fix: Usar versiones compatibles de puppeteer-core y @sparticuz/chromium para Vercel"

# 3. Push a tu repositorio (Vercel desplegará automáticamente)
git push origin main
# O si tu rama es master:
# git push origin master
```

## Verificar el deployment:

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto `ssr-web`
3. Espera a que termine el deployment (1-2 minutos)
4. Ve a la pestaña "Functions" para ver los logs
5. Prueba la app en: https://ssr-web-lyart.vercel.app

## Si aún hay errores:

Revisa los logs con:
```bash
./ver-logs-vercel.sh
```

O manualmente en: https://vercel.com/dashboard → ssr-web → Deployments → último deployment → Functions
