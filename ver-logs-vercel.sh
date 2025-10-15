#!/bin/bash

echo "🔍 Verificando logs de Vercel para ssr-web..."
echo ""
echo "=== OPCIÓN 1: Dashboard Web (Más fácil) ==="
echo "1. Abre: https://vercel.com/dashboard"
echo "2. Selecciona tu proyecto 'ssr-web'"
echo "3. Click en 'Deployments' → último deployment"
echo "4. Ve a la pestaña 'Functions' para ver logs de API"
echo ""
echo "=== OPCIÓN 2: CLI de Vercel ==="
echo ""

# Verificar si vercel CLI está instalado
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI no está instalado"
    echo "Instalar con: npm install -g vercel"
    echo ""
    exit 1
fi

echo "Obteniendo logs de producción..."
echo ""
vercel logs https://ssr-web-lyart.vercel.app --follow

# Si quieres ver logs sin seguir en tiempo real, usa:
# vercel logs https://ssr-web-lyart.vercel.app
