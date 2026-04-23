# =============================================================================
# REDEPLOY SEGURO — nunca borra el volumen postgres_data
# =============================================================================
# Uso:
#   .\scripts\redeploy.ps1                    # rebuild de todos los servicios
#   .\scripts\redeploy.ps1 roadmap-service    # rebuild de uno o varios
#   .\scripts\redeploy.ps1 -NoBackup          # saltar backup (no recomendado)
# =============================================================================
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Services,
    [switch]$NoBackup
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "================================================" -ForegroundColor Cyan
Write-Host " REDEPLOY SEGURO — el volumen NO se tocará"       -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1) Backup automatico de la BD (salvo que pidan saltarlo)
if (-not $NoBackup) {
    Write-Host "`n[1/3] Backup de postgres..." -ForegroundColor Yellow
    & "$PSScriptRoot\backup-db.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Backup fallido — abortando para proteger datos." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[1/3] Backup OMITIDO (-NoBackup)" -ForegroundColor DarkYellow
}

# 2) Build + recrear contenedores (SIN -v, nunca borra volumenes)
Write-Host "`n[2/3] docker compose up -d --build $Services" -ForegroundColor Yellow
if ($Services -and $Services.Count -gt 0) {
    docker compose up -d --build @Services
} else {
    docker compose up -d --build
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "docker compose up fallo" -ForegroundColor Red
    exit 1
}

# 3) Reiniciar gateway para refrescar DNS (evita 502 tras recrear backends)
$backendServices = @('auth-service','user-service','file-service','admin-service',
                     'notification-service','outlook-service','rdp-service',
                     'roadmap-service','windows-service','ai-service','email-service')
$rebuiltBackend = $false
if (-not $Services -or $Services.Count -eq 0) {
    $rebuiltBackend = $true
} else {
    foreach ($s in $Services) { if ($backendServices -contains $s) { $rebuiltBackend = $true; break } }
}
if ($rebuiltBackend) {
    Write-Host "`n[3/4] Reiniciando gateway (refresco DNS)..." -ForegroundColor Yellow
    docker compose restart gateway | Out-Null
    Write-Host "   gateway reiniciado." -ForegroundColor Green
} else {
    Write-Host "`n[3/4] Gateway no requiere reinicio." -ForegroundColor Gray
}

# 4) Verificar que postgres sigue ahi y tiene tablas roadmap
Write-Host "`n[4/4] Verificando integridad de roadmap..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
$check = docker compose exec -T postgres psql -U admin -d server_db -tAc "SELECT COUNT(*) FROM roadmap_projects;" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   roadmap_projects: $($check.Trim()) filas" -ForegroundColor Green
} else {
    Write-Host "   No se pudo verificar postgres (quiza aun arrancando)" -ForegroundColor DarkYellow
}

Write-Host "`nRedeploy completado sin tocar el volumen." -ForegroundColor Green
Write-Host "Para restaurar un backup: .\scripts\restore-db.ps1 <archivo.sql>" -ForegroundColor Gray
