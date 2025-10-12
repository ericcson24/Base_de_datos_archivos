@echo off
title ☁️ Nube Personal - Servidor + Túnel Cloudflare
cd /d D:\NubeDistribuible_v2\Servidor

echo 🔧 Verificando dependencias...
python -c "import psutil" 2>nul
if errorlevel 1 (
    echo ❌ Instalando dependencia faltante...
    pip install psutil
)

echo 🔧 Iniciando servidores (Python + Node.js)...
start "" cmd /k "python iniciar_todo.py"

timeout /t 8 > nul

echo 🌍 Conectando túnel seguro con Cloudflare...
start "" cmd /k "cloudflared tunnel run tunelnube"

echo.
echo ✅ Tu nube está activa en: https://nube.proyectonube.xyz
echo 📅 Calendario disponible en: https://nube.proyectonube.xyz/calendario
echo 🧪 Desarrollo: http://localhost:3000/calendario
echo.
pause