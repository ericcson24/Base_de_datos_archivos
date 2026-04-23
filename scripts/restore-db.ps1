# Restaurar un backup SQL
# Uso: .\scripts\restore-db.ps1 .\backups\server_db_20260423_120000.sql
param([Parameter(Mandatory=$true)][string]$File)

if (-not (Test-Path $File)) { Write-Host "No existe $File" -ForegroundColor Red; exit 1 }

Write-Host "Se va a RESTAURAR $File sobre server_db." -ForegroundColor Yellow
Write-Host "Esto sobrescribe datos actuales." -ForegroundColor Yellow
$c = Read-Host "Escribe 'RESTORE' para continuar"
if ($c -ne 'RESTORE') { Write-Host "Cancelado." -ForegroundColor Gray; exit 0 }

Get-Content $File -Raw | docker compose exec -T postgres psql -U admin -d server_db
if ($LASTEXITCODE -eq 0) {
    Write-Host "Restaurado OK. Reinicia los servicios que dependan si ves raros comportamientos." -ForegroundColor Green
} else {
    Write-Host "Fallo la restauracion" -ForegroundColor Red; exit 1
}
