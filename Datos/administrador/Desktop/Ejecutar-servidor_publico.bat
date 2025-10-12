@echo off
title ☁️ Nube Personal - Servidor + Túnel Cloudflare
cd /d C:\NubeDistribuible_v2\Servidor

echo 🔧 Iniciando servidor Python local...
start "" cmd /k "python servidor_nube.py"

timeout /t 3 > nul

echo 🌍 Conectando túnel seguro con Cloudflare...
start "" cmd /k "cloudflared tunnel run tunelnube"

echo ✅ Tu nube está activa en: https://nube.proyectonube.xyz
pause
