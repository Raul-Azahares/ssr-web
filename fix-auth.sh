#!/bin/bash

# 🔓 Script para deshabilitar Deployment Protection en Vercel
# Abre automáticamente el dashboard de Vercel en la sección correcta

echo "🔓 Abriendo dashboard de Vercel para deshabilitar autenticación..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Obtener información del proyecto
PROJECT_NAME="proyecto6"
DASHBOARD_URL="https://vercel.com/dashboard"

print_status "Proyecto: $PROJECT_NAME"
print_status "Dashboard: $DASHBOARD_URL"

echo ""
print_warning "PASOS PARA DESHABILITAR AUTENTICACIÓN:"
echo ""
echo "1. 🌐 Se abrirá el dashboard de Vercel en tu navegador"
echo "2. 🔍 Busca el proyecto '$PROJECT_NAME'"
echo "3. ⚙️  Haz clic en 'Settings'"
echo "4. 🛡️  Ve a 'Deployment Protection'"
echo "5. ❌ Desactiva 'Vercel Authentication'"
echo "6. 💾 Guarda los cambios"
echo ""

# Intentar abrir el navegador
if command -v xdg-open &> /dev/null; then
    print_status "Abriendo dashboard de Vercel..."
    xdg-open "$DASHBOARD_URL"
elif command -v open &> /dev/null; then
    print_status "Abriendo dashboard de Vercel..."
    open "$DASHBOARD_URL"
else
    print_warning "No se pudo abrir el navegador automáticamente."
    print_warning "Por favor, abre manualmente: $DASHBOARD_URL"
fi

echo ""
print_success "📋 URLs de tu aplicación:"
echo "• Última URL: https://proyecto6-8oow4k1gg-araulmanuels-projects.vercel.app"
echo "• Dashboard: $DASHBOARD_URL"
echo ""

print_warning "⏰ Después de deshabilitar la autenticación:"
echo "• Espera 1-2 minutos"
echo "• Prueba la URL de tu aplicación"
echo "• Debería ser accesible sin login"
echo ""

print_success "¡Sigue los pasos arriba para completar el proceso! 🔓"
