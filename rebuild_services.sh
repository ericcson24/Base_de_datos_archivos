#!/bin/bash
# Script para reconstruir y reiniciar los servicios con los cambios

echo "🔄 Reconstruyendo servicios con cambios..."

# Detener contenedores
docker-compose down

# Reconstruir file-service y ai-service
docker-compose build --no-cache file-service ai-service

# Iniciar todos los servicios
docker-compose up -d

echo "✅ Servicios reiniciados con cambios aplicados"
echo ""
echo "📋 Para ver logs:"
echo "   docker logs -f codigo_servidor-file-service-1"
echo "   docker logs -f codigo_servidor-ai-service-1"
