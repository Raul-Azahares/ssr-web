#!/bin/bash

# 🔓 Script para hacer la aplicación pública en Vercel
# Deshabilita la autenticación de Vercel para acceso público

set -e  # Salir si hay algún error

echo "🔓 Deshabilitando autenticación en Vercel para acceso público..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con color
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar que Vercel CLI esté instalado
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI no está instalado. Instalando..."
    npm install -g vercel
    print_success "Vercel CLI instalado correctamente"
fi

# Verificar login en Vercel
print_status "Verificando autenticación en Vercel..."
if ! vercel whoami &> /dev/null; then
    print_warning "No estás logueado en Vercel. Iniciando proceso de login..."
    vercel login
fi

print_success "Autenticación verificada"

# Obtener información del proyecto
print_status "Obteniendo información del proyecto..."
PROJECT_INFO=$(vercel ls --json | jq -r '.[0] | select(.name | contains("proyecto6")) | .name + "|" + .url')

if [ -z "$PROJECT_INFO" ]; then
    print_error "No se encontró el proyecto proyecto6. Asegúrate de que esté desplegado."
    exit 1
fi

PROJECT_NAME=$(echo $PROJECT_INFO | cut -d'|' -f1)
PROJECT_URL=$(echo $PROJECT_INFO | cut -d'|' -f2)

print_success "Proyecto encontrado: $PROJECT_NAME"
print_success "URL: $PROJECT_URL"

echo ""
print_warning "IMPORTANTE: Para hacer tu aplicación pública, necesitas:"
echo ""
echo "1. Ve a https://vercel.com/dashboard"
echo "2. Selecciona tu proyecto '$PROJECT_NAME'"
echo "3. Ve a Settings → Deployment Protection"
echo "4. Desactiva 'Vercel Authentication'"
echo "5. Guarda los cambios"
echo ""
print_status "Alternativamente, puedes usar el comando:"
echo "vercel --prod --public"
echo ""

# Intentar hacer el despliegue público
print_status "Intentando hacer despliegue público..."
if vercel --prod --public; then
    print_success "🎉 ¡Despliegue público completado!"
    print_success "Tu aplicación ahora es accesible públicamente sin autenticación"
else
    print_warning "No se pudo hacer el despliegue público automáticamente."
    print_warning "Por favor, sigue los pasos manuales arriba."
fi

echo ""
print_success "📋 Próximos pasos:"
echo "1. Verifica que tu aplicación sea accesible públicamente"
echo "2. Prueba la URL: $PROJECT_URL"
echo "3. Si aún requiere autenticación, sigue los pasos manuales"
echo ""

print_success "¡Proceso completado! 🔓"
