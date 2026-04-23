# Backup completo de la BD postgres a ./backups/ con timestamp
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root 'backups'
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$out   = Join-Path $backupDir "server_db_$stamp.sql"

Write-Host "Dumping DB a $out ..." -ForegroundColor Cyan
docker compose exec -T postgres pg_dump -U admin -d server_db --no-owner --clean --if-exists | Out-File -FilePath $out -Encoding utf8
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $out) -or (Get-Item $out).Length -lt 1000) {
    Write-Host "ERROR: pg_dump fallo o dump vacio" -ForegroundColor Red
    if (Test-Path $out) { Remove-Item $out -Force }
    exit 1
}

# Limpiar backups mas antiguos que 14 dias
Get-ChildItem $backupDir -Filter 'server_db_*.sql' |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-14) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

$size = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Host ("OK - " + $size + " KB") -ForegroundColor Green
