#!/bin/bash

# 🚀 Script de Despliegue Automático para URL Content Protector
# Despliega el proyecto en Vercel de forma automática

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de URL Content Protector en Vercel..."

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

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de estar en el directorio del proyecto."
    exit 1
fi

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

# Instalar dependencias
print_status "Instalando dependencias..."
npm install
print_success "Dependencias instaladas"

# Ejecutar build para verificar que todo funciona
print_status "Ejecutando build de verificación..."
npm run build
print_success "Build completado exitosamente"

# Desplegar en Vercel
print_status "Desplegando en Vercel..."
vercel --prod --yes

print_success "🎉 ¡Despliegue completado exitosamente!"

echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a https://vercel.com/dashboard para ver tu proyecto"
echo "2. Configura las variables de entorno si es necesario"
echo "3. Prueba tu aplicación en la URL proporcionada"
echo ""
echo "📖 Para más información, consulta DEPLOY_VERCEL.md"
echo ""

# Mostrar información del proyecto
print_status "Información del proyecto:"
vercel inspect

print_success "¡Despliegue completado! 🚀"
