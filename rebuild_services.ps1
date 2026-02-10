# Script PowerShell para reconstruir y reiniciar los servicios

Write-Host "Reconstruyendo servicios con cambios..." -ForegroundColor Cyan

# Detener contenedores
Write-Host "Deteniendo contenedores..." -ForegroundColor Yellow
docker-compose down

# Reconstruir todos los servicios
Write-Host "Reconstruyendo todos los servicios..." -ForegroundColor Yellow
docker-compose build --no-cache

# Iniciar todos los servicios
Write-Host "Iniciando servicios..." -ForegroundColor Yellow
docker-compose up -d

Write-Host "Servicios reiniciados con cambios aplicados" -ForegroundColor Green
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Cyan
Write-Host "   docker logs -f codigo_servidor-file-service-1" -ForegroundColor Gray
Write-Host "   docker logs -f codigo_servidor-ai-service-1" -ForegroundColor Gray
