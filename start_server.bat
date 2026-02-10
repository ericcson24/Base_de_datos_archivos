@echo off
echo ==========================================
echo    Iniciando Servidor (Microservicios)
echo ==========================================

echo.
echo [1/3] Verificando instalacion de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no encontrado.
    echo.
    echo Para ejecutar este proyecto necesitas Docker Desktop instalado y corriendo.
    echo 1. Descarga e instala: https://www.docker.com/products/docker-desktop/
    echo 2. Abre Docker Desktop.
    echo 3. Vuelve a ejecutar este script.
    echo.
    pause
    exit /b
)
echo [OK] Docker detectado.

echo.
echo [2/3] Iniciando contenedores...
docker compose up -d
if %errorlevel% neq 0 (
    echo [INFO] 'docker compose' fallo, intentando 'docker-compose' - version antigua...
    docker-compose up -d
)

if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron iniciar los contenedores.
    echo Asegurate de que Docker Desktop este ejecutandose.
    pause
    exit /b
)

echo.
echo [3/3] Estado del sistema
echo ------------------------------------------
echo Aplicacion: http://localhost
echo.
echo Si es la primera vez, la base de datos se esta importando en segundo plano.
echo Espera unos segundos antes de iniciar sesion.
echo.
pause
