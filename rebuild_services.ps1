# Script PowerShell para reconstruir y reiniciar los servicios

Write-Host "🔄 Reconstruyendo servicios con cambios..." -ForegroundColor Cyan

# Detener contenedores
Write-Host "`n📦 Deteniendo contenedores..." -ForegroundColor Yellow
docker-compose down

# Reconstruir file-service y ai-service
Write-Host "`n🔨 Reconstruyendo file-service y ai-service..." -ForegroundColor Yellow
docker-compose build --no-cache file-service ai-service

# Iniciar todos los servicios
Write-Host "`n🚀 Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "`n✅ Servicios reiniciados con cambios aplicados" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Para ver logs:" -ForegroundColor Cyan
Write-Host "   docker logs -f codigo_servidor-file-service-1" -ForegroundColor Gray
Write-Host "   docker logs -f codigo_servidor-ai-service-1" -ForegroundColor Gray
